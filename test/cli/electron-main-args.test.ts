import { describe, expect, test } from "bun:test";

import { buildElectronMainArgs } from "../../src/cli/electron-main-args";

describe("buildElectronMainArgs", () => {
    test("passes the selected file target, source, and theme override to Electron main", () => {
        expect(
            buildElectronMainArgs(
                "/app/dist/main/index.js",
                "/docs/README.md",
                "file",
                "dark"
            )
        ).toEqual([
            "/app/dist/main/index.js",
            "--target",
            "/docs/README.md",
            "--source=file",
            "--theme=dark",
        ]);
    });

    test("passes stdin source metadata", () => {
        expect(
            buildElectronMainArgs(
                "/app/dist/main/index.js",
                "/tmp/stdin.md",
                "stdin",
                null
            )
        ).toEqual([
            "/app/dist/main/index.js",
            "--target",
            "/tmp/stdin.md",
            "--source=stdin",
        ]);
    });

    test("defaults to file source and omits the theme flag when no override is provided", () => {
        expect(
            buildElectronMainArgs(
                "/app/dist/main/index.js",
                "/docs/README.md",
                "file",
                null
            )
        ).toEqual([
            "/app/dist/main/index.js",
            "--target",
            "/docs/README.md",
            "--source=file",
        ]);
    });
});
