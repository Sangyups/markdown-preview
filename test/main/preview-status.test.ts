import { describe, expect, test } from "bun:test";

import { buildPreviewStatus } from "../../src/main/preview-status";

describe("buildPreviewStatus", () => {
    test("uses the existing watch message for file targets", () => {
        expect(buildPreviewStatus("file")).toEqual({
            message: "Watching for file changes.",
            tone: "info",
        });
    });

    test("uses a stdin-specific message for stdin targets", () => {
        expect(buildPreviewStatus("stdin")).toEqual({
            message: "Previewing stdin input.",
            tone: "info",
        });
    });
});
