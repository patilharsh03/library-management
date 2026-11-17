export function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata"
    });
}

export function formatMoney(amount) {
    return `\u20B9${amount}`;
}