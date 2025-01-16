import { v2 as cloudinary } from "cloudinary";

export interface CloudinaryResponse {
  public_id: string;
  secure_url: string;
}

cloudinary.config({
  cloud_name: "mynatee",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function FileToString(file: any) {
  try {
    let res = await file.raw.text();
    console.log(res);
  } catch (err) {
    throw err;
  }
}

export { cloudinary };