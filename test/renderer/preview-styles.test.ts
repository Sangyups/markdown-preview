import { describe, expect, test } from "bun:test";

const previewCss = await Bun.file("src/renderer/preview.css").text();

describe("preview styles", () => {
    test("keeps wide tables inside a dedicated scroll container", () => {
        expect(previewCss).toContain(".table-scroll");
        expect(previewCss).toContain("overflow-x: auto");
    });

    test("lets the preview shell respond to window width changes", () => {
        expect(previewCss).not.toContain("max-width: 1400px;");
        expect(previewCss).toContain("width: 100%");
    });

    test("does not override Mermaid's own width calculation", () => {
        expect(previewCss).not.toContain("width: auto;");
    });
});
