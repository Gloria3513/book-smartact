'use client';

import { useEffect, useState } from 'react';

const EMOJIS = [
  { key: 'cheer', emoji: '👏', label: '응원해요' },
  { key: 'cool',  emoji: '🎨', label: '멋져요' },
  { key: 'fun',   emoji: '📖', label: '재밌어요' },
] as const;

interface Props {
  targetType: 'book' | 'library';
  targetId: string;
  // true면 각 이모지 옆 카운트 표시 (도서관에서 사용)
  showCounts?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export default function EmojiReactions({ targetType, targetId, showCounts = false, className = '', size = 'md' }: Props) {
  const [myEmojis, setMyEmojis] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/reactions?targetType=${targetType}&targetId=${targetId}`);
        const data = await res.json();
        if (cancelled) return;
        setMyEmojis(Array.isArray(data.myEmojis) ? data.myEmojis : []);
        setCounts(typeof data.counts === 'object' && data.counts ? data.counts : {});
      } catch {
        // 무시
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [targetType, targetId]);

  const toggle = async (key: string) => {
    if (busy) return;
    setBusy(key);
    const wasActive = myEmojis.includes(key);
    // optimistic
    setMyEmojis(prev => wasActive ? prev.filter(k => k !== key) : [...prev, key]);
    if (showCounts) {
      setCounts(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) + (wasActive ? -1 : 1)) }));
    }
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, emoji: key }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      // 롤백
      setMyEmojis(prev => wasActive ? [...prev, key] : prev.filter(k => k !== key));
      if (showCounts) {
        setCounts(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) + (wasActive ? 1 : -1)) }));
      }
    } finally {
      setBusy(null);
    }
  };

  const padClass = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const emojiSize = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {EMOJIS.map(({ key, emoji, label }) => {
        const active = myEmojis.includes(key);
        const count = counts[key] ?? 0;
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            disabled={!loaded || busy === key}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full border transition ${padClass} ${
              active
                ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-sm'
                : 'bg-white/80 border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
            } ${busy === key ? 'opacity-60' : ''} ${!loaded ? 'opacity-50' : ''}`}
          >
            <span className={emojiSize}>{emoji}</span>
            <span className="font-medium">{label}</span>
            {showCounts && count > 0 && (
              <span className="ml-0.5 text-[11px] font-semibold opacity-80">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
