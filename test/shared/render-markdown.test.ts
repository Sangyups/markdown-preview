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

    test("renders a safe allowlist of inline html tags", () => {
        const html = renderMarkdown(
            "Line one<br/>Line two with H<sub>2</sub>O, x<sup>2</sup>, and <kbd>Cmd</kbd>."
        );

        expect(html).toContain("<br>");
        expect(html).toContain("H<sub>2</sub>O");
        expect(html).toContain("x<sup>2</sup>");
        expect(html).toContain("<kbd>Cmd</kbd>");
    });

    test("renders safe disclosure tags while keeping other html escaped", () => {
        const html = renderMarkdown(
            "<details><summary>More</summary>Body</details>\n\nPlaceholder: <serverId>"
        );

        expect(html).toContain("<details>");
        expect(html).toContain("<summary>More</summary>");
        expect(html).toContain("Body</details>");
        expect(html).toContain("&lt;serverId&gt;");
    });

    test("renders safe image tags with a constrained attribute allowlist", () => {
        const html = renderMarkdown(
            'Before <img src="https://example.com/diagram.png" alt="Diagram" title="System Diagram" width="640" height="480"> after'
        );

        expect(html).toContain(
            '<img src="https://example.com/diagram.png" alt="Diagram" title="System Diagram" width="640" height="480">'
        );
    });

    test("keeps unsafe image tags escaped", () => {
        const html = renderMarkdown(
            'Unsafe <img src="javascript:alert(1)" onerror="alert(1)" alt="Oops">'
        );

        expect(html).toContain(
            "&lt;img src=&quot;javascript:alert(1)&quot; onerror=&quot;alert(1)&quot; alt=&quot;Oops&quot;&gt;"
        );
    });

    test("wraps tables in a horizontal scroll container", () => {
        const html = renderMarkdown(
            "| a | b |\n| --- | --- |\n| one | two |\n"
        );

        expect(html).toContain('<div class="table-scroll"><table>');
        expect(html).toContain("</table>\n</div>");
    });
});
