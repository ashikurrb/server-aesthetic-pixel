import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        orderItems: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                },
                name: {
                    type: String,
                    required: true,
                },
                unitPrice: {
                    type: Number,
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                },
                photos: {
                    type: Number,
                    required: true,
                },
                totalProductPrice: {
                    type: Number,
                    required: true,
                },
            },
        ],

        subTotal: {
            type: Number,
            required: true,
        },

        discountedAmount: {
            type: Number,
            required: true,
        },

        finalPrice: {
            type: Number,
            required: true,
        },

        status: {
            type: String,
            enum: ["Pending", "Accepted", "Cancelled"],
            default: "Pending",
        },

        paymentDetails: [
            {
                method: {
                    type: String,
                    required: true,
                },
                trxId: {
                    type: String,
                },
                accNo: {
                    type: String,
                },
                amount: {
                    type: Number,
                    required: true,
                }
            },
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

export default mongoose.model("Order", orderSchema);