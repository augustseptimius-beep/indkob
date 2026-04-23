/**
 * Returns an optimized version of a Supabase Storage public URL using the
 * built-in image transformation endpoint (server-side resize). Non-Supabase
 * URLs (or null) are passed through unchanged.
 */
export function optimizedImage(url: string | null | undefined, width: number, quality = 80): string | null | undefined {
  if (!url) return url;
  if (!url.includes('/storage/v1/object/public/')) return url;
  const transformed = url.replace('/object/public/', '/render/image/public/');
  const sep = transformed.includes('?') ? '&' : '?';
  return `${transformed}${sep}width=${width}&quality=${quality}`;
}

export function optimizedSrcSet(url: string | null | undefined, widths: number[]): string | undefined {
  if (!url || !url.includes('/storage/v1/object/public/')) return undefined;
  return widths.map((w) => `${optimizedImage(url, w)} ${w}w`).join(', ');
}