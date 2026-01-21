import dotenv from "dotenv"
import express from "express"
import connectDB from "./config/db.js";
import morgan from "morgan";
import cors from "cors";
import authRoutes from "./routes/authRoute.js";
import categoryRoutes from "./routes/categoryRoute.js";
import subCategoryRoutes from "./routes/subCategoryRoute.js";
import blogRoutes from "./routes/blogRoute.js";
import productRoutes from "./routes/productRoute.js";
import orderRoutes from "./routes/orderRoute.js";
import pricingRulesRoutes from "./routes/pricingRulesRoutes.js";

//dotenv config
dotenv.config();

//database config
connectDB();;

//object
const app = express();

//middlewares-cors
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/sub-category", subCategoryRoutes);
app.use("/api/v1/blog", blogRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/pricing", pricingRulesRoutes);


//rest api
app.get("/", (req, res) => {
    res.send("<h1>Aesthetic Pixel Server is Running</h1>");
});

//PORT
const PORT = process.env.PORT || 5000;

//Terminal Log
app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);
});