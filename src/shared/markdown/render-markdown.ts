import MarkdownIt from "markdown-it";

import { encodeMermaidSource, isMermaidFence } from "./extract-mermaid-blocks";

const markdown = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false,
});

const renderFence = markdown.renderer.rules.fence?.bind(
    markdown.renderer.rules
);

markdown.renderer.rules.fence = (tokens, index, options, env, self) => {
    const token = tokens[index];

    if (!isMermaidFence(token.info)) {
        return renderFence(tokens, index, options, env, self);
    }

    const diagramSource = token.content.trim();
    const escapedSource = markdown.utils.escapeHtml(diagramSource);

    return [
        `<section class="mermaid-block" data-mermaid-source="${encodeMermaidSource(diagramSource)}" data-mermaid-state="pending">`,
        '<div class="mermaid-diagram" aria-live="polite"></div>',
        `<pre class="mermaid-source"><code>${escapedSource}</code></pre>`,
        '<div class="mermaid-error" role="alert" hidden></div>',
        "</section>",
    ].join("");
};

export function renderMarkdown(source: string) {
    return markdown.render(source);
}
