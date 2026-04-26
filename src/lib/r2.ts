import { S3Client, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Vercel 환경변수 입력 시 줄바꿈/공백이 끝에 끼면 AWS SDK가
// Authorization 헤더에 그 invisible 문자를 넣다가
// "Invalid character in header content" 에러를 던진다. 모두 trim.
function envTrim(name: string): string | undefined {
  const v = process.env[name];
  return v ? v.trim() : undefined;
}

export function getR2Client() {
  const accountId = envTrim('R2_ACCOUNT_ID');
  const accessKeyId = envTrim('R2_ACCESS_KEY_ID');
  const secretAccessKey = envTrim('R2_SECRET_ACCESS_KEY');

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function r2PublicUrl(bookId: string, filename: string) {
  const base = envTrim('R2_PUBLIC_URL') || 'https://flipbooks.smartact.kr';
  return `${base}/${bookId}/${filename}`;
}

export async function uploadToR2(
  bookId: string,
  filename: string,
  body: Buffer,
  contentType: string
) {
  const client = getR2Client();
  await client.send(new PutObjectCommand({
    Bucket: envTrim('R2_BUCKET_NAME') || 'flipbooks',
    Key: `${bookId}/${filename}`,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

export async function deleteBookFromR2(bookId: string) {
  const client = getR2Client();
  const bucket = envTrim('R2_BUCKET_NAME') || 'flipbooks';

  const list = await client.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: `${bookId}/`,
  }));

  if (!list.Contents?.length) return;

  await client.send(new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: { Objects: list.Contents.map(o => ({ Key: o.Key! })) },
  }));
}

export function isR2Configured(): boolean {
  return !!(
    envTrim('R2_ACCOUNT_ID') &&
    envTrim('R2_ACCESS_KEY_ID') &&
    envTrim('R2_SECRET_ACCESS_KEY')
  );
}
