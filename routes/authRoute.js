import express from 'express';
import formidable from 'express-formidable';
import avatarUpload from '../config/multerS3Config.js';
import { createUserController, deleteUserController, getAllUsersController, loginController, updatePasswordByUserController, updateAvatarbyUserController } from '../controllers/authController.js';
import { requireSignIn } from '../middlewares/authMiddleware.js';

//declare router
const router = express.Router();

//Create User Route
router.post("/create-user", requireSignIn, avatarUpload.single("avatar"), createUserController);

//Login Route
router.post("/login", formidable(), loginController);

//Get All Users
router.get("/all-users", requireSignIn, getAllUsersController);

//update password by user
router.put("/update-password/:id", requireSignIn, formidable(), updatePasswordByUserController);

//update avatar by user
router.put("/update-avatar/:id", requireSignIn, avatarUpload.single("avatar"), updateAvatarbyUserController);

//delete single user
router.delete("/delete-user/:id", requireSignIn, deleteUserController);

export default router;