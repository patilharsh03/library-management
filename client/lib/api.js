const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
    constructor(messgae, status, details) {
        super(messgae);
        this.status = status;
        this.details = details;
    }
}

export async function api(path, { method = "GET", body, token } = {}) {
    let res;
    try {
        res = await fetch(`${API_URL}${path}`, {
            method,
            headers: {
                ...(body ? { "Content-Type": "application/json" } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new ApiError("Cannot reach the server. Check your connection and try again.", 0);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error || "Something went wrong", res.status, data.details);
    return data;
}

// Turns the server's validation details into { fieldName: "message"}
export function fieldErrors(err) {
    const out = {};
    for (const d of err.details || []) {
        if (d.field && !out[d.field]) out[d.field] = d.message;
    }
    return out;
}