import { comparePassword, hashPassword } from '../helpers/authHelpers.js';
import userModel from '../model/userModel.js';
import JWT from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

//declare dotenv
dotenv.config();

//Create Controller
export const createUserController = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.fields;

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

        // Create user
        const user = await new userModel({ name, email, phone, role, password: hashedPassword }).save();

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

        //validation
        if (!email && !phone || !password) {
            return res.status(400).send({
                success: false,
                message: "Invalid Credential"
            });
        };

        //find user
        const user = await userModel.findOne({
            $or: [
                { email: email },
                { phone: phone }
            ]
        });

        //Login validation
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User Not Found',
            })
        };

        //user status validation
        if (user.status === "Blocked") {
            return res.status(404).json({
                success: false,
                error: "Temporarily Blocked. Contact Admin",
            })
        };

        //compare encrypted password
        const match = await comparePassword(password, user.password);
        if (!match) {
            return res.status(200).send({
                success: false,
                message: "Invalid Password"
            });
        };

        //token
        const token = await JWT.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

        //Send Response
        res.status(200).send({
            success: true,
            message: "Login Successful",
            user: {
                avatar: user.avatar,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
            }, token,
        })

    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Login Error",
            error
        })
    }
};