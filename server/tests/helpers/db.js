import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as models from "../../src/models/index.js";

let mongod;

export async function connectTestDb() {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    // Build indexes (including the unique reservation index) before any test runs
    await Promise.all(Object.values(models).map((m) => m.init()));
}

export async function clearTestDb() {
    await Promise.all(Object.values(models).map((m) => m.deleteMany({})));
}

export async function disconnectTestDb() {
    await mongoose.disconnect();
    await mongod.stop();
}