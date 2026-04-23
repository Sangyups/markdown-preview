#!/usr/bin/env node

const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const cliEntryPath = path.resolve(__dirname, "../dist/cli/index.js");

if (!existsSync(cliEntryPath)) {
    console.error(
        "Unable to start markdown-preview because the built CLI entrypoint is missing. Run `bun run build` in the package directory and try again."
    );
    process.exit(1);
}

const child = spawn(process.execPath, [cliEntryPath, ...process.argv.slice(2)], {
    env: process.env,
    stdio: "inherit",
});

child.on("error", (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code ?? 0);
});
