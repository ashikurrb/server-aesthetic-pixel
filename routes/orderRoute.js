import express from 'express';
import formidable from 'express-formidable';
import { requireSignIn } from '../middlewares/authMiddleware.js';
import { createOrderController, dashboardDataController, getOrderInvoiceController, getOrdersByUserController } from '../controllers/orderController.js';

//declare router
const router = express.Router();

//create order
router.post('/create-order', requireSignIn, createOrderController);

//get order details by user
router.get('/get-user-order', requireSignIn, getOrdersByUserController);

//get order invoice
router.get('/generate-invoice/:orderId', requireSignIn, getOrderInvoiceController);

//order data dashboard
router.get('/dashboard-data', requireSignIn, dashboardDataController);

export default router;