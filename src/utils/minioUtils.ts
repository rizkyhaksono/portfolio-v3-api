import MinioClient from "@/libs/minioClient";
import { fileTypeFromBuffer } from "file-type";

const isMetaDataImg = async (values: ArrayBuffer) => {
  const buffer = new Uint8Array(values);

  const type = await fileTypeFromBuffer(buffer);
  if (!type?.mime?.startsWith("image/")) {
    return false;
  }
  return true;
}

const getMinioPublicLink = async (fileName: string) => {
  return await MinioClient.presignedUrl(
    "GET",
    Bun.env.MINIO_BUCKET_NAME!,
    fileName
  );
};

const getMinioProject = async (fileName: string) => {
  return await MinioClient.getObject(Bun.env.MINIO_BUCKET_NAME!, fileName);
};

export {
  isMetaDataImg,
  getMinioPublicLink,
  getMinioProject
}