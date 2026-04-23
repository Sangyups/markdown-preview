import { describe, expect, test } from "bun:test";

import {
    decodeMermaidSource,
    encodeMermaidSource,
    isMermaidFence,
} from "../../src/shared/markdown/extract-mermaid-blocks";

describe("isMermaidFence", () => {
    test("accepts mermaid language tag", () => {
        expect(isMermaidFence("mermaid")).toBe(true);
        expect(isMermaidFence("mermaid title=demo")).toBe(true);
    });

    test("rejects non-mermaid language tags", () => {
        expect(isMermaidFence("ts")).toBe(false);
        expect(isMermaidFence("")).toBe(false);
    });

    test("round-trips mermaid sources through URI encoding", () => {
        const source = "flowchart TD\nA[hello world] --> B[x & y]";

        expect(decodeMermaidSource(encodeMermaidSource(source))).toBe(source);
    });
});
