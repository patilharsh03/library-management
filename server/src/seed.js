import "dotenv/config";
import readline from "node:readline/promises";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import * as models from "./models/index.js";
import { issueCopy, returnCopy } from "./services/loanService.js";
import { reserveBook } from "./services/reservationService.js";
import { LOAN_DAYS } from "./config.js";

const { User, Book, Copy, Loan } = models;

const DAY = 24 * 60 * 60 * 1000;
const PASSWORD = "demo1234";

const BOOKS = [
    { title: "Clean Code", author: "Robert C. Martin", isbn: "9780132350884", category: "Programming", copies: 2 },
    { title: "The Pragmatic Programmer", author: "Andrew Hunt, David Thomas", isbn: "9780135957059", category: "Programming", copies: 1 },
    { title: "Eloquent JavaScript", author: "Marijn Haverbeke", isbn: "9781593279509", category: "Programming", copies: 3 },
    { title: "Atomic Habits", author: "James Clear", isbn: "9780735211292", category: "Self-help", copies: 2 },
    { title: "Deep Work", author: "Cal Newport", isbn: "9781455586691", category: "Self-help", copies: 2 },
    { title: "Sapiens", author: "Yuval Noah Harari", isbn: "9780062316097", category: "History", copies: 1 },
    { title: "A Brief History of Time", author: "Stephen Hawking", isbn: "9780553380163", category: "Science", copies: 2 },
    { title: "Cosmos", author: "Carl Sagan", isbn: "9780345539434", category: "Science", copies: 2 },
    { title: "1984", author: "George Orwell", isbn: "9780451524935", category: "Classics", copies: 3 },
    { title: "Pride and Prejudice", author: "Jane Austen", isbn: "9780141439518", category: "Classics", copies: 2 },
    { title: "The Odyssey", author: "Homer", isbn: "9780140449136", category: "Classics", copies: 3 },
    { title: "To Kill a Mockingbird", author: "Harper Lee", isbn: "9780061120084", category: "Classics", copies: 2 },
    { title: "The Alchemist", author: "Paulo Coelho", isbn: "9780062315007", category: "Fiction", copies: 2 },
    { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", isbn: "9780374533557", category: "Psychology", copies: 2 },
    { title: "Man's Search for Meaning", author: "Viktor E. Frankl", isbn: "9780807014295", category: "Psychology", copies: 1 },
];

async function confirmWipe() {
    console.log(`Database: "${mongoose.connection.name}"`);
    if (process.argv.includes("--yes")) return;

    const r1 = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await r1.question(
        `This will DELETE ALL DATA in "${mongoose.connection.name}" and replace it with demo data.\nType "yes" to continue: `
    );
    r1.close();

    if (answer.trim().toLowerCase() !== "yes") {
        console.log("Cancelled. Nothing was changed.");
        await mongoose.disconnect();
        process.exit(0);
    }
}

async function main() {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    await mongoose.connect(process.env.MONGODB_URI);

    await confirmWipe();

    // Fresh start
    await Promise.all(Object.values(models).map((m) => m.init()));
    await Promise.all(Object.values(models).map((m) => m.deleteMany({})));

    // ---------------- users ---------------------------
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const makeUser = (name, email, role = "member") =>
        User.create({ name, email, passwordHash, role });

    const librarian = await makeUser("Meera Kulkarni", "librarian@demo.com", "librarian");
    const aarav = await makeUser("Aarav Sharma", "aarav@demo.com");
    const priya = await makeUser("Priya Patel", "priya@demo.com");
    const rohan = await makeUser("Rohan Mehta", "rohan@demo.com");
    const sneha = await makeUser("Sneha Iyer", "sneha@demo.com");

    // ---------------- books and copies -------------
    const byTitle = {};
    for (const { copies, ...data } of BOOKS) {
        const book = await Book.create(data);
        const docs = await Copy.insertMany(
            Array.from({ length: copies }, (_, i) => ({
                book: book._id,
                barcode: `${book.isbn}-${String(i + 1).padStart(3, "0")}`,
            }))
        );
        byTitle[data.title] = { book, copies: docs };
    }

    // ------------- helpers that use the real business logic ----------------
    const barcode = (title, n = 0) => byTitle[title].copies[n].barcode;

    // Issue a copy, then pretend it was issued `daysAgo` days ago.
    const issue = async (member, title, daysAgo, copyIndex = 0) => {
        const loan = await issueCopy({
            barcode: barcode(title, copyIndex),
            memberId: member._id,
            librarianId: librarian._id,
        });
        const issuedAt = new Date(Date.now() - daysAgo * DAY);
        await Loan.updateOne(
            { _id: loan._id },
            { issuedAt, dueAt: new Date(issuedAt.getTime() + LOAN_DAYS * DAY) }
        );
    };
    const reserve = (member, title) =>
        reserveBook({ bookId: byTitle[title].book._id, memberId: member._id });
    const giveBack = (title, copyIndex = 0) => returnCopy({ barcode: barcode(title, copyIndex) });

    // ------------------- scenarios -----------------------
    // Aarav: one healthy loan, one 6 days overdue (fine Rs 30 so far)
    await issue(aarav, "Clean Code", 4);
    await issue(aarav, "Deep Work", LOAN_DAYS + 6);

    // Atomic Habits: both copies out (Priya 2 days overdue, Rohan due soon), queue: Aarav, then Sneha
    await issue(priya, "Atomic Habits", LOAN_DAYS + 2, 0);
    await issue(rohan, "Atomic Habits", 10, 1);
    await reserve(aarav, "Atomic Habits");
    await reserve(sneha, "Atomic Habits");

    // Sapiens: only copy is with Rohan, Priya is waiting
    await issue(rohan, "Sapiens", 3);
    await reserve(priya, "Sapiens");

    // Pragmatic Programmer: Sneha had the only copy, Rohan reserved, she returned it,
    // so the copy is now held for Rohan (ready for pickup)
    await issue(sneha, "The Pragmatic Programmer", 12);
    await reserve(rohan, "The Pragmatic Programmer");
    await giveBack("The Pragmatic Programmer");

    // History: Aarav returned 1984 three days late (fine Rs 15); Priya returned The Odyssey on time
    await issue(aarav, "1984", LOAN_DAYS + 3);
    await giveBack("1984");
    await issue(priya, "The Odyssey", 5);
    await giveBack("The Odyssey");

    // --------------- summary -------------------------
    const [books, copies, loans, reservations] = await Promise.all([
        Book.countDocuments(),
        Copy.countDocuments(),
        Loan.countDocuments(),
        models.Reservation.countDocuments(),
    ]);
    console.log(`\nSeeded ${books} books, ${copies} copies, ${loans} loans, ${reservations} reservations.`);
    console.log(`\nDemo logins (password for all: ${PASSWORD})`);
    console.log("  librarian@demo.com  (librarian)");
    for (const email of ["aarav", "priya", "rohan", "sneha"]) console.log(`  ${email}@demo.com  (member)`);

    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
    process.exit(1);
});