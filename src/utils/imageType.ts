import { fileTypeFromBuffer } from "file-type";

const IMAGE_MIME = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/** Image type detected from the bytes themselves, or null when it is not one of `allowed`. */
export const detectImageType = async (data: ArrayBuffer | Uint8Array, allowed: readonly string[] = IMAGE_MIME) => {
  const type = await fileTypeFromBuffer(data instanceof Uint8Array ? data : new Uint8Array(data));
  return type && allowed.includes(type.mime) ? type : null;
};
