import { describe, expect, test } from "bun:test";
import { pathToFileURL } from "node:url";

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

    test("highlights non-mermaid fenced code blocks", () => {
        const html = renderMarkdown("```ts\nconst count: number = 1;\n```");

        expect(html).toContain('<code class="hljs language-ts">');
        expect(html).toContain('class="hljs-keyword"');
        expect(html).toContain('class="hljs-number"');
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

    test("renders common safe inline html tags with constrained attributes", () => {
        const html = renderMarkdown(
            [
                "Inline <strong>bold</strong>, <i>italic</i>, <u>under</u>,",
                "<s>old</s>, <del>gone</del>, <mark>hit</mark>,",
                "<small>fine</small>, <code>x</code>, <samp>out</samp>,",
                "<var>n</var>, <cite>Book</cite>, <q>quote</q>,",
                '<span>plain</span>, <abbr title="HyperText Markup Language">HTML</abbr>,',
                '<a href="#section" title="Jump">Jump</a>, and <a href="docs/page.md">Relative</a>.',
            ].join(" ")
        );

        expect(html).toContain("<strong>bold</strong>");
        expect(html).toContain("<i>italic</i>");
        expect(html).toContain("<u>under</u>");
        expect(html).toContain("<s>old</s>");
        expect(html).toContain("<del>gone</del>");
        expect(html).toContain("<mark>hit</mark>");
        expect(html).toContain("<small>fine</small>");
        expect(html).toContain("<code>x</code>");
        expect(html).toContain("<samp>out</samp>");
        expect(html).toContain("<var>n</var>");
        expect(html).toContain("<cite>Book</cite>");
        expect(html).toContain("<q>quote</q>");
        expect(html).toContain("<span>plain</span>");
        expect(html).toContain(
            '<abbr title="HyperText Markup Language">HTML</abbr>'
        );
        expect(html).toContain('<a href="#section" title="Jump">Jump</a>');
        expect(html).toContain('<a href="docs/page.md">Relative</a>');
    });

    test("rewrites relative markdown images and links against the document path", () => {
        const html = renderMarkdown(
            "![Diagram](./images/diagram.png)\n\n[Spec](../spec.md)",
            {
                documentPath: "/tmp/docs/guide/README.md",
            }
        );

        expect(html).toContain(
            `<img src="${pathToFileURL("/tmp/docs/guide/images/diagram.png").href}" alt="Diagram">`
        );
        expect(html).toContain(
            `<a href="${pathToFileURL("/tmp/docs/spec.md").href}">Spec</a>`
        );
    });

    test("rewrites relative safe raw html urls against the document path", () => {
        const html = renderMarkdown(
            '<img src="./images/diagram.png" alt="Diagram"><a href="../spec.md">Spec</a>',
            {
                documentPath: "/tmp/docs/guide/README.md",
            }
        );

        expect(html).toContain(
            `<img src="${pathToFileURL("/tmp/docs/guide/images/diagram.png").href}" alt="Diagram">`
        );
        expect(html).toContain(
            `<a href="${pathToFileURL("/tmp/docs/spec.md").href}">Spec</a>`
        );
    });

    test("keeps relative urls unchanged when no document path is provided", () => {
        const html = renderMarkdown(
            '![Diagram](./images/diagram.png)\n\n<a href="../spec.md">Spec</a>'
        );

        expect(html).toContain(
            '<img src="./images/diagram.png" alt="Diagram">'
        );
        expect(html).toContain('<a href="../spec.md">Spec</a>');
    });

    test("keeps unsafe inline html attributes escaped", () => {
        const html = renderMarkdown(
            [
                '<a href="javascript:alert(1)" onclick="alert(1)">bad</a>',
                '<strong onclick="alert(1)">bad</strong>',
                '<abbr title="HTML" onclick="alert(1)">HTML</abbr>',
            ].join(" ")
        );

        expect(html).toContain(
            "&lt;a href=&quot;javascript:alert(1)&quot; onclick=&quot;alert(1)&quot;&gt;bad&lt;/a&gt;"
        );
        expect(html).toContain(
            "&lt;strong onclick=&quot;alert(1)&quot;&gt;bad&lt;/strong&gt;"
        );
        expect(html).toContain(
            "&lt;abbr title=&quot;HTML&quot; onclick=&quot;alert(1)&quot;&gt;HTML&lt;/abbr&gt;"
        );
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

    test("renders disclosure summaries with safe inline formatting", () => {
        const html = renderMarkdown(
            "<details>\n<summary><b>NVIDIA NIM</b> (40 req/min free, recommended)</summary>\n\nBody\n\n</details>"
        );

        expect(html).toContain("<details>");
        expect(html).toContain(
            "<summary><b>NVIDIA NIM</b> (40 req/min free, recommended)</summary>"
        );
        expect(html).toContain("<p>Body</p>");
        expect(html).toContain("</details>");
    });

    test("renders safe div tags with a constrained align attribute", () => {
        const html = renderMarkdown(
            '<div align="center">\n\n# Centered Title\n\n</div>'
        );

        expect(html).toContain('<div align="center">');
        expect(html).toContain("<h1>Centered Title</h1>");
        expect(html).toContain("</div>");
    });

    test("renders safe centered div blocks with image captions", () => {
        const html = renderMarkdown(
            '<div align="center">\n  <img src="pic.png" alt="Free Claude Code in action" width="700">\n  <p><em>Claude Code running via NVIDIA NIM, completely free</em></p>\n</div>'
        );

        expect(html).toContain('<div align="center">');
        expect(html).toContain(
            '<img src="pic.png" alt="Free Claude Code in action" width="700">'
        );
        expect(html).toContain(
            "<p><em>Claude Code running via NVIDIA NIM, completely free</em></p>"
        );
        expect(html).toContain("</div>");
    });

    test("renders common safe block html tags", () => {
        const html = renderMarkdown(
            [
                "<section>",
                "<figure>",
                "<figcaption><strong>Caption</strong></figcaption>",
                "</figure>",
                "</section>",
                "<blockquote><p>Quote</p></blockquote>",
                "<hr>",
                "<pre><code>const value = 1;</code></pre>",
                "<ul><li>One</li></ul>",
                "<ol><li>Two</li></ol>",
                "<center>Centered</center>",
                "<h2>Raw Heading</h2>",
            ].join("\n")
        );

        expect(html).toContain("<section>");
        expect(html).toContain("<figure>");
        expect(html).toContain(
            "<figcaption><strong>Caption</strong></figcaption>"
        );
        expect(html).toContain("<blockquote><p>Quote</p></blockquote>");
        expect(html).toContain("<hr>");
        expect(html).toContain("<pre><code>const value = 1;</code></pre>");
        expect(html).toContain("<ul><li>One</li></ul>");
        expect(html).toContain("<ol><li>Two</li></ol>");
        expect(html).toContain("<center>Centered</center>");
        expect(html).toContain("<h2>Raw Heading</h2>");
    });

    test("renders safe raw html table structure with constrained cell attributes", () => {
        const html = renderMarkdown(
            [
                "<table>",
                "<caption>Scores</caption>",
                '<thead><tr><th align="left" colspan="2">Name</th></tr></thead>',
                '<tbody><tr><td rowspan="2">A</td><td align="right">1</td></tr></tbody>',
                '<tfoot><tr><td colspan="2">Total</td></tr></tfoot>',
                "</table>",
            ].join("\n")
        );

        expect(html).toContain("<table>");
        expect(html).toContain("<caption>Scores</caption>");
        expect(html).toContain('<th align="left" colspan="2">Name</th>');
        expect(html).toContain('<td rowspan="2">A</td>');
        expect(html).toContain('<td align="right">1</td>');
        expect(html).toContain('<td colspan="2">Total</td>');
        expect(html).toContain("</table>");
    });

    test("keeps unsafe raw html table attributes escaped", () => {
        const html = renderMarkdown(
            '<table style="width:100%"><tr><td colspan="0" onclick="alert(1)">Bad</td></tr></table>'
        );

        expect(html).toContain(
            "&lt;table style=&quot;width:100%&quot;&gt;&lt;tr&gt;&lt;td colspan=&quot;0&quot; onclick=&quot;alert(1)&quot;&gt;Bad&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;"
        );
    });

    test("keeps unsafe div tags escaped", () => {
        const html = renderMarkdown(
            '<div align="center" onclick="alert(1)">Unsafe</div>'
        );

        expect(html).toContain(
            "&lt;div align=&quot;center&quot; onclick=&quot;alert(1)&quot;&gt;Unsafe&lt;/div&gt;"
        );
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

    test("renders GFM task-list checkboxes", () => {
        const html = renderMarkdown("- [x] done\n- [ ] todo\n");

        expect(html).toContain(
            '<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox" checked disabled> done</li>'
        );
        expect(html).toContain(
            '<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox" disabled> todo</li>'
        );
        expect(html).not.toContain("[x] done");
        expect(html).not.toContain("[ ] todo");
    });

    test("keeps loose task-list checkboxes aligned with first paragraph text", () => {
        const html = renderMarkdown(
            "- [ ] **Step 1: Write the failing tests**\n\n  Details"
        );

        expect(html).toContain(
            '<li class="task-list-item">\n<p><input class="task-list-item-checkbox" type="checkbox" disabled> <strong>Step 1: Write the failing tests</strong></p>'
        );
        expect(html).not.toContain(
            '<input class="task-list-item-checkbox" type="checkbox" disabled> <p><strong>Step 1: Write the failing tests</strong></p>'
        );
    });

    test("does not apply nested task-list markers to parent list items", () => {
        const html = renderMarkdown("-\n  - [x] child\n");

        expect(html).toContain(
            '<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox" checked disabled> child</li>'
        );
        expect(html).not.toContain(
            '<li class="task-list-item">\n<input class="task-list-item-checkbox" type="checkbox" checked disabled> <ul>'
        );
    });

    test("renders footnote references and definitions", () => {
        const html = renderMarkdown(
            "Text with a footnote.[^1]\n\n[^1]: Footnote text"
        );

        expect(html).toContain('class="footnote-ref"');
        expect(html).toContain('href="#fn1"');
        expect(html).toContain('id="fnref1"');
        expect(html).toContain('<section class="footnotes">');
        expect(html).toMatch(/<li id="fn1"\s+class="footnote-item">/);
        expect(html).toContain("Footnote text");
        expect(html).toContain('class="footnote-backref"');
        expect(html).not.toContain("[^1]: Footnote text");
    });

    test("renders inline footnotes in the collected footnote section", () => {
        const html = renderMarkdown("Text with inline note.^[Inline text]");

        expect(html).toContain('class="footnote-ref"');
        expect(html).toContain('<section class="footnotes">');
        expect(html).toMatch(/<li id="fn1"\s+class="footnote-item">/);
        expect(html).toContain("Inline text");
        expect(html).not.toContain("^[Inline text]");
    });

    test("renders yaml frontmatter as structured metadata before the markdown body", () => {
        const html = renderMarkdown(
            [
                "---",
                "title: Hello",
                "shortTitle: Hi",
                "---",
                "",
                "# Heading",
            ].join("\n")
        );

        expect(html).toContain('<div class="table-scroll frontmatter-scroll">');
        expect(html).toContain('<table class="frontmatter-table">');
        expect(html).toContain("<th>title</th>");
        expect(html).toContain("<td>Hello</td>");
        expect(html).toContain("<th>shortTitle</th>");
        expect(html).toContain("<td>Hi</td>");
        expect(html).toContain("<h1>Heading</h1>");
        expect(html).not.toContain('<code class="hljs language-yaml">');
    });

    test("renders nested metadata values from frontmatter in structured rows", () => {
        const html = renderMarkdown(
            [
                "---",
                "title: Hello",
                "versions:",
                "  fpt: '*'",
                "  ghes: '>=3.11'",
                "redirect_from:",
                "  - /one",
                "  - /two",
                "---",
                "",
                "# Heading",
            ].join("\n")
        );

        expect(html).toContain('<ul class="frontmatter-list">');
        expect(html).toContain("<strong>fpt</strong>: *");
        expect(html).toContain("<strong>ghes</strong>: &gt;=3.11");
        expect(html).toContain("<li>/one</li>");
        expect(html).toContain("<li>/two</li>");
        expect(html).toContain("<h1>Heading</h1>");
        expect(html).not.toContain('<code class="hljs language-yaml">');
    });

    test("renders inline markdown inside frontmatter string values", () => {
        const html = renderMarkdown(
            [
                "---",
                'title: "**Hello** `team`"',
                'summary: "See [Spec](../spec.md)"',
                "---",
            ].join("\n"),
            {
                documentPath: "/tmp/docs/guide/README.md",
            }
        );

        expect(html).toContain("<th>title</th>");
        expect(html).toContain("<strong>Hello</strong>");
        expect(html).toContain("<code>team</code>");
        expect(html).toContain("<th>summary</th>");
        expect(html).toContain(
            `<a href="${pathToFileURL("/tmp/docs/spec.md").href}">Spec</a>`
        );
    });

    test("renders inline markdown inside nested frontmatter values", () => {
        const html = renderMarkdown(
            [
                "---",
                "versions:",
                '  ghes: "**>=3.11**"',
                "redirect_from:",
                '  - "[One](./one.md)"',
                "---",
            ].join("\n"),
            {
                documentPath: "/tmp/docs/guide/README.md",
            }
        );

        expect(html).toContain("<strong>ghes</strong>");
        expect(html).toContain("<strong>&gt;=3.11</strong>");
        expect(html).toContain(
            `<a href="${pathToFileURL("/tmp/docs/guide/one.md").href}">One</a>`
        );
    });

    test("renders GFM alerts as div blocks with a typed class and a leading title", () => {
        const html = renderMarkdown(
            "> [!NOTE]\n> Useful information that users should know."
        );

        expect(html).toContain(
            '<div class="markdown-alert markdown-alert-note">'
        );
        expect(html).toContain('<p class="markdown-alert-title">');
        expect(html).toContain('class="octicon octicon-info"');
        expect(html).toContain(">Note</p>");
        expect(html).toContain("Useful information that users should know.");
        expect(html).not.toContain("[!NOTE]");
        expect(html).not.toContain("<blockquote");
    });

    test("renders all GFM alert kinds with matching classes, octicons, and titles", () => {
        const cases: Array<[string, string, string, string]> = [
            ["TIP", "tip", "Tip", "octicon-light-bulb"],
            ["IMPORTANT", "important", "Important", "octicon-report"],
            ["WARNING", "warning", "Warning", "octicon-alert"],
            ["CAUTION", "caution", "Caution", "octicon-stop"],
        ];

        for (const [marker, kind, label, iconClass] of cases) {
            const html = renderMarkdown(`> [!${marker}]\n> body`);

            expect(html).toContain(
                `<div class="markdown-alert markdown-alert-${kind}">`
            );
            expect(html).toContain('<p class="markdown-alert-title">');
            expect(html).toContain(`class="octicon ${iconClass}"`);
            expect(html).toContain(`>${label}</p>`);
            expect(html).toContain("body");
            expect(html).not.toContain(`[!${marker}]`);
        }
    });

    test("renders GFM alerts with the body separated by a blank quoted line", () => {
        const html = renderMarkdown(
            "> [!WARNING]\n>\n> Be careful with this **action**."
        );

        expect(html).toContain(
            '<div class="markdown-alert markdown-alert-warning">'
        );
        expect(html).toContain('class="octicon octicon-alert"');
        expect(html).toContain(">Warning</p>");
        expect(html).toContain("<strong>action</strong>");
        expect(html).not.toContain("[!WARNING]");
    });

    test("renders title-only GFM alerts without leftover marker text", () => {
        const html = renderMarkdown("> [!TIP]");

        expect(html).toContain(
            '<div class="markdown-alert markdown-alert-tip">'
        );
        expect(html).toContain('class="octicon octicon-light-bulb"');
        expect(html).toContain(">Tip</p>");
        expect(html).not.toContain("[!TIP]");
    });

    test("ignores unknown alert markers", () => {
        const html = renderMarkdown("> [!FYI]\n> not a real alert");

        expect(html).not.toContain("markdown-alert");
        expect(html).toContain("[!FYI]");
    });

    test("ignores alert markers that are not at the start of a blockquote", () => {
        const html = renderMarkdown("> Heads up!\n> [!NOTE]\n> body");

        expect(html).not.toContain("markdown-alert");
        expect(html).toContain("[!NOTE]");
    });

    test("renders toml frontmatter as structured metadata before the markdown body", () => {
        const html = renderMarkdown(
            [
                "+++",
                'title = "Hello"',
                "draft = true",
                "+++",
                "",
                "# Heading",
            ].join("\n")
        );

        expect(html).toContain('<table class="frontmatter-table">');
        expect(html).toContain("<th>title</th>");
        expect(html).toContain("<td>Hello</td>");
        expect(html).toContain("<th>draft</th>");
        expect(html).toContain("<td>true</td>");
        expect(html).toContain("<h1>Heading</h1>");
        expect(html).not.toContain('<code class="hljs language-toml">');
    });
});
