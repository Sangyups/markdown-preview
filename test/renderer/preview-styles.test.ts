import { describe, expect, test } from "bun:test";

const previewCss = await Bun.file("src/renderer/preview.css").text();
const darkThemeStart = previewCss.indexOf(
    "@media (prefers-color-scheme: dark)"
);
const globalStylesStart = previewCss.indexOf("* {");
const rootStyleBlock = previewCss.slice(0, darkThemeStart);
const darkThemeStyleBlock = previewCss.slice(darkThemeStart, globalStylesStart);
const tableStyleStart = previewCss.indexOf(".markdown-body table {");
const tableStyleEnd = previewCss.indexOf(".markdown-body th,", tableStyleStart);
const tableStyleBlock = previewCss.slice(tableStyleStart, tableStyleEnd);

describe("preview styles", () => {
    test("keeps wide tables inside a dedicated scroll container", () => {
        expect(previewCss).toContain(".table-scroll");
        expect(previewCss).toContain("overflow-x: auto");
    });

    test("does not force narrow tables to expand to the full preview width", () => {
        expect(tableStyleBlock).toContain(".markdown-body table");
        expect(tableStyleBlock).toContain("width: max-content");
        expect(tableStyleBlock).not.toContain("min-width: 100%");
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

    test("uses GitHub Dark Dimmed-like defaults for code blocks", () => {
        expect(rootStyleBlock).toContain("--preview-code-background: #22272e;");
        expect(rootStyleBlock).toContain("--preview-code-foreground: #adbac7;");
        expect(rootStyleBlock).toContain("--preview-code-comment: #768390;");
        expect(rootStyleBlock).toContain("--preview-code-keyword: #f47067;");
        expect(rootStyleBlock).toContain("--preview-code-string: #96d0ff;");
        expect(previewCss).toContain(
            "background: var(--preview-code-background)"
        );
        expect(previewCss).toContain("color: var(--preview-code-foreground)");
        expect(rootStyleBlock).not.toContain(
            "--preview-code-background: #f6f8fa;"
        );
        expect(rootStyleBlock).not.toContain(
            "--preview-code-foreground: #24292f;"
        );
    });

    test("does not override code block tokens behind the system color scheme media query", () => {
        expect(darkThemeStyleBlock).toContain(
            "@media (prefers-color-scheme: dark)"
        );
        expect(darkThemeStyleBlock).toContain("color-scheme: dark");

        for (const codeToken of [
            "--preview-code-background:",
            "--preview-code-border:",
            "--preview-code-foreground:",
            "--preview-code-comment:",
            "--preview-code-keyword:",
            "--preview-code-literal:",
            "--preview-code-symbol:",
            "--preview-code-string:",
            "--preview-code-title:",
            "--preview-code-muted:",
            "--preview-code-deletion:",
            "--preview-code-addition:",
        ]) {
            expect(darkThemeStyleBlock).not.toContain(codeToken);
        }
    });
});
