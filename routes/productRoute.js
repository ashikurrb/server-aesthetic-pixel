import express from 'express';
import formidable from 'express-formidable';
import { createProductController, deleteProductController, getAllProductsController, updateProductController } from '../controllers/productController.js';
import { requireSignIn, isAdmin, isModerator, isActive } from '../middlewares/authMiddleware.js';
//declare router
const router = express.Router();

//create product
router.post("/create-product", formidable(), requireSignIn, isActive, isAdmin, createProductController);

//update product
router.put("/update-product/:id", formidable(), requireSignIn, isActive, isAdmin, updateProductController);

//get all products
router.get("/get-products", getAllProductsController);

//delete product
router.delete("/delete-product/:id", requireSignIn, isActive, isAdmin, deleteProductController);

export default router;