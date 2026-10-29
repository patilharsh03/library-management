import { Copy, Loan, Reservation, User } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import { calculateDueDate, calculateFine, calculateLateDays } from "../utils/fines.js";
import { offerCopyToQueue } from "./reservationService.js";
import { MAX_ACTIVE_LOANS } from "../config.js";

export async function issueCopy({ barcode, memberId, librarianId }) {
    const member = await User.findById(memberId);
    if (!member || member.role !== "member") throw new AppError(404, "Member not found");

    const activeLoans = await Loan.countDocuments({ member: member._id, returnedAt: null });
    if (activeLoans >= MAX_ACTIVE_LOANS) {
        throw new AppError(
            409,
            `${member.name} already has ${MAX_ACTIVE_LOANS} books out. Return one before borrowing another.`
        );
    }

    const copy = await Copy.findOne({ barcode });
    if (!copy) throw new AppError(404, "No copy found with that barcode");

    // Atomic claim: only succeeds if the copy is free, or held for THIS member.
    const claimed = await Copy.findOneAndUpdate(
        {
            _id: copy._id,
            $or: [{ status: "available" }, { status: "held", heldFor: member._id }],
        },
        { $set: { status: "issued", heldFor: null } },
        { returnDocument: "before" }
    );

    if (!claimed) {
        const current = await Copy.findById(copy._id);
        if (current.status === "held") {
            throw new AppError(409, "This copy is being held for another member's reservation");
        }
        throw new AppError(409, "This copy is already issued");
    }

    const issuedAt = new Date();
    let loan;
    try {
        loan = await Loan.create({
            copy: copy._id,
            book: copy.book,
            member: member._id,
            issuedBy: librarianId,
            issuedAt,
            dueAt: calculateDueDate(issuedAt),
        });
    } catch (err) {
        // Undo the claim so the copy isn't stuck as "issued" with no loan.
        await Copy.updateOne(
            { _id: copy._id },
            { $set: { status: claimed.status, heldFor: claimed.heldFor } }
        );
        throw err;
    }

    if (claimed.status === "held") {
        await Reservation.updateOne(
            { book: copy.book, member: member._id, status: "offered", heldCopy: copy._id },
            { $set: { status: "fulfilled" } }
        );
    }

    return loan;
}

export async function returnCopy({ barcode }) {
    const copy = await Copy.findOne({ barcode });
    if (!copy) throw new AppError(404, "No copy found with that barcode");

    const openLoan = await Loan.findOne({ copy: copy._id, returnedAt: null });
    if (!openLoan) throw new AppError(409, "This copy is not currently issued");

    const returnedAt = new Date();
    const lateDays = calculateLateDays(openLoan.dueAt, returnedAt);
    const fineAmount = calculateFine(openLoan.dueAt, returnedAt);

    // Close the loan only if it is still open (protects against double returns).
    const loan = await Loan.findOneAndUpdate(
        { _id: openLoan._id, returnedAt: null },
        { $set: { returnedAt, fineAmount } },
        { returnDocument: "after" }
    );
    if (!loan) throw new AppError(409, "This copy has just been returned");

    const reservation = await offerCopyToQueue(copy);

    return { loan, lateDays, fineAmount, reservation };
}