import { describe, it, expect } from "vitest";
import { calculateDueDate, calculateFine } from "../src/utils/fines.js";

const issued = "2026-01-01T10:00:00+05:30";
const due = calculateDueDate(issued); // 15 Jan 2026, 10:00 IST

describe("calculateDueDate", () => {
    it("is exactly 14 days after the issue date", () => {
        expect(due.toISOString()).toBe(new Date("2026-01-15T10:00:00+05:30").toISOString());
    });
});

describe("calculateFine", () => {
    it("is 0 when returned before the due date", () => {
        expect(calculateFine(due, "2026-01-10T12:00:00+05:30")).toBe(0);
    });

    it("is 0 when returned at the exact due time", () => {
        expect(calculateFine(due, due)).toBe(0);
    });

    it("is 0 when returned later on the due date itself", () => {
        expect(calculateFine(due, "2026-01-15T23:59:00+05:30")).toBe(0);
    });

    it("is 5 for a book that is 1 day late", () => {
        expect(calculateFine(due, "2026-01-16T00:01:00+05:30")).toBe(5);
    });

    it("is 15 for a book that is 3 days late", () => {
        expect(calculateFine(due, "2026-01-18T09:00:00+05:30")).toBe(15);
    });

    it("is 50 for a book that is 10 days late", () => {
        expect(calculateFine(due, "2026-01-25T09:00:00+05:30")).toBe(50);
    });

    it("counts days in Indian time, not UTC", () => {
        // 20:00 UTC on 15 Jan is 01:30 IST on 16 Jan, so it is 1 day late
        expect(calculateFine(due, "2026-01-15T20:00:00Z")).toBe(5);
    });

    it("throws on an invalid date instead of returning NaN", () => {
        expect(() => calculateFine(due, "not-a-date")).toThrow("Invalid date");
    });
});