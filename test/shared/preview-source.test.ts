import { describe, expect, test } from "bun:test";

import { parsePreviewSourceOption } from "../../src/shared/preview-source";

describe("parsePreviewSourceOption", () => {
    test("defaults to file source when the option is omitted", () => {
        expect(parsePreviewSourceOption(["--target", "/docs/README.md"])).toBe(
            "file"
        );
    });

    test("extracts an equals-style stdin source option", () => {
        expect(
            parsePreviewSourceOption([
                "--target",
                "/tmp/stdin.md",
                "--source=stdin",
            ])
        ).toBe("stdin");
    });

    test("extracts a space-separated source option", () => {
        expect(parsePreviewSourceOption(["--source", "file"])).toBe("file");
    });

    test("rejects unsupported source values", () => {
        expect(() => parsePreviewSourceOption(["--source=clipboard"])).toThrow(
            /Expected file or stdin/
        );
    });

    test("rejects a missing source value", () => {
        expect(() => parsePreviewSourceOption(["--source"])).toThrow(
            /Missing value for --source/
        );
    });
});
