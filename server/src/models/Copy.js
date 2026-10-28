import mongoose from "mongoose";

const copySchema = new mongoose.Schema(
    {
        book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true, index: true },
        barcode: { type: String, required: true, unique: true, trim: true },
        status: {
            type: String,
            enum: ["available", "issued", "held"],
            default: "available",
        },
        heldFor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

export const Copy = mongoose.model("Copy", copySchema);