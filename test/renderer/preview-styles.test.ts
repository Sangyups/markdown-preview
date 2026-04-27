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

    test("keeps images inside the preview width", () => {
        expect(previewCss).toContain(".markdown-body img");
        expect(previewCss).toContain("display: block");
        expect(previewCss).toContain("height: auto");
        expect(previewCss).toContain("max-width: 100%");
    });

    test("shows a pointer cursor for details disclosure summaries", () => {
        expect(previewCss).toContain(".markdown-body details > summary");
        expect(previewCss).toContain("cursor: pointer");
    });

    test("styles task-list checkboxes without duplicate list bullets", () => {
        expect(previewCss).toContain(".markdown-body .task-list-item");
        expect(previewCss).toContain("list-style: none");
        expect(previewCss).toContain(".markdown-body .task-list-item-checkbox");
    });

    test("styles rendered footnotes", () => {
        expect(previewCss).toContain(".markdown-body .footnotes");
        expect(previewCss).toContain(".markdown-body .footnotes-sep");
        expect(previewCss).toContain(".markdown-body .footnote-ref");
        expect(previewCss).toContain(".markdown-body .footnote-backref");
        expect(previewCss).toContain(".markdown-body .footnote-item");
    });

    test("styles syntax highlight token classes", () => {
        expect(previewCss).toContain(".markdown-body .hljs-keyword");
        expect(previewCss).toContain(".markdown-body .hljs-string");
        expect(previewCss).toContain(".markdown-body .hljs-number");
    });

    test("uses light theme defaults for code blocks", () => {
        expect(previewCss).toContain("--preview-code-background: #f6f8fa;");
        expect(previewCss).toContain("--preview-code-foreground: #24292f;");
        expect(previewCss).toContain(
            "background: var(--preview-code-background)"
        );
        expect(previewCss).toContain("color: var(--preview-code-foreground)");
        expect(previewCss).not.toContain("background: #1b1f1d;");
        expect(previewCss).not.toContain("color: #edf1ed;");
    });

    test("declares dark theme tokens behind the system color scheme media query", () => {
        expect(previewCss).toContain("@media (prefers-color-scheme: dark)");
        expect(previewCss).toContain("color-scheme: dark");
        expect(previewCss).toContain("--preview-code-background: #151b18;");
        expect(previewCss).toContain("--preview-code-foreground: #d9e1dc;");
    });
});
