import { comparePassword, hashPassword } from '../helpers/authHelpers.js';
import { deleteFromS3 } from '../config/deleteFromS3.js';
import userModel from '../model/userModel.js';
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

        // Check if client
        if (user.userType !== "Client") {
            return res.status(403).send({
                success: false,
                message: "Account not found",
            });
        }

        // Check status
        if (user.status === "Blocked") {
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

//Employee Login Controller
export const employeeLoginController = async (req, res) => {
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

        // Check if client
        if (user.userType !== "Employee") {
            return res.status(403).send({
                success: false,
                message: "Account not found",
            });
        }

        // Check status
        if (user.status === "Blocked") {
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
export const loggedInUserDataController = async (req, res) => {
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
        if (user.status === "Blocked") {
            return res.status(401).send({
                success: false,
                message: "Your account is blocked",
            });
        }

        return res.status(200).send({
            success: true,
            message: "Data fetched successfully",
            user
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

//Get all employees
export const getAllClientsController = async (req, res) => {
    try {
        const users = await userModel
            .find({ userType: "Client" })
            .select("-password")
            .populate("createdBy", "name")
            .populate("updatedBy", "name")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "All Clients Fetched",
            users,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch clients",
            error: error.message,
        });
    }
};

//Get all employees
export const getAllEmployeesController = async (req, res) => {
    try {
        const users = await userModel
            .find({ userType: "Employee" })
            .select("-password")
            .populate("createdBy", "name")
            .populate("updatedBy", "name")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "All Employees Fetched",
            users,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch employees",
            error: error.message,
        });
    }
};

//delete user
export const deleteUserController = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await userModel.findById(id);
        if (user.userType === "Employee" && user.role === "Admin") {
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
        const { name, email, phone, role,employeeId, status } = req.fields;
        const { id } = req.params;

        // Check if email/phone, employeeID already used by another user
        const existingUser = await userModel.findOne({
            $and: [
                { _id: { $ne: id } },
                {
                    $or: [
                        { email: email },
                        { phone: phone },
                        { employeeId: employeeId }
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
            if (existingUser.employeeId === employeeId) {
                return res.status(409).send({
                    success: false,
                    message: "Employee ID already exists"
                });
            }
        }

        // Set updatedBy from logged-in user
        const updatedBy = req.user?._id;
        const updatedData = { name, email, phone, role, employeeId, status, updatedBy };

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
            const existingClientProfile = await userModel.findOne({ _id: user._id });
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
                name,
                email,
                phone,
                password: hashedPassword,
                userType: "Client",
                avatar: req.file ? `https://${process.env.CLOUDFRONT_DOMAIN}/${req.file.key}` : null,
            }).save();
        };

        res.status(201).send({
            success: true,
            message: "Registration successfull",
            user,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Registration Error",
            error: error.message,
        });
    }
};

//create Employee controller
export const createEmployeeController = async (req, res) => {
    try {
        const { name, email, phone, role, employeeId, password } = req.body;

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

        if (employeeId) {
            const existingEmployeeId = await userModel.findOne({ employeeId });
            if (existingEmployeeId) {
                return res.status(409).send({
                    success: false,
                    message: "Employee ID already exists",
                });
            }
        }

        // Check if User exists
        let user = await userModel.findOne({ $or: [{ email }, { phone }] });

        if (user) {
            // Check if user already has client profile
            const existingEmployeeProfile = await userModel.findOne({ _id: user._id });
            if (existingEmployeeProfile) {
                return res.status(409).send({
                    success: false,
                    message: "Email or phone number already exists",
                });
            }
        } else {
            // Create User
            const hashedPassword = await hashPassword(password);
            user = await new userModel({
                name,
                email,
                phone,
                role,
                employeeId,
                password: hashedPassword,
                userType: "Employee",
                avatar: req.file ? `https://${process.env.CLOUDFRONT_DOMAIN}/${req.file.key}` : null,
            }).save();
        };

        res.status(201).send({
            success: true,
            message: "User created successfully",
            user,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "User creation Error",
            error: error.message,
        });
    }
};

//update client status
export const updateClientStatusController = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const user = await userModel.findById(id);

        if (!user || user.userType !== "Client") {
            return res.status(404).json({
                success: false,
                message: "Client not found",
            });
        }

        user.status = status;
        user.updatedBy = req.user?._id;
        await user.save();
        const populatedUser = await user.populate("updatedBy", "name");
        res.status(200).json({
            success: true,
            message: `${status}`,
            user: populatedUser,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Client status updating error",
            error: error.message,
        });
    }
};
