import "server-only";

export function buildDataUrl(
  mimeType?: string | null,
  data?: Uint8Array | Buffer | null,
) {
  if (!mimeType || !data) {
    return null;
  }

  return `data:${mimeType};base64,${Buffer.from(data).toString("base64")}`;
}
