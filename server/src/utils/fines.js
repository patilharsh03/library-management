import { LOAN_DAYS, FINE_PER_DAY, LIBRARY_UTC_OFFSET_MINUTES } from "../config.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toTime(value) {
    const t = new Date(value).getTime();
    if (Number.isNaN(t)) throw new Error("Invalid date");
    return t;
}

// Which calendar day (in library time) an instant falls on, as a whole number.
function toDayNumber(value) {
    const shifted = toTime(value) + LIBRARY_UTC_OFFSET_MINUTES * 60 * 1000;
    return Math.floor(shifted / MS_PER_DAY);
}

export function calculateDueDate(issuedAt) {
    return new Date(toTime(issuedAt) + LOAN_DAYS * MS_PER_DAY);
}

export function calculateLateDays(dueAt, returnedAt) {
    return Math.max(0, toDayNumber(returnedAt) - toDayNumber(dueAt));
}

export function calculateFine(dueAt, returnedAt) {
    return calculateLateDays(dueAt, returnedAt) * FINE_PER_DAY;
}