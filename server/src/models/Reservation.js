import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
    {
        book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
        member: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: {
            type: String,
            enum: ["waiting", "offered", "fulfilled", "cancelled"],
            default: "waiting",
        },
        heldCopy: { type: mongoose.Schema.Types.ObjectId, ref: "Copy", default: null },
        offeredAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// Queue lookups: "oldest waiting reservation for this book"
reservationSchema.index({ book: 1, status: 1, createdAt: 1 });

// A member can have only one active reservation per book
reservationSchema.index(
    { book: 1, member: 1 },
    { unique: true, partialFilterExpression: { status: { $in: ["waiting", "offered"] } } }
);

export const Reservation = mongoose.model("Reservation", reservationSchema); 