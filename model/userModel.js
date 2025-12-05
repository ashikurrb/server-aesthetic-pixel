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
        enum: ['Admin', 'Moderator']
    },
    avatar: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        default: 'Active',
        enum: ['Active', 'Blocked']
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    }
}, { timestamps: true });

export default mongoose.model('users', userSchema);