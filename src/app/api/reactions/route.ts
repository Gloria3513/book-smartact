import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const VALID_TARGETS = ['book', 'library'] as const;
const VALID_EMOJIS = ['cheer', 'cool', 'fun'] as const;
type TargetType = typeof VALID_TARGETS[number];
type EmojiKey = typeof VALID_EMOJIS[number];

const SECRET = process.env.REACTION_SECRET || 'smartact-book-reaction-salt';

async function getVoterHash(): Promise<string> {
  const h = await headers();
  const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? '').trim() || h.get('x-real-ip') || 'unknown';
  const ua = h.get('user-agent') || 'unknown';
  return createHash('sha256').update(`${ip}|${ua}|${SECRET}`).digest('hex');
}

function admin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validate(targetType: unknown, targetId: unknown, emoji?: unknown): { ok: false; status: number; error: string } | { ok: true; targetType: TargetType; targetId: string; emoji?: EmojiKey } {
  if (!VALID_TARGETS.includes(targetType as TargetType)) {
    return { ok: false, status: 400, error: 'invalid target_type' };
  }
  if (typeof targetId !== 'string' || !UUID_RE.test(targetId)) {
    return { ok: false, status: 400, error: 'invalid target_id' };
  }
  if (emoji !== undefined && !VALID_EMOJIS.includes(emoji as EmojiKey)) {
    return { ok: false, status: 400, error: 'invalid emoji' };
  }
  return { ok: true, targetType: targetType as TargetType, targetId, emoji: emoji as EmojiKey | undefined };
}

// GET ?targetType=...&targetId=...
//   { myEmojis: ['cheer', ...], counts: { cheer: 12, ... } }
//   counts는 도서관일 때만 채움 (책 카운트는 비공개라 클라이언트에 안 보냄)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const v = validate(searchParams.get('targetType'), searchParams.get('targetId'));
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status });

  const voterHash = await getVoterHash();
  const supabase = admin();

  const { data: mine } = await supabase
    .from('reactions')
    .select('emoji_key')
    .eq('target_type', v.targetType)
    .eq('target_id', v.targetId)
    .eq('voter_hash', voterHash);

  const counts: Record<string, number> = {};
  if (v.targetType === 'library') {
    const { data: all } = await supabase
      .from('reactions')
      .select('emoji_key')
      .eq('target_type', 'library')
      .eq('target_id', v.targetId);
    for (const r of all ?? []) counts[r.emoji_key] = (counts[r.emoji_key] ?? 0) + 1;
  }

  return NextResponse.json({
    myEmojis: (mine ?? []).map(m => m.emoji_key as string),
    counts,
  });
}

// POST { targetType, targetId, emoji } — 토글 (이미 있으면 제거, 없으면 추가)
export async function POST(req: Request) {
  let body: { targetType?: unknown; targetId?: unknown; emoji?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const v = validate(body.targetType, body.targetId, body.emoji);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status });
  if (!v.emoji) return NextResponse.json({ error: 'emoji required' }, { status: 400 });

  const voterHash = await getVoterHash();
  const supabase = admin();

  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('target_type', v.targetType)
    .eq('target_id', v.targetId)
    .eq('emoji_key', v.emoji)
    .eq('voter_hash', voterHash)
    .maybeSingle();

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id);
    return NextResponse.json({ status: 'removed' });
  }
  const { error } = await supabase.from('reactions').insert({
    target_type: v.targetType,
    target_id: v.targetId,
    emoji_key: v.emoji,
    voter_hash: voterHash,
  });
  if (error) {
    // UNIQUE 충돌(레이스)도 일단 ok 처리
    if (error.code === '23505') return NextResponse.json({ status: 'added' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ status: 'added' });
}
