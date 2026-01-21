import express from 'express';
import formidable from 'express-formidable';
import avatarUpload from '../config/multerS3Config.js';
import { deleteUserController, loginController, updatePasswordByUserController, updateAvatarbyUserController, updateUserByAdminController, loggedInUserDataController, createClientController, employeeLoginController, getAllEmployeesController, getAllClientsController, createEmployeeController } from '../controllers/authController.js';
import { requireSignIn, isAdmin, isModerator, isClient, isActive } from '../middlewares/authMiddleware.js';

//declare router
const router = express.Router();

//Create User Route
router.post("/create-user", requireSignIn, isAdmin, avatarUpload.single("avatar"), createEmployeeController);


//Create Client Route
router.post("/register", avatarUpload.single("avatar"), createClientController);

//Login Route
router.post("/login", formidable(), loginController);

//Employee Login Route
router.post("/employee-login", formidable(), employeeLoginController);

//get logged in user
router.get("/me", requireSignIn, isActive, loggedInUserDataController);

//Get All Employee
router.get("/all-employees", requireSignIn, isActive,isModerator, getAllEmployeesController);

//get all clients
router.get("/all-clients", requireSignIn, isActive,  getAllClientsController);

//update password by user
router.put("/update-password", requireSignIn, isActive, formidable(), updatePasswordByUserController);

//update avatar by user
router.put("/update-avatar", requireSignIn, isActive, avatarUpload.single("avatar"), updateAvatarbyUserController);

//update user by admin
router.put("/update-user/:id", requireSignIn, isAdmin, formidable(), updateUserByAdminController);

//delete single user
router.delete("/delete-user/:id", requireSignIn, isAdmin, deleteUserController);

export default router;