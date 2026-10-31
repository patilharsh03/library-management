import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        testTimeout: 30000,
        hookTimeout: 120000, // the first run downloads a MongoDB binary
        fileParallelism: false,
    }
})