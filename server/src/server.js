import "dotenv/config";
import mongoose from "mongoose";
import { app } from "./app.js";
import * as models from "./models/index.js";

const PORT = process.env.PORT || 5000;

async function start() {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
    await Promise.all(Object.values(models).map((m) => m.init()));
    console.log("Indexes ready");
    app.listen(PORT, () => console.log(`API running on port ${PORT}`));
}

start().catch((err) => {
    console.error(err);
    process.exit(1);
});