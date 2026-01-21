import JWT from 'jsonwebtoken'
import userModel from '../model/userModel.js';
import dotenv from 'dotenv';

dotenv.config();

//Require Sign
export const requireSignIn = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "No token provided",
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = JWT.verify(token, process.env.JWT_SECRET);

        const user = await userModel.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        // invalidates old tokens immediately
        if ((user.tokenVersion || 0) !== decoded.tokenVersion) {
            return res.status(401).json({
                success: false,
                message: "Session expired, please log in again",
            });
        }

        // If user is blocked, deny access and force logout
        if (user.status === "Blocked") {
            return res.status(401).json({
                success: false,
                message: "Account is blocked",
            });
        }

        // Attach user to req for next middleware
        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};

//check if client
export const isClient = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user._id)
        if (user.userType !== "Client") {
            return res.status(401).send({
                success: false,
                message: "Account not found"
            })
        } else {
            next();
        }
    } catch (error) {
        console.log(error);
        res.status(401).send({
            success: false,
            message: "Login Error",
            error
        });
    }
};

//check if admin
export const isAdmin = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user._id);
        if (user.role !== "Admin") {
            return res.status(401).send({
                success: false,
                message: "Unauthorized Access"
            })
        } else {
            next();
        }
    } catch (error) {
        console.log(error);
        res.status(401).send({
            success: false,
            message: "Error in Admin",
            error
        })
    }
}

//check if moderator
export const isModerator = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user._id);
        if (user.role !== "Moderator" && user.role !== "Admin") {
            return res.status(401).send({
                success: false,
                message: "Unauthorized Access"
            });
        } else {
            next();
        }
    } catch (error) {
        console.log(error);
        res.status(401).send({
            success: false,
            message: "Error in Moderator Access",
            error
        });
    }
};

// Check if user is active or blocked
export const isActive = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user._id);

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    // If user is blocked → stop here
    if (user.status !== "Active") {
      return res.status(401).send({
        success: false,
        message: "Your account is blocked. Please contact support.",
      });
    }

    // Otherwise allow next middleware
    next();

  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error in Status Check",
      error: error.message,
    });
  }
};