import { comparePassword, hashPassword } from '../helpers/authHelpers.js';
import { deleteFromS3 } from '../config/deleteFromS3.js';
import userModel from '../model/userModel.js';
import JWT from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

//declare dotenv
dotenv.config();

//Create Controller
export const createUserController = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        // Validation
        if (!name) return res.status(400).send({
            success: false, message: "Name is required"
        });
        if (!email) return res.status(400).send({
            success: false, message: "Email is required"
        });
        if (!phone) return res.status(400).send({
            success: false, message: "Phone number is required"
        });
        if (!password) return res.status(400).send({
            success: false, message: "Password is required"
        });
        if (!role) return res.status(400).send({
            success: false, message: "Role is required"
        });

        // Phone and password length checks
        if (phone.length !== 11) return res.status(400).send({
            success: false, message: "Mobile number must be 11 digits"
        });
        if (password.length < 6) return res.status(400).send({
            success: false, message: "Password must be 6 characters or more"
        });

        // Check if user already exists
        const existingUser = await userModel.findOne({
            $or: [
                { email: email },
                { phone: phone }
            ]
        });

        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(409).send({
                    success: false, message: "Email already exists"
                });
            }
            if (existingUser.phone === phone) {
                return res.status(409).send({
                    success: false,
                    message: "Phone number already exists"
                });
            }
        }

        // Encrypt password
        const hashedPassword = await hashPassword(password);

        // Get avatar from S3 + CloudFront
        let avatarUrl = null;

        if (req.file) {
            const fileKey = req.file.key;

            // CloudFront URL
            avatarUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${fileKey}`;
        }


        // Set createdBy from logged-in user
        const createdBy = req.user?._id;

        // Create user
        const user = await new userModel({ name, email, phone, role, password: hashedPassword, avatar: avatarUrl, createdBy }).save();

        res.status(201).send({
            success: true,
            message: "User created successfully!",
            user,
        });

    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "User creation error",
            error: error.message,
        });
    }
};

//Login Controller
export const loginController = async (req, res) => {
    try {
        const { email, phone, password } = req.fields;

        // Validation
        if ((!email && !phone) || !password) {
            return res.status(400).send({
                success: false,
                message: "Invalid Credential",
            });
        }

        // Find user
        let user = await userModel.findOne({
            $or: [{ email }, { phone }],
        })
            .populate("createdBy" ,"-password")
            .populate("updatedBy", "-password");

        if (!user) {
            return res.status(404).send({
                success: false,
                message: "Invalid Credentials",
            });
        }

        // Status Check
        if (user.status === "Blocked") {
            return res.status(403).send({
                success: false,
                message: "Temporarily Blocked. Contact Admin",
            });
        }

        // Compare password
        const match = await comparePassword(password, user.password);
        if (!match) {
            return res.status(400).send({
                success: false,
                message: "Invalid Credentials",
            });
        }

        // Generate JWT
        const token = JWT.sign(
            { _id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // Remove password before sending
        const userData = user.toObject();
        delete userData.password;

        return res.status(200).send({
            success: true,
            message: "Login Successful",
            user: userData,
            token,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Login Error",
            error,
        });
    }
};


//Get all users
export const getAllUsersController = async (req, res) => {
    const allUsers = await userModel.find({}).select("-password").sort({ createdAt: -1 }).populate("createdBy", "name").populate("updatedBy", "name");
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

        if (user.status === "Blocked") {
            return res.status(403).json({
                success: false,
                message: "Temporarily Blocked. Contact Admin",
            });
        };

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({
                success: false,
                error: "New password and confirm password do not match",
            });
        };

        const updatedData = {};

        if (newPassword && newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Password must be 6 characters or more",
            });
        }

        if (newPassword || oldPassword) {
            if (!oldPassword) {
                return res.status(400).json({
                    success: false,
                    error: "Old password is required to set a new password",
                });
            }

            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    error: "Incorrect old password",
                });
            }

            if (newPassword) {
                updatedData.password = await hashPassword(newPassword);
            }
        }
        updatedData.updatedBy = userId;
        const updatedUser = await userModel
            .findByIdAndUpdate(userId, updatedData, { new: true })
            .select("-password");

        return res.status(200).json({
            success: true,
            message: "Password Updated Successfully",
            updatedUser,
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
     console.log("🔥 Avatar Update Error Backend:", error);

    return res.status(500).json({
        success: false,
        message: "Avatar Updating Error",
        error: error.message,
        stack: error.stack,   // ADD THIS
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