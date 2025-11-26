import dotenv from "dotenv"
import express from "express"
import connectDB from "./config/db.js";
import morgan from "morgan";
import cors from "cors";
import authRoutes from "./routes/authRoute.js";

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


//rest api
app.get("/", (req, res) => {
    res.send("<h1>Aesthetic Pixel Sever is Running</h1>");
});

//PORT
const PORT = process.env.PORT || 5000;

//Terminal Log
app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);
});