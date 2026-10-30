import { Router } from "express";
import { z } from "zod";
import { Loan, User } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { issueCopy, returnCopy } from "../services/loanService.js";
import { calculateFine, calculateLateDays } from "../utils/fines.js";

const router = Router();

const issueSchema = z.object({
    memberEmail: z.string().trim().toLowerCase().email("Enter a valid member email"),
    barcode: z.string().trim().min(1, "Barcode is required").max(40),
});

const returnSchema = z.object({
    barcode: z.string().trim().min(1, "Barcode is required").max(40),
});

// Librarian issues a copy to a member
router.post(
    "/issue",
    requireAuth,
    requireRole("librarian"),
    validate(issueSchema),
    async (req, res) => {
        const member = await User.findOne({ email: req.body.memberEmail });
        if (!member) throw new AppError(404, "No member found with that email");

        const loan = await issueCopy({
            barcode: req.body.barcode,
            memberId: member._id,
            librarianId: req.user._id,
        });

        const populated = await Loan.findById(loan._id)
            .populate("book", "title author")
            .populate("member", "name email")
            .populate("copy", "barcode");

        res.status(201).json({ loan: populated });
    }
);

// A member's own loans, with fines so far on overdue ones
router.get("/mine", requireAuth, async (req, res) => {
    const loans = await Loan.find({ member: req.user._id })
        .sort({ issuedAt: -1 })
        .populate("book", "title author")
        .populate("copy", "barcode")
        .lean();

    const now = new Date();
    res.json({
        loans: loans.map((l) => ({
            ...l,
            isOverdue: !l.returnedAt && calculateLateDays(l.dueAt, now) > 0,
            currentFine: l.returnedAt ? l.fineAmount : calculateFine(l.dueAt, now),
        })),
    });
});

router.post(
    "/return", requireAuth, requireRole("librarian"), validate(returnSchema),
    async (req, res) => {
        const { loan, lateDays, fineAmount, reservation } = await returnCopy({
            barcode: req.body.barcode,
        });

        const populated = await Loan.findById(loan._id)
            .populate("book", "title author")
            .populate("member", "name email")
            .populate("copy", "barcode")

        let heldFor = null;
        if (reservation) {
            const m = await User.findById(reservation.member).select("name email");
            heldFor = { name: m.name, email: m.email };
        }

        res.json({ loan: populated, lateDays, fineAmount, heldFor });
    }
)

// Librarian: all overdue, unreturned loans, most overdue first
router.get("/overdue", requireAuth, requireRole("librarian"), async (_req, res) => {
    const now = new Date();

    const loans = await Loan.find({ returnedAt: null, dueAt: { $lt: now } })
        .sort({ dueAt: 1 })
        .populate("member", "name email")
        .populate("book", "title author")
        .populate("copy", "barcode")
        .lean();

    const overdue = loans
        .map((l) => ({
            loanId: l._id,
            member: l.member,
            book: l.book,
            barcode: l.copy.barcode,
            issuedAt: l.issuedAt,
            dueAt: l.dueAt,
            lateDays: calculateLateDays(l.dueAt, now),
            fine: calculateFine(l.dueAt, now),
        }))
        .filter((l) => l.lateDays > 0);

    const totalFine = overdue.reduce((sum, l) => sum + l.fine, 0);
    res.json({ overdue, count: overdue.length, totalFine });
});

export default router;