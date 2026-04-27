import hljs from "highlight.js/lib/common";
import MarkdownIt from "markdown-it";

import { encodeMermaidSource, isMermaidFence } from "./extract-mermaid-blocks";

const markdown = new MarkdownIt({
    html: true,
    highlight: highlightCode,
    linkify: true,
    typographer: false,
});

const allowedInlineHtmlTags = new Set([
    "br",
    "img",
    "kbd",
    "sub",
    "sup",
    "summary",
]);
const allowedBlockHtmlTags = new Set(["details", ...allowedInlineHtmlTags]);

const renderFence = markdown.renderer.rules.fence?.bind(
    markdown.renderer.rules
);
const renderHtmlInline =
    markdown.renderer.rules.html_inline?.bind(markdown.renderer.rules) ??
    ((tokens, index) => tokens[index].content);
const renderHtmlBlock =
    markdown.renderer.rules.html_block?.bind(markdown.renderer.rules) ??
    ((tokens, index) => tokens[index].content);
const renderTableOpen =
    markdown.renderer.rules.table_open?.bind(markdown.renderer.rules) ??
    ((tokens, index, options, _env, self) =>
        self.renderToken(tokens, index, options));
const renderTableClose =
    markdown.renderer.rules.table_close?.bind(markdown.renderer.rules) ??
    ((tokens, index, options, _env, self) =>
        self.renderToken(tokens, index, options));

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

markdown.renderer.rules.html_inline = (tokens, index, options, env, self) => {
    const renderedHtml = renderAllowedRawHtml(
        tokens[index].content,
        allowedInlineHtmlTags
    );

    if (renderedHtml !== null) {
        return renderedHtml;
    }

    return markdown.utils.escapeHtml(
        renderHtmlInline(tokens, index, options, env, self)
    );
};

markdown.renderer.rules.html_block = (tokens, index, options, env, self) => {
    const renderedHtml = renderAllowedRawHtml(
        tokens[index].content,
        allowedBlockHtmlTags
    );

    if (renderedHtml !== null) {
        return renderedHtml;
    }

    const escapedHtml = markdown.utils.escapeHtml(
        renderHtmlBlock(tokens, index, options, env, self)
    );

    return `<p>${escapedHtml}</p>\n`;
};

markdown.renderer.rules.table_open = (tokens, index, options, env, self) =>
    `<div class="table-scroll">${renderTableOpen(
        tokens,
        index,
        options,
        env,
        self
    )}`;

markdown.renderer.rules.table_close = (tokens, index, options, env, self) =>
    `${renderTableClose(tokens, index, options, env, self)}</div>`;

export function renderMarkdown(source: string) {
    return markdown.render(source);
}

function highlightCode(source: string, language: string) {
    const normalizedLanguage = language.trim();
    const highlightedCode =
        normalizedLanguage && hljs.getLanguage(normalizedLanguage)
            ? hljs.highlight(source, {
                  ignoreIllegals: true,
                  language: normalizedLanguage,
              }).value
            : markdown.utils.escapeHtml(source);
    const languageClass = normalizedLanguage
        ? ` language-${escapeHtmlAttribute(normalizedLanguage)}`
        : "";

    return `<pre><code class="hljs${languageClass}">${highlightedCode}</code></pre>`;
}

function renderAllowedRawHtml(
    rawHtml: string,
    allowedTags: ReadonlySet<string>
) {
    const htmlTagPattern = /<\/?[A-Za-z][^>]*>/g;
    let cursor = 0;
    let renderedHtml = "";

    for (const match of rawHtml.matchAll(htmlTagPattern)) {
        const matchedTag = match[0];
        const matchIndex = match.index ?? 0;
        const textSegment = rawHtml.slice(cursor, matchIndex);

        if (/[<>]/.test(textSegment)) {
            return null;
        }

        renderedHtml += textSegment;

        const normalizedTag = normalizeAllowedHtmlTag(matchedTag, allowedTags);

        if (!normalizedTag) {
            return null;
        }

        renderedHtml += normalizedTag;
        cursor = matchIndex + matchedTag.length;
    }

    const trailingText = rawHtml.slice(cursor);

    if (/[<>]/.test(trailingText)) {
        return null;
    }

    renderedHtml += trailingText;

    return renderedHtml;
}

function normalizeAllowedHtmlTag(
    rawTag: string,
    allowedTags: ReadonlySet<string>
) {
    const matchedTag = rawTag.match(
        /^<\s*(\/?)\s*([A-Za-z][\w:-]*)\s*([^>]*)>$/
    );

    if (!matchedTag) {
        return null;
    }

    const [, closingSlash, rawTagName, rawAttributes] = matchedTag;
    const tagName = rawTagName.toLowerCase();
    const isClosingTag = closingSlash === "/";
    const trimmedAttributes = rawAttributes.trim();
    const isSelfClosingTag = trimmedAttributes.endsWith("/");
    const attributes = isSelfClosingTag
        ? trimmedAttributes.slice(0, -1).trim()
        : trimmedAttributes;

    if (!allowedTags.has(tagName)) {
        return null;
    }

    if (tagName === "br") {
        if (isClosingTag || attributes.length > 0) {
            return null;
        }

        return "<br>";
    }

    if (tagName === "img") {
        if (isClosingTag) {
            return null;
        }

        return normalizeImageHtmlTag(attributes);
    }

    if (isSelfClosingTag) {
        return null;
    }

    if (isClosingTag) {
        if (attributes.length > 0) {
            return null;
        }

        return `</${tagName}>`;
    }

    if (tagName === "details") {
        if (attributes.length === 0) {
            return "<details>";
        }

        if (attributes === "open") {
            return "<details open>";
        }

        return null;
    }

    if (attributes.length > 0) {
        return null;
    }

    return `<${tagName}>`;
}

function normalizeImageHtmlTag(rawAttributes: string) {
    const attributes = parseHtmlAttributes(rawAttributes);

    if (!attributes) {
        return null;
    }

    const normalizedAttributes: string[] = [];
    const attributeNames = new Set<string>();

    for (const [name, value] of attributes) {
        if (attributeNames.has(name)) {
            return null;
        }

        attributeNames.add(name);

        if (name === "src") {
            if (!isSafeImageSource(value)) {
                return null;
            }

            normalizedAttributes.push(`src="${escapeHtmlAttribute(value)}"`);
            continue;
        }

        if (name === "alt" || name === "title") {
            normalizedAttributes.push(
                `${name}="${escapeHtmlAttribute(value)}"`
            );
            continue;
        }

        if (name === "width" || name === "height") {
            if (!/^\d+$/.test(value)) {
                return null;
            }

            normalizedAttributes.push(`${name}="${value}"`);
            continue;
        }

        return null;
    }

    if (!attributeNames.has("src")) {
        return null;
    }

    return normalizedAttributes.length > 0
        ? `<img ${normalizedAttributes.join(" ")}>`
        : "<img>";
}

function parseHtmlAttributes(rawAttributes: string) {
    const attributes: Array<[string, string]> = [];
    const attributePattern =
        /\s*([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gy;
    let cursor = 0;

    while (cursor < rawAttributes.length) {
        const trailingWhitespaceLength =
            rawAttributes.slice(cursor).match(/^\s+/)?.[0].length ?? 0;
        cursor += trailingWhitespaceLength;

        if (cursor === rawAttributes.length) {
            break;
        }

        attributePattern.lastIndex = cursor;

        const matchedAttribute = attributePattern.exec(rawAttributes);

        if (!matchedAttribute) {
            return null;
        }

        const attributeName = matchedAttribute[1]?.toLowerCase();
        const attributeValue =
            matchedAttribute[2] ?? matchedAttribute[3] ?? matchedAttribute[4];

        if (!attributeName || attributeValue === undefined) {
            return null;
        }

        attributes.push([attributeName, attributeValue]);
        cursor = attributePattern.lastIndex;
    }

    return attributes;
}

function isSafeImageSource(src: string) {
    return /^(https?:\/\/|file:\/\/)/i.test(src);
}

function escapeHtmlAttribute(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
