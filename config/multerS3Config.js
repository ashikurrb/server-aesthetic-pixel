import multer from "multer";
import multerS3 from "multer-s3";
import s3 from "./s3.js";
import dotenv from "dotenv";

//config env
dotenv.config();

const avatarUpload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,

    key: (req, file, cb) => {
      const uniqueName = Date.now() + "-" + file.originalname;
      cb(null, "uploads/" + uniqueName); 
    },
  }),

  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed!"), false);
  },
});

export default avatarUpload;