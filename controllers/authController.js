import { comparePassword, hashPassword } from '../helpers/authHelpers.js';
import { deleteFromS3 } from '../config/deleteFromS3.js';
import userModel from '../model/userModel.js';
import JWT from 'jsonwebtoken';
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
        // Create user
        const user = await new userModel({ name, email, phone, role, password: hashedPassword, avatar: avatarUrl }).save();

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
        const user = await userModel.findOne({
            $or: [{ email }, { phone }],
        });

        if (!user) {
            return res.status(404).send({
                success: false,
                message: "User Not Found",
            });
        }

        // Check status
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
                message: "Invalid Password",
            });
        }

        // Generate token
        const token = await JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });

        // Send response (exclude password)
        const userData = user.toObject();
        delete userData.password;

        res.status(200).send({
            success: true,
            message: "Login Successful",
            user: userData,
            token,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Login Error",
            error,
        });
    }
};


//Get all users
export const getAllUsersController = async (req, res) => {
    const allUsers = await userModel.find({}).select("-password").sort({ createdAt: -1 });
    res.status(200).send({
        success: true,
        message: "All Users Fetched",
        users: allUsers,
    });
};

//delete user by id
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