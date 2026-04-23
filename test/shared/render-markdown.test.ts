import { describe, expect, test } from "bun:test";

import { renderMarkdown } from "../../src/shared/markdown/render-markdown";

describe("renderMarkdown", () => {
    test("renders standard markdown elements", () => {
        const html = renderMarkdown("# Hello\n\n- one\n- two");

        expect(html).toContain("<h1>Hello</h1>");
        expect(html).toContain("<ul>");
    });

    test("renders mermaid fences as placeholders", () => {
        const html = renderMarkdown("```mermaid\nflowchart TD\nA --> B\n```");

        expect(html).toContain("data-mermaid-source=");
        expect(html).not.toContain('<code class="language-mermaid">');
    });

    test("escapes raw html by default", () => {
        const html = renderMarkdown("<script>alert(1)</script>");

        expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    });
});
