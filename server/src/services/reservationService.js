import { Copy, Reservation } from "../models/index.js";

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