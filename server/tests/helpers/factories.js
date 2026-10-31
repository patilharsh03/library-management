import { User, Book, Copy } from "../../src/models";

let n = 0;

export async function makeUser(overrides = {}) {
    n++;
    return User.create({
        name: `User ${n}`,
        email: `user${n}@test.com`,
        passwordHash: "not-a-real-hash",
        role: "member",
        ...overrides,
    });
}

export const makeLibrarian = () => makeUser({ role: "librarian" });

export async function makeBook(copyCount = 1) {
    n++;
    const book = await Book.create({
        title: `Book ${n}`,
        author: "Test Author",
        isbn: `97800000${String(n).padStart(5, "0")}`,
        category: "Test",
    });
    const copies = [];
    for (let i = 1; i <= copyCount; i++) {
        copies.push(
            await Copy.create({
                book: book._id,
                barcode: `${book.isbn}-${String(i).padStart(3, "0")}`
            })
        );
    }
    return { book, copies };
}