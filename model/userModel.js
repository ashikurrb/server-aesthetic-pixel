import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:
    {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        enum: ['admin', 'moderator']
    },
    avatar: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        default: 'active',
        enum: ['active', 'blocked']
    },
}, { timestamps: true });

export default mongoose.model('users', userSchema);