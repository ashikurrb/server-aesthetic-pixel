import express from 'express';
import formidable from 'express-formidable';
import avatarUpload from '../config/multerS3Config.js';
import { deleteUserController, getAllUsersController, loginController, updatePasswordByUserController, updateAvatarbyUserController, updateUserByAdminController, loggedInUserController, createClientController } from '../controllers/authController.js';
import { requireSignIn, isAdmin, isModerator, isActive } from '../middlewares/authMiddleware.js';

//declare router
const router = express.Router();

// //Create User Route
// router.post("/create-user", requireSignIn, isAdmin, avatarUpload.single("avatar"), createUserController);


//Create Client Route
router.post("/register", avatarUpload.single("avatar"), createClientController);

//Login Route
router.post("/login", formidable(), loginController);

//get logged in user
router.get("/me", requireSignIn, isActive, loggedInUserController);

//Get All Users
router.get("/all-users", requireSignIn, isActive, getAllUsersController);

//update password by user
router.put("/update-password", requireSignIn, isActive, formidable(), updatePasswordByUserController);

//update avatar by user
router.put("/update-avatar", requireSignIn, isActive, avatarUpload.single("avatar"), updateAvatarbyUserController);

//update user by admin
router.put("/update-user/:id", requireSignIn, isAdmin, formidable(), updateUserByAdminController);

//delete single user
router.delete("/delete-user/:id", requireSignIn, isAdmin, deleteUserController);

export default router;