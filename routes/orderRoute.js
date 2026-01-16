import express from 'express';
import formidable from 'express-formidable';
import { requireSignIn } from '../middlewares/authMiddleware.js';
import { createOrderController, dashboardDataController, getAllOrderController, getOrderInvoiceController, getOrdersByUserController, updateOrderStatusController, userDashboardDataController } from '../controllers/orderController.js';

//declare router
const router = express.Router();

//create order
router.post('/create-order', requireSignIn, createOrderController);

//get order details by user
router.get('/get-user-order', requireSignIn, getOrdersByUserController);

//get all orders for admin
router.get('/all-orders', requireSignIn, getAllOrderController);

//update order status by admin
router.put('/update-order-status/:orderId', requireSignIn, updateOrderStatusController);

//get order invoice
router.get('/generate-invoice/:orderId', requireSignIn, getOrderInvoiceController);

//order data dashboard
router.get('/dashboard-data', requireSignIn, dashboardDataController);

//user dashboard data
router.get('/user-dashboard-data', requireSignIn, userDashboardDataController);

export default router;