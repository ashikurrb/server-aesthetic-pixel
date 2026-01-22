import express from 'express';
import formidable from 'express-formidable';
import { isActive, isAdmin, requireSignIn } from '../middlewares/authMiddleware.js';
import { createOrderController, dashboardDataController, getAllOrderController, getOrderInvoiceController, getOrdersByUserController, updateOrderStatusController, userDashboardDataController } from '../controllers/orderController.js';

//declare router
const router = express.Router();

//create order
router.post('/create-order', requireSignIn, isActive, createOrderController);

//get order details by user
router.get('/get-user-order', requireSignIn, isActive, getOrdersByUserController);

//get all orders for admin
router.get('/all-orders', requireSignIn, isActive, getAllOrderController);

//update order status by admin
router.put('/update-order-status/:orderId', requireSignIn, isActive, isAdmin, updateOrderStatusController);

//get order invoice
router.get('/generate-invoice/:orderId', requireSignIn, isActive, getOrderInvoiceController);

//order data dashboard
router.get('/dashboard-data', requireSignIn, isActive, dashboardDataController);

//user dashboard data
router.get('/user-dashboard-data', requireSignIn, isActive, userDashboardDataController);

export default router;