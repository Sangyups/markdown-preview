import { describe, expect, test } from "bun:test";

import { parseScanOptions } from "../../src/cli/scan-options";

describe("parseScanOptions", () => {
    test("returns null override when neither flag is present", () => {
        expect(parseScanOptions(["README.md"])).toEqual({
            includeHiddenOverride: null,
            remainingArgs: ["README.md"],
        });
    });

    test("extracts the --include-hidden flag from arguments", () => {
        expect(parseScanOptions(["--include-hidden", "~/notes"])).toEqual({
            includeHiddenOverride: true,
            remainingArgs: ["~/notes"],
        });
    });

    test("extracts the --no-hidden flag from arguments", () => {
        expect(parseScanOptions(["--no-hidden", "docs"])).toEqual({
            includeHiddenOverride: false,
            remainingArgs: ["docs"],
        });
    });

    test("uses the last flag wins when both are passed", () => {
        expect(
            parseScanOptions(["--include-hidden", "docs", "--no-hidden"])
        ).toEqual({
            includeHiddenOverride: false,
            remainingArgs: ["docs"],
        });

        expect(
            parseScanOptions(["--no-hidden", "docs", "--include-hidden"])
        ).toEqual({
            includeHiddenOverride: true,
            remainingArgs: ["docs"],
        });
    });
});
