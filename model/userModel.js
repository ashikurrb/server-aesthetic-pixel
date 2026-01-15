import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Active", "Blocked"],
      default: "Active",
    },
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientProfile",
    },
    userType: {
      type: String,
      trim: true,
      required: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);