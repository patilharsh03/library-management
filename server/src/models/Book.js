import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        author: { type: String, required: true, trim: true },
        isbn: { type: String, required: true, unique: true, trim: true },
        category: { type: String, required: true, trim: true },
    },
    { timestamps: true }
);

bookSchema.index({ title: "text", author: "text" });

export const Book = mongoose.model("Book", bookSchema);