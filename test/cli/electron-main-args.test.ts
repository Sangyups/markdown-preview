import { describe, expect, test } from "bun:test";

import { buildElectronMainArgs } from "../../src/cli/electron-main-args";

describe("buildElectronMainArgs", () => {
    test("passes the selected target and theme override to Electron main", () => {
        expect(
            buildElectronMainArgs(
                "/app/dist/main/index.js",
                "/docs/README.md",
                "dark"
            )
        ).toEqual([
            "/app/dist/main/index.js",
            "--target",
            "/docs/README.md",
            "--theme=dark",
        ]);
    });

    test("omits the theme flag when no override is provided", () => {
        expect(
            buildElectronMainArgs(
                "/app/dist/main/index.js",
                "/docs/README.md",
                null
            )
        ).toEqual(["/app/dist/main/index.js", "--target", "/docs/README.md"]);
    });
});
