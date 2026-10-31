import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectTestDb, clearTestDb, disconnectTestDb } from "./helpers/db.js";
import { makeUser, makeLibrarian, makeBook } from "./helpers/factories.js";
import { Copy, Loan, Reservation } from "../src/models/index.js";
import { issueCopy, returnCopy } from "../src/services/loanService.js";
import {
    reserveBook,
    cancelReservation,
    queuePosition,
    fillQueueFromAvailableCopies,
} from "../src/services/reservationService.js";
import { LOAN_DAYS, FINE_PER_DAY } from "../src/config.js";

const DAY = 24 * 60 * 60 * 1000;

let lib;

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(async () => {
    await clearTestDb();
    lib = await makeLibrarian();
});

const issue = (barcode, member) =>
    issueCopy({ barcode, memberId: member._id, librarianId: lib._id });

// A book with one copy that is currently on loan to a borrower.
async function oneCopyOut() {
    const { book, copies } = await makeBook(1);
    const borrower = await makeUser();
    await issue(copies[0].barcode, borrower);
    return { book, copy: copies[0], borrower };
}

describe("issuing copies", () => {
    it("issues an available copy with a due date 14 days away", async () => {
        const { copies } = await makeBook(1);
        const member = await makeUser();

        const loan = await issue(copies[0].barcode, member);

        expect(loan.dueAt.getTime() - loan.issuedAt.getTime()).toBe(LOAN_DAYS * DAY);
        expect((await Copy.findById(copies[0]._id)).status).toBe("issued");
    });

    it("refuses a copy that is already issued", async () => {
        const { copies } = await makeBook(1);
        const [a, b] = [await makeUser(), await makeUser()];
        await issue(copies[0].barcode, a);

        await expect(issue(copies[0].barcode, b)).rejects.toThrow("already issued");
    });

    it("lets only one of two simultaneous issues succeed", async () => {
        const { copies } = await makeBook(1);
        const [a, b] = [await makeUser(), await makeUser()];

        const results = await Promise.allSettled([
            issue(copies[0].barcode, a),
            issue(copies[0].barcode, b),
        ]);

        expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
        expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
        expect(await Loan.countDocuments({ copy: copies[0]._id })).toBe(1);
    });

    it("refuses a fourth book for a member who has three out", async () => {
        const member = await makeUser();
        for (let i = 0; i < 3; i++) {
            const { copies } = await makeBook(1);
            await issue(copies[0].barcode, member);
        }
        const { copies } = await makeBook(1);

        await expect(issue(copies[0].barcode, member)).rejects.toThrow("3 books");
    });
});

describe("returning copies", () => {
    it("puts the copy back on the shelf when nobody is waiting", async () => {
        const { copy } = await oneCopyOut();

        const result = await returnCopy({ barcode: copy.barcode });

        expect(result.fineAmount).toBe(0);
        expect(result.reservation).toBeNull();
        expect((await Copy.findById(copy._id)).status).toBe("available");
    });

    it("charges the fine for each late day", async () => {
        const { copy } = await oneCopyOut();
        await Loan.updateOne({ copy: copy._id }, { dueAt: new Date(Date.now() - 3 * DAY) });

        const result = await returnCopy({ barcode: copy.barcode });

        expect(result.lateDays).toBe(3);
        expect(result.fineAmount).toBe(3 * FINE_PER_DAY);
        expect((await Loan.findOne({ copy: copy._id })).fineAmount).toBe(3 * FINE_PER_DAY);
    });

    it("refuses to return a copy that is not issued", async () => {
        const { copies } = await makeBook(1);

        await expect(returnCopy({ barcode: copies[0].barcode })).rejects.toThrow(
            "not currently issued"
        );
    });
});

describe("reservation queue", () => {
    it("does not allow reserving while a copy is available", async () => {
        const { book } = await makeBook(1);
        const member = await makeUser();

        await expect(reserveBook({ bookId: book._id, memberId: member._id })).rejects.toThrow(
            "available right now"
        );
    });

    it("does not allow the same member to reserve a book twice", async () => {
        const { book } = await oneCopyOut();
        const member = await makeUser();
        await reserveBook({ bookId: book._id, memberId: member._id });

        await expect(reserveBook({ bookId: book._id, memberId: member._id })).rejects.toThrow(
            "already reserved"
        );
    });

    it("orders the queue first come, first served", async () => {
        const { book } = await oneCopyOut();
        const [m1, m2] = [await makeUser(), await makeUser()];

        const r1 = await reserveBook({ bookId: book._id, memberId: m1._id });
        const r2 = await reserveBook({ bookId: book._id, memberId: m2._id });

        expect(await queuePosition(r1)).toBe(1);
        expect(await queuePosition(r2)).toBe(2);
    });

    it("holds a returned copy for the first person in the queue", async () => {
        const { book, copy } = await oneCopyOut();
        const [m1, m2] = [await makeUser(), await makeUser()];
        const r1 = await reserveBook({ bookId: book._id, memberId: m1._id });
        const r2 = await reserveBook({ bookId: book._id, memberId: m2._id });

        await returnCopy({ barcode: copy.barcode });

        const held = await Copy.findById(copy._id);
        expect(held.status).toBe("held");
        expect(String(held.heldFor)).toBe(String(m1._id));
        expect((await Reservation.findById(r1._id)).status).toBe("offered");
        expect((await Reservation.findById(r2._id)).status).toBe("waiting");
    });

    it("does not let a held copy be issued to someone else", async () => {
        const { book, copy } = await oneCopyOut();
        const [m1, m2, outsider] = [await makeUser(), await makeUser(), await makeUser()];
        await reserveBook({ bookId: book._id, memberId: m1._id });
        await reserveBook({ bookId: book._id, memberId: m2._id });
        await returnCopy({ barcode: copy.barcode });

        await expect(issue(copy.barcode, m2)).rejects.toThrow("held for another member");
        await expect(issue(copy.barcode, outsider)).rejects.toThrow("held for another member");
        expect((await Copy.findById(copy._id)).status).toBe("held");
    });

    it("issues the held copy to its member and fulfils the reservation", async () => {
        const { book, copy } = await oneCopyOut();
        const m1 = await makeUser();
        const r1 = await reserveBook({ bookId: book._id, memberId: m1._id });
        await returnCopy({ barcode: copy.barcode });

        await issue(copy.barcode, m1);

        expect((await Reservation.findById(r1._id)).status).toBe("fulfilled");
        expect((await Copy.findById(copy._id)).status).toBe("issued");
    });

    it("passes the copy to the next person when an offered reservation is cancelled", async () => {
        const { book, copy } = await oneCopyOut();
        const [m1, m2] = [await makeUser(), await makeUser()];
        const r1 = await reserveBook({ bookId: book._id, memberId: m1._id });
        const r2 = await reserveBook({ bookId: book._id, memberId: m2._id });
        await returnCopy({ barcode: copy.barcode });

        await cancelReservation({ reservationId: r1._id, user: m1 });

        const held = await Copy.findById(copy._id);
        expect(held.status).toBe("held");
        expect(String(held.heldFor)).toBe(String(m2._id));
        expect((await Reservation.findById(r2._id)).status).toBe("offered");
    });

    it("puts the copy back on the shelf when the last offered reservation is cancelled", async () => {
        const { book, copy } = await oneCopyOut();
        const m1 = await makeUser();
        const r1 = await reserveBook({ bookId: book._id, memberId: m1._id });
        await returnCopy({ barcode: copy.barcode });

        await cancelReservation({ reservationId: r1._id, user: m1 });

        expect((await Copy.findById(copy._id)).status).toBe("available");
    });

    it("gives new copies to the queue before the shelf", async () => {
        const { book } = await makeBook(0);
        const m1 = await makeUser();
        await reserveBook({ bookId: book._id, memberId: m1._id });

        await Copy.create({ book: book._id, barcode: `${book.isbn}-001` });
        await Copy.create({ book: book._id, barcode: `${book.isbn}-002` });
        await fillQueueFromAvailableCopies(book._id);

        const copies = await Copy.find({ book: book._id });
        expect(copies.filter((c) => c.status === "held")).toHaveLength(1);
        expect(copies.filter((c) => c.status === "available")).toHaveLength(1);
    });

    it("hands two simultaneous returns to two different people", async () => {
        const { book, copies } = await makeBook(2);
        const borrower = await makeUser();
        await issue(copies[0].barcode, borrower);
        await issue(copies[1].barcode, borrower);
        const [m1, m2] = [await makeUser(), await makeUser()];
        await reserveBook({ bookId: book._id, memberId: m1._id });
        await reserveBook({ bookId: book._id, memberId: m2._id });

        await Promise.all(copies.map((c) => returnCopy({ barcode: c.barcode })));

        const reservations = await Reservation.find({ book: book._id });
        expect(reservations.every((r) => r.status === "offered")).toBe(true);
        expect(new Set(reservations.map((r) => String(r.heldCopy))).size).toBe(2);

        const held = await Copy.find({ book: book._id });
        expect(held.every((c) => c.status === "held")).toBe(true);
        expect(new Set(held.map((c) => String(c.heldFor))).size).toBe(2);
    });
});