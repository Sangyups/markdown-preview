import { describe, expect, test } from "bun:test";

import { toFilePathCandidates } from "../../src/cli/fzf-candidates";

describe("toFilePathCandidates", () => {
    test("uses paths relative to the scanned root as the fzf labels", () => {
        const result = toFilePathCandidates("/docs", [
            "/docs/README.md",
            "/docs/guides/setup.md",
        ]);

        expect(result).toEqual([
            { label: "README.md", value: "/docs/README.md" },
            { label: "guides/setup.md", value: "/docs/guides/setup.md" },
        ]);
    });
});
