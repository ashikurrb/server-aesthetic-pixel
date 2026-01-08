import { comparePassword, hashPassword } from '../helpers/authHelpers.js';
import { deleteFromS3 } from '../config/deleteFromS3.js';
import userModel from '../model/userModel.js';
import ClientProfile from '../model/clientModel.js';
import EmployeeProfile from '../model/employeeModel.js';
import JWT from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

//declare dotenv
dotenv.config();

//Login Controller
export const loginController = async (req, res) => {
    try {
        const { email, phone, password } = req.fields;

        // Validation
        if ((!email && !phone) || !password) {
            return res.status(400).send({
                success: false,
                message: "Invalid credential",
            });
        }

        // Find user
        const user = await userModel.findOne({
            $or: [{ email }, { phone }],
        });

        if (!user) {
            return res.status(404).send({
                success: false,
                message: "Invalid credentials",
            });
        }

        // Check status
        if (user.status === "BLOCKED") {
            return res.status(403).send({
                success: false,
                message: "Temporarily blocked. Contact admin.",
            });
        }

        // Compare password
        const match = await comparePassword(password, user.password);
        if (!match) {
            return res.status(400).send({
                success: false,
                message: "Invalid credentials",
            });
        }

        const token = JWT.sign(
            {
                userId: user._id,
                tokenVersion: user.tokenVersion || 0,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // Store token in HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000,
        });

        return res.status(200).send({
            success: true,
            message: "Login successful",
            token,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Login error",
            error,
        });
    }
};

//Get Logged in user data
export const loggedInUserController = async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch user 
        const user = await userModel.findById(userId).select("-password");
        if (!user) {
            return res.status(404).send({
                success: false,
                message: "User not found",
            });
        }

        // Auto logout if user is blocked
        if (user.status === "BLOCKED") {
            return res.status(401).send({
                success: false,
                message: "Your account is blocked",
            });
        }

        // Fetch profiles
        const employeeProfile = await EmployeeProfile.findOne({ userId }).populate("createdBy", "name").populate("updatedBy", "name");
        const clientProfile = await ClientProfile.findOne({ userId }).populate("createdBy", "name").populate("updatedBy", "name");

        return res.status(200).send({
            success: true,
            message: "Data fetched successfully",
            user,
            profiles: {
                employee: employeeProfile || null,
                client: clientProfile || null,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Error fetching user data",
            error: error.message,
        });
    }
};

//Get all users
export const getAllUsersController = async (req, res) => {
    const allUsers = await userModel.find({})
        .select("-password")
        .sort({ createdAt: -1 })
        .populate("createdBy", "name")
        .populate("updatedBy", "name");
    res.status(200).send({
        success: true,
        message: "All Users Fetched",
        users: allUsers,
    });
};

//delete user
export const deleteUserController = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await userModel.findById(id);
        if (user.role === "Admin") {
            return res.status(403).send({
                success: false,
                message: "Authorization Error: Admin cannot be deleted",
            });
        };

        // Delete avatar from S3 if exists
        if (user.avatar) {
            // cloudfront
            const fileKey = user.avatar.replace(
                `https://${process.env.CLOUDFRONT_DOMAIN}/`,
                ""
            );

            await deleteFromS3(fileKey);
        };

        //find user and delete from db
        await userModel.findByIdAndDelete(id);
        res.status(200).send({
            success: true,
            message: "User and their data deleted successfully",
        })

    } catch (error) {
        res.status(500).send({
            success: false,
            message: "Deleting user failed",
            error
        })
    }
};

//update password by user
export const updatePasswordByUserController = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmNewPassword } = req.fields;

        const userId = req.user._id;
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (user.status === "Blocked") {
            return res.status(403).json({
                success: false,
                message: "Temporarily Blocked. Contact Admin",
            });
        }

        // Match new & confirm password
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: "New password and confirm password do not match",
            });
        }

        // Validate new password length
        if (newPassword && newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be 6 characters or more",
            });
        }

        // Verify old password
        if (!oldPassword) {
            return res.status(400).json({
                success: false,
                message: "Old password is required",
            });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect old password",
            });
        }

        user.password = await hashPassword(newPassword);
        user.tokenVersion += 1;
        user.updatedBy = userId;
        await user.save();

        const updatedUser = await userModel
            .findById(userId)
            .select("-password");

        return res.status(200).json({
            success: true,
            message: "Password Updated Successfully",
            user: updatedUser,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Password Updating Error",
            error: error.message,
        });
    }
};

// Update avatar by user
export const updateAvatarbyUserController = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await userModel.findById(userId);

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No avatar uploaded",
            });
        }

        let fileKey =
            req.file.key ||
            req.file.filename ||
            (req.file.location && req.file.location.split(".com/")[1]);

        if (!fileKey) {
            return res.status(500).json({
                success: false,
                message: "File key not found for avatar upload",
            });
        }

        const newAvatarUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${fileKey}`;

        if (user.avatar) {
            const oldKey = user.avatar.replace(
                `https://${process.env.CLOUDFRONT_DOMAIN}/`,
                ""
            );
            await deleteFromS3(oldKey);
        }

        user.avatar = newAvatarUrl;
        user.updatedBy = userId;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Avatar updated successfully",
            avatar: newAvatarUrl,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Avatar Updating Error",
            error: error.message,
        });
    }
};

export const updateUserByAdminController = async (req, res) => {
    try {
        const { name, email, phone, role, status } = req.fields;
        const { id } = req.params;

        // Check if email/phone already used by another user
        const existingUser = await userModel.findOne({
            $and: [
                { _id: { $ne: id } },
                {
                    $or: [
                        { email: email },
                        { phone: phone }
                    ]
                }
            ]
        });

        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(409).send({
                    success: false,
                    message: "Email already exists"
                });
            }
            if (existingUser.phone === phone) {
                return res.status(409).send({
                    success: false,
                    message: "Phone number already exists"
                });
            }
        }

        // Set updatedBy from logged-in user
        const updatedBy = req.user?._id;
        const updatedData = { name, email, phone, role, status, updatedBy };

        const updatedUser = await userModel
            .findByIdAndUpdate(id, updatedData, { new: true })
            .select("-password")
            .populate("createdBy", "name")
            .populate("updatedBy", "name");

        return res.status(200).json({
            success: true,
            message: "Profile Updated Successfully",
            updatedUser,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "User Updating Error",
            error: error.message,
        });
    }
};

//create Client controller
export const createClientController = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).send({
                success: false,
                message: "Name, email, and password are required",
            });
        }

        if (phone && phone.length !== 11) {
            return res.status(400).send({
                success: false,
                message: "Phone number must be 11 digits",
            });
        }

        if (password.length < 6) {
            return res.status(400).send({
                success: false,
                message: "Password must be at least 6 characters",
            });
        }

        // Check if User exists
        let user = await userModel.findOne({ $or: [{ email }, { phone }] });

        if (user) {
            // Check if user already has client profile
            const existingClientProfile = await ClientProfile.findOne({ userId: user._id });
            if (existingClientProfile) {
                return res.status(409).send({
                    success: false,
                    message: "Email or phone number already exists",
                });
            }
        } else {
            // Create User
            const hashedPassword = await hashPassword(password);
            user = await new userModel({
                email,
                phone,
                password: hashedPassword,
                status: "ACTIVE",
                avatar: req.file ? `https://${process.env.CLOUDFRONT_DOMAIN}/${req.file.key}` : null,
            }).save();
        }

        // Create ClientProfile
        const clientProfile = await new ClientProfile({
            userId: user._id,
            name,
            billingAddress,
            shippingAddress,
            createdBy: req.user?._id || user._id,
        }).save();

        res.status(201).send({
            success: true,
            message: "Client registered successfully",
            user,
            clientProfile,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Client registration error",
            error: error.message,
        });
    }
};
