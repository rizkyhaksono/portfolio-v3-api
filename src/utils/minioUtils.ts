import MinioClient from "@/libs/minioClient";

// MinIO's ceiling for presigned URLs; it also treats 0 as this maximum.
export const PRESIGN_MAX_SECONDS = 7 * 24 * 60 * 60;

const getMinioPublicLink = async (fileName: string, expirySeconds = 60 * 60) => {
  const expiry = Math.min(Math.max(Math.floor(expirySeconds), 1), PRESIGN_MAX_SECONDS);
  return await MinioClient.presignedUrl("GET", Bun.env.MINIO_BUCKET_NAME!, fileName, expiry);
};

const getMiniObject = async (fileName: string) => {
  return await MinioClient.getObject(Bun.env.MINIO_BUCKET_NAME!, fileName);
};

/** `attachment` Content-Disposition that cannot inject headers, plus an RFC 5987 UTF-8 filename*. */
const attachmentDisposition = (objectKey: string) => {
  const name = objectKey.replace(/[\x00-\x1f\x7f"'\\\/]/g, "").slice(0, 120) || "download";
  const ascii = name.replace(/[^\x20-\x7e]/g, "_");
  const utf8 = encodeURIComponent(name).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
};

export {
  attachmentDisposition,
  getMinioPublicLink,
  getMiniObject
}
