import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import packageJson from "../package.json";

describe("package CLI metadata", () => {
    test("exposes a global command and builds before local installation", async () => {
        expect(packageJson.bin).toEqual({
            mdp: "./bin/markdown-preview.js",
        });
        expect(packageJson.files).toEqual(["bin", "dist", "README.md"]);
        expect(packageJson.scripts.prepare).toBe("bun run build");

        const binEntryPath = path.join(
            import.meta.dir,
            "..",
            "bin/markdown-preview.js"
        );
        const binEntrySource = await readFile(binEntryPath, "utf8");

        expect(binEntrySource).toContain("#!/usr/bin/env node");
        expect(binEntrySource).toContain(
            'const { spawn } = require("node:child_process")'
        );
        expect(binEntrySource).toContain(
            'path.resolve(__dirname, "../dist/cli/index.js")'
        );
        expect(binEntrySource).toContain("process.execPath");
        expect(binEntrySource).toContain("process.argv.slice(2)");
    });
});
