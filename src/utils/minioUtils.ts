import MinioClient from "@/libs/minioClient";
import { fileTypeFromBuffer } from "file-type";

const IMAGE_MIME = ["image/png", "image/jpeg", "image/gif", "image/webp"];

// MinIO's ceiling for presigned URLs; it also treats 0 as this maximum.
export const PRESIGN_MAX_SECONDS = 7 * 24 * 60 * 60;

/** Image type detected from the bytes themselves, or null when it is not one of `allowed`. */
const detectImageType = async (data: ArrayBuffer | Uint8Array, allowed: readonly string[] = IMAGE_MIME) => {
  const type = await fileTypeFromBuffer(data instanceof Uint8Array ? data : new Uint8Array(data));
  return type && allowed.includes(type.mime) ? type : null;
};

const getMinioPublicLink = async (fileName: string, expirySeconds = 60 * 60) => {
  const expiry = Math.min(Math.max(Math.floor(expirySeconds), 1), PRESIGN_MAX_SECONDS);
  return await MinioClient.presignedUrl("GET", Bun.env.MINIO_BUCKET_NAME!, fileName, expiry);
};

const getMiniObject = async (fileName: string) => {
  return await MinioClient.getObject(Bun.env.MINIO_BUCKET_NAME!, fileName);
};

export {
  detectImageType,
  getMinioPublicLink,
  getMiniObject
}
