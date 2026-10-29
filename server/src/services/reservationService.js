import { Book, Copy, Loan, Reservation } from "../models/index.js";
import { AppError } from "../utils/AppError.js";

// Decide where a copy that has just come free should go:
// to the first waiting reservation (held), or back on the shelf (available).
export async function offerCopyToQueue(copy) {
    const reservation = await Reservation.findOneAndUpdate(
        { book: copy.book, status: "waiting" },
        { $set: { status: "offered", heldCopy: copy._id, offeredAt: new Date() } },
        { sort: { createdAt: 1, _id: 1 }, returnDocument: "after" }
    );

    if (reservation) {
        await Copy.updateOne(
            { _id: copy._id },
            { $set: { status: "held", heldFor: reservation.member } }
        );
        return reservation;
    }

    await Copy.updateOne({ _id: copy._id }, { $set: { status: "available", heldFor: null } });
    return null;
}

// While there are available copies AND people waiting, hand copies to the queue.
export async function fillQueueFromAvailableCopies(bookId) {
    for (; ;) {
        // Take one available copy out of circulation (atomic), so nobody can grab it meanwhile.
        const copy = await Copy.findOneAndUpdate(
            { book: bookId, status: "available" },
            { $set: { status: "issued" } },
            { returnDocument: "after" }
        );
        if (!copy) return;

        const reservation = await offerCopyToQueue(copy);
        if (!reservation) return; // queue was empty; copy is back on the shelf
    }
}

// 1-based place in line. 0 means "a copy is ready for you".
export async function queuePosition(reservation) {
    if (reservation.status !== "waiting") return 0;
    const bookId = reservation.book._id ?? reservation.book;
    const ahead = await Reservation.countDocuments({
        book: bookId,
        status: "waiting",
        $or: [
            { createdAt: { $lt: reservation.createdAt } },
            { createdAt: reservation.createdAt, _id: { $lt: reservation._id } },
        ],
    });
    return ahead + 1;
}

export async function reserveBook({ bookId, memberId }) {
    const book = await Book.findById(bookId);
    if (!book) throw new AppError(404, "Book not found");

    const hasLoan = await Loan.exists({ book: book._id, member: memberId, returnedAt: null });
    if (hasLoan) throw new AppError(409, "You already have a copy of this book on loan");

    const available = await Copy.countDocuments({ book: book._id, status: "available" });
    if (available > 0) {
        throw new AppError(
            409,
            "Copies of this book are available right now. Ask a librarian to issue one."
        );
    }

    let reservation;
    try {
        reservation = await Reservation.create({ book: book._id, member: memberId });
    } catch (err) {
        if (err.code === 11000) throw new AppError(409, "You have already reserved this book");
        throw err;
    }

    // Closes Gap A: if a copy came free while we were creating the reservation, offer it now.
    await fillQueueFromAvailableCopies(book._id);

    return reservation;
}

export async function cancelReservation({ reservationId, user }) {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) throw new AppError(404, "Reservation not found");

    const isOwner = String(reservation.member) === String(user._id);
    if (!isOwner && user.role !== "librarian") {
        throw new AppError(403, "You can only cancel your own reservations");
    }

    // Case 1: still waiting in line. Just leave the queue.
    const waiting = await Reservation.findOneAndUpdate(
        { _id: reservation._id, status: "waiting" },
        { $set: { status: "cancelled" } },
        { returnDocument: "after" }
    );
    if (waiting) return waiting;

    // Case 2: a copy is being held for them. Release it to the next person.
    const offered = await Reservation.findOneAndUpdate(
        { _id: reservation._id, status: "offered" },
        { $set: { status: "cancelled" } },
        { returnDocument: "before" }
    );
    if (offered) {
        const copy = await Copy.findOneAndUpdate(
            { _id: offered.heldCopy, status: "held", heldFor: offered.member },
            { $set: { status: "issued", heldFor: null } },
            { returnDocument: "after" }
        );
        if (copy) await offerCopyToQueue(copy);
        return Reservation.findById(reservation._id);
    }

    throw new AppError(409, "This reservation can no longer be cancelled");
}