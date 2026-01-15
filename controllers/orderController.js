import orderModel from "../model/orderModel.js";
import clientModel from "../model/clientModel.js";
import puppeteer from "puppeteer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename)

export const createOrderController = async (req, res) => {
  try {
    const {
      orderItems,
      subTotal,
      discountedAmount,
      finalPrice,
      paymentDetails,
    } = req.body;

    // validation
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).send({
        success: false,
        message: "No order items provided",
      });
    }

    if (
      subTotal === undefined ||
      finalPrice === undefined ||
      discountedAmount === undefined
    ) {
      return res.status(400).send({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (!Array.isArray(paymentDetails) || paymentDetails.length === 0) {
      return res.status(400).send({
        success: false,
        message: "Please provide at least one payment detail",
      });
    }

    const createdBy = req.user._id;

    const order = new orderModel({
      orderItems,
      subTotal,
      discountedAmount,
      finalPrice,
      paymentDetails,
      createdBy,
    });

    await order.save();

    res.status(201).send({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error placing order",
      error: error.message,
    });
  }
};


//get orders details by user
export const getOrdersByUserController = async (req, res) => {
  try {
    const orders = await orderModel.find({ createdBy: req.user._id }).populate('orderItems.productId').sort({ createdAt: -1 });
    res.status(200).send({
      success: true,
      message: "User orders fetched successfully",
      orders,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error getting orders",
      error: error.message,
    });
  }
};

export const getOrderInvoiceController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderModel
      .findById(orderId)
      .populate("createdBy", "email phone userType");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (["Cancelled", "Pending"].includes(order.status)) {
      return res.status(404).json({
        success: false,
        message: "No invoice available",
      });
    }

    // createdBy is USER
    const userId = order.createdBy._id;

    // fetch client profile using userId
    const clientProfile = await clientModel
      .findOne({ userId })
      .select("name");

    const html = await ejs.renderFile(
      join(process.cwd(), "templates", "invoice.ejs"),
      {
        order,
        buyer: clientProfile?.name || "N/A",
      }
    );

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A5",
      printBackground: true,
      margin: {
        top: "15mm",
        bottom: "15mm",
        left: "10mm",
        right: "10mm",
      },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${order._id}.pdf`
    );

    return res.send(pdfBuffer);

  } catch (error) {
    console.error("Invoice generation failed:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating invoice",
      error: error.message,
    });
  }
};

//dashboard data
export const dashboardDataController = async (req, res) => {
  try {
    const totalOrders = await orderModel.countDocuments();
    const pendingOrders = await orderModel.countDocuments({ status: "Pending" });
    const acceptedOrders = await orderModel.countDocuments({ status: "Accepted" });
    const cancelledOrders = await orderModel.countDocuments({ status: "Cancelled" });

    res.status(200).send({
      success: true,
      message: "Dashboard data fetched successfully",
      data: {
        totalOrders,
        pendingOrders,
        acceptedOrders,
        cancelledOrders,
      },
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error fetching dashboard data",
      error: error.message,
    });
  }
};