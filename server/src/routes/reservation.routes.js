import { Router } from "express";
import { z } from "zod";
import { Reservation } from "../models/index.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
    reserveBook,
    cancelReservation,
    queuePosition,
} from "../services/reservationService.js";

const router = Router();

const reserveSchema = z.object({
    bookId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid book id"),
});

async function present(reservationId) {
    const raw = await Reservation.findById(reservationId).lean();
    const position = await queuePosition(raw);
    const full = await Reservation.findById(reservationId)
        .populate("book", "title author")
        .populate("heldCopy", "barcode")
        .lean();
    return { ...full, position };
}

// Member joins the queue for a book
router.post(
    "/",
    requireAuth,
    requireRole("member"),
    validate(reserveSchema),
    async (req, res) => {
        const reservation = await reserveBook({ bookId: req.body.bookId, memberId: req.user._id });
        res.status(201).json({ reservation: await present(reservation._id) });
    }
);

// Member's active reservations with queue position
router.get("/mine", requireAuth, async (req, res) => {
    const reservations = await Reservation.find({
        member: req.user._id,
        status: { $in: ["waiting", "offered"] },
    })
        .sort({ createdAt: 1 })
        .populate("book", "title author")
        .populate("heldCopy", "barcode")
        .lean();

    const withPosition = await Promise.all(
        reservations.map(async (r) => ({ ...r, position: await queuePosition(r) }))
    );
    res.json({ reservations: withPosition });
});

// Cancel (owner or librarian)
router.delete("/:id", requireAuth, async (req, res) => {
    const reservation = await cancelReservation({
        reservationId: req.params.id,
        user: req.user,
    });
    res.json({ reservation: await present(reservation._id) });
});

export default router;