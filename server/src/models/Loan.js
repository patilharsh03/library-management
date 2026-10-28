import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
    {
        copy: { type: mongoose.Schema.Types.ObjectId, ref: "Copy", required: true },
        book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
        member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        issuedAt: { type: Date, required: true },
        dueAt: { type: Date, required: true },
        returnedAt: { type: Date, default: null },
        fineAmount: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

export const Loan = mongoose.model("Loan", loanSchema);