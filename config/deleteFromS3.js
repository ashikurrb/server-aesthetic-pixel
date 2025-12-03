import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../config/s3.js";

export const deleteFromS3 = async (fileKey) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
    });

    await s3.send(command);
    console.log("Deleted from S3:", fileKey);
  } catch (err) {
    console.error("S3 Delete Error:", err.message);
  }
};