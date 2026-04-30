import hljs from "highlight.js/lib/common";
import { load as loadToml } from "js-toml";
import MarkdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";
import { parse as parseYaml } from "yaml";

import { encodeMermaidSource, isMermaidFence } from "./extract-mermaid-blocks";

type TaskListItemMeta = {
    checked: boolean;
};

type MarkdownToken = {
    attrJoin: (name: string, value: string) => void;
    children?: MarkdownToken[];
    content: string;
    level: number;
    meta?: {
        taskListItem?: TaskListItemMeta;
        [key: string]: unknown;
    } | null;
    type: string;
};

type MarkdownRenderer = {
    renderToken: (
        tokens: MarkdownToken[],
        index: number,
        options: unknown
    ) => string;
};

type ParsedHtmlTag = {
    attributes: string;
    isClosingTag: boolean;
    isSelfClosingTag: boolean;
    tagName: string;
};

type RawHtmlState = {
    unsafeInlineTagStack: string[];
};

const rawHtmlStateKey = "__markdownPreviewRawHtmlState";

type RawHtmlEnv = {
    [rawHtmlStateKey]?: RawHtmlState;
};

type FrontmatterLanguage = "toml" | "yaml";

type FrontmatterPrimitive = boolean | number | string | null;

type FrontmatterValue =
    | FrontmatterPrimitive
    | FrontmatterValue[]
    | Record<string, FrontmatterValue>;

type ParsedFrontmatter = {
    body: string;
    content: string;
    language: FrontmatterLanguage;
};

const markdown = new MarkdownIt({
    html: true,
    highlight: highlightCode,
    linkify: true,
    typographer: false,
}).use(markdownItFootnote);

const noAttributeInlineHtmlTags = new Set([
    "b",
    "cite",
    "code",
    "del",
    "em",
    "i",
    "kbd",
    "mark",
    "q",
    "s",
    "samp",
    "small",
    "span",
    "strong",
    "sub",
    "sup",
    "summary",
    "u",
    "var",
]);
const noAttributeBlockHtmlTags = new Set([
    "blockquote",
    "caption",
    "center",
    "figcaption",
    "figure",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
    "ol",
    "p",
    "pre",
    "section",
    "table",
    "tbody",
    "tfoot",
    "thead",
    "tr",
    "ul",
]);
const tableCellHtmlTags = new Set(["td", "th"]);
const allowedInlineHtmlTags = new Set([
    "a",
    "abbr",
    "br",
    "img",
    ...noAttributeInlineHtmlTags,
]);
const allowedBlockHtmlTags = new Set([
    "details",
    "div",
    "hr",
    "p",
    ...noAttributeBlockHtmlTags,
    ...tableCellHtmlTags,
    ...allowedInlineHtmlTags,
]);

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
const renderParagraphOpen =
    markdown.renderer.rules.paragraph_open?.bind(markdown.renderer.rules) ??
    ((
        tokens: MarkdownToken[],
        index: number,
        options: unknown,
        _env: unknown,
        self: MarkdownRenderer
    ) => self.renderToken(tokens, index, options));

markdown.core.ruler.after(
    "inline",
    "task_list_items",
    (state: { tokens: MarkdownToken[] }) => {
        for (let index = 0; index < state.tokens.length; index += 1) {
            const listItemToken = state.tokens[index];

            if (listItemToken.type !== "list_item_open") {
                continue;
            }

            const inlineToken = findFirstInlineTokenInListItem(
                state.tokens,
                index
            );

            if (!inlineToken) {
                continue;
            }

            const markerMatch = inlineToken.content.match(
                /^\[([ xX])\](?:\s+|$)/
            );

            if (!markerMatch) {
                continue;
            }

            const taskListItem = {
                checked: markerMatch[1].toLowerCase() === "x",
            };

            listItemToken.attrJoin("class", "task-list-item");
            listItemToken.meta = {
                ...listItemToken.meta,
                taskListItem,
            };
            inlineToken.meta = {
                ...inlineToken.meta,
                taskListItem,
            };
            inlineToken.content = inlineToken.content.slice(
                markerMatch[0].length
            );
            stripTaskListMarkerFromChildren(inlineToken, markerMatch[0].length);
        }
    }
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

markdown.renderer.rules.html_inline = (tokens, index, options, env, self) => {
    const rawHtml = tokens[index].content;
    const parsedTag = parseHtmlTag(rawHtml);

    if (
        parsedTag?.isClosingTag &&
        shouldEscapeUnsafeInlineClosingTag(env, parsedTag.tagName)
    ) {
        return markdown.utils.escapeHtml(
            renderHtmlInline(tokens, index, options, env, self)
        );
    }

    const renderedHtml = renderAllowedRawHtml(rawHtml, allowedInlineHtmlTags);

    if (renderedHtml !== null) {
        return renderedHtml;
    }

    if (
        parsedTag &&
        shouldTrackUnsafeInlineOpeningTag(parsedTag, allowedInlineHtmlTags)
    ) {
        rememberUnsafeInlineOpeningTag(env, parsedTag.tagName);
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

markdown.renderer.rules.paragraph_open = (
    tokens: MarkdownToken[],
    index: number,
    options: unknown,
    env: unknown,
    self: MarkdownRenderer
) => {
    const renderedParagraph = renderParagraphOpen(
        tokens,
        index,
        options,
        env,
        self
    );
    const inlineToken = tokens[index + 1];
    const taskListItem =
        inlineToken?.type === "inline" ? inlineToken.meta?.taskListItem : null;

    if (!taskListItem) {
        return renderedParagraph;
    }

    return `${renderedParagraph}${renderTaskListCheckbox(taskListItem)} `;
};

export function renderMarkdown(source: string) {
    const frontmatter = extractFrontmatter(source);

    if (!frontmatter) {
        return markdown.render(source);
    }

    const renderedFrontmatter = renderFrontmatter(frontmatter);
    const body = frontmatter.body.replace(/^\r?\n/, "");

    if (body.length === 0) {
        return renderedFrontmatter;
    }

    return `${renderedFrontmatter}\n${markdown.render(body)}`;
}

function renderTaskListCheckbox(taskListItem: TaskListItemMeta) {
    const checkedAttribute = taskListItem.checked ? " checked" : "";

    return `<input class="task-list-item-checkbox" type="checkbox"${checkedAttribute} disabled>`;
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

function extractFrontmatter(source: string): ParsedFrontmatter | null {
    const matchedFrontmatter = source.match(
        /^(?:\uFEFF)?(---|\+\+\+)[\t ]*\r?\n([\s\S]*?)\r?\n\1(?:\r?\n|$)/
    );

    if (!matchedFrontmatter) {
        return null;
    }

    const [, delimiter, content] = matchedFrontmatter;

    if (!looksLikeFrontmatterContent(content, delimiter)) {
        return null;
    }

    return {
        body: source.slice(matchedFrontmatter[0].length),
        content,
        language: delimiter === "---" ? "yaml" : "toml",
    };
}

function looksLikeFrontmatterContent(
    content: string,
    delimiter: string
): boolean {
    const meaningfulLines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));

    if (meaningfulLines.length === 0) {
        return false;
    }

    if (delimiter === "---") {
        return meaningfulLines.some((line) =>
            /^[A-Za-z0-9_.-]+(?:\s*:\s*.*)?$/.test(line)
        );
    }

    return meaningfulLines.some((line) => /^[A-Za-z0-9_.-]+\s*=/.test(line));
}

function renderFrontmatter(frontmatter: ParsedFrontmatter) {
    const parsedFrontmatter = parseFrontmatterRecord(
        frontmatter.content,
        frontmatter.language
    );

    if (!parsedFrontmatter) {
        return highlightCode(frontmatter.content, frontmatter.language);
    }

    const rows = Object.entries(parsedFrontmatter)
        .map(
            ([key, value]) =>
                `<tr><th>${escapeHtmlText(key)}</th><td>${renderFrontmatterValue(value)}</td></tr>`
        )
        .join("");

    return [
        '<div class="table-scroll frontmatter-scroll">',
        '<table class="frontmatter-table">',
        `<tbody>${rows}</tbody>`,
        "</table>",
        "</div>",
    ].join("");
}

function parseFrontmatterRecord(
    content: string,
    language: FrontmatterLanguage
): Record<string, FrontmatterValue> | null {
    try {
        const parsedValue =
            language === "yaml" ? parseYaml(content) : loadToml(content);
        const normalizedValue = normalizeFrontmatterValue(parsedValue);

        return isFrontmatterRecord(normalizedValue) ? normalizedValue : null;
    } catch (error) {
        if (error instanceof Error) {
            return null;
        }

        throw error;
    }
}

function normalizeFrontmatterValue(value: unknown): FrontmatterValue | null {
    if (
        value === null ||
        typeof value === "boolean" ||
        typeof value === "number" ||
        typeof value === "string"
    ) {
        return value;
    }

    if (Array.isArray(value)) {
        const normalizedItems = value.map(normalizeFrontmatterValue);

        if (normalizedItems.some((item) => item === null)) {
            return null;
        }

        return normalizedItems;
    }

    if (isRecord(value)) {
        const normalizedEntries = Object.entries(value).map(
            ([key, entryValue]) =>
                [key, normalizeFrontmatterValue(entryValue)] as const
        );

        if (normalizedEntries.some(([, entryValue]) => entryValue === null)) {
            return null;
        }

        return Object.fromEntries(normalizedEntries) as Record<
            string,
            FrontmatterValue
        >;
    }

    return null;
}

function renderFrontmatterValue(value: FrontmatterValue): string {
    if (
        value === null ||
        typeof value === "boolean" ||
        typeof value === "number" ||
        typeof value === "string"
    ) {
        return escapeHtmlText(String(value));
    }

    if (Array.isArray(value)) {
        return renderFrontmatterList(
            value.map((item) => renderFrontmatterListItem(item))
        );
    }

    return renderFrontmatterList(
        Object.entries(value).map(
            ([key, item]) =>
                `<strong>${escapeHtmlText(key)}</strong>${renderFrontmatterNestedValue(item)}`
        )
    );
}

function renderFrontmatterList(items: string[]) {
    return `<ul class="frontmatter-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function renderFrontmatterListItem(value: FrontmatterValue): string {
    if (
        value === null ||
        typeof value === "boolean" ||
        typeof value === "number" ||
        typeof value === "string"
    ) {
        return escapeHtmlText(String(value));
    }

    return renderFrontmatterValue(value);
}

function renderFrontmatterNestedValue(value: FrontmatterValue): string {
    if (
        value === null ||
        typeof value === "boolean" ||
        typeof value === "number" ||
        typeof value === "string"
    ) {
        return `: ${escapeHtmlText(String(value))}`;
    }

    return renderFrontmatterValue(value);
}

function escapeHtmlText(value: string) {
    return markdown.utils.escapeHtml(value);
}

function isFrontmatterRecord(
    value: FrontmatterValue | null
): value is Record<string, FrontmatterValue> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
    const parsedTag = parseHtmlTag(rawTag);

    if (!parsedTag) {
        return null;
    }

    const { attributes, isClosingTag, isSelfClosingTag, tagName } = parsedTag;

    if (!allowedTags.has(tagName)) {
        return null;
    }

    if (tagName === "br") {
        if (isClosingTag || attributes.length > 0) {
            return null;
        }

        return "<br>";
    }

    if (tagName === "hr") {
        if (isClosingTag || attributes.length > 0) {
            return null;
        }

        return "<hr>";
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

    if (tagName === "a") {
        return normalizeAnchorHtmlTag(attributes);
    }

    if (tagName === "abbr") {
        return normalizeTitleOnlyHtmlTag("abbr", attributes);
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

    if (tagName === "div") {
        return normalizeDivHtmlTag(attributes);
    }

    if (tableCellHtmlTags.has(tagName)) {
        return normalizeTableCellHtmlTag(tagName, attributes);
    }

    if (
        attributes.length > 0 ||
        (!noAttributeInlineHtmlTags.has(tagName) &&
            !noAttributeBlockHtmlTags.has(tagName))
    ) {
        return null;
    }

    return `<${tagName}>`;
}

function parseHtmlTag(rawTag: string): ParsedHtmlTag | null {
    const matchedTag = rawTag.match(
        /^<\s*(\/?)\s*([A-Za-z][\w:-]*)\s*([^>]*)>$/
    );

    if (!matchedTag) {
        return null;
    }

    const [, closingSlash, rawTagName, rawAttributes] = matchedTag;
    const trimmedAttributes = rawAttributes.trim();
    const isSelfClosingTag = trimmedAttributes.endsWith("/");
    const attributes = isSelfClosingTag
        ? trimmedAttributes.slice(0, -1).trim()
        : trimmedAttributes;

    return {
        attributes,
        isClosingTag: closingSlash === "/",
        isSelfClosingTag,
        tagName: rawTagName.toLowerCase(),
    };
}

function shouldTrackUnsafeInlineOpeningTag(
    parsedTag: ParsedHtmlTag,
    allowedTags: ReadonlySet<string>
) {
    return (
        allowedTags.has(parsedTag.tagName) &&
        !parsedTag.isClosingTag &&
        !parsedTag.isSelfClosingTag &&
        parsedTag.tagName !== "br" &&
        parsedTag.tagName !== "img"
    );
}

function rememberUnsafeInlineOpeningTag(env: unknown, tagName: string) {
    const state = getRawHtmlState(env);

    if (!state) {
        return;
    }

    state.unsafeInlineTagStack.push(tagName);
}

function shouldEscapeUnsafeInlineClosingTag(env: unknown, tagName: string) {
    const state = getRawHtmlState(env);

    if (!state) {
        return false;
    }

    const unsafeTagIndex = state.unsafeInlineTagStack.lastIndexOf(tagName);

    if (unsafeTagIndex === -1) {
        return false;
    }

    state.unsafeInlineTagStack.splice(unsafeTagIndex, 1);
    return true;
}

function getRawHtmlState(env: unknown): RawHtmlState | null {
    if (!env || typeof env !== "object") {
        return null;
    }

    const rawHtmlEnv = env as RawHtmlEnv;

    rawHtmlEnv[rawHtmlStateKey] ??= {
        unsafeInlineTagStack: [],
    };

    return rawHtmlEnv[rawHtmlStateKey];
}

function normalizeAnchorHtmlTag(rawAttributes: string) {
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

        if (name === "href") {
            if (!isSafeLinkHref(value)) {
                return null;
            }

            normalizedAttributes.push(`href="${escapeHtmlAttribute(value)}"`);
            continue;
        }

        if (name === "title") {
            normalizedAttributes.push(`title="${escapeHtmlAttribute(value)}"`);
            continue;
        }

        return null;
    }

    if (!attributeNames.has("href")) {
        return null;
    }

    return `<a ${normalizedAttributes.join(" ")}>`;
}

function normalizeTitleOnlyHtmlTag(tagName: string, rawAttributes: string) {
    if (rawAttributes.length === 0) {
        return `<${tagName}>`;
    }

    const attributes = parseHtmlAttributes(rawAttributes);

    if (!attributes) {
        return null;
    }

    const attributeNames = new Set<string>();
    let title: string | null = null;

    for (const [name, value] of attributes) {
        if (attributeNames.has(name)) {
            return null;
        }

        attributeNames.add(name);

        if (name !== "title") {
            return null;
        }

        title = value;
    }

    return title === null
        ? `<${tagName}>`
        : `<${tagName} title="${escapeHtmlAttribute(title)}">`;
}

function normalizeDivHtmlTag(rawAttributes: string) {
    if (rawAttributes.length === 0) {
        return "<div>";
    }

    const attributes = parseHtmlAttributes(rawAttributes);

    if (!attributes) {
        return null;
    }

    const attributeNames = new Set<string>();
    let alignValue: string | null = null;

    for (const [name, value] of attributes) {
        if (attributeNames.has(name)) {
            return null;
        }

        attributeNames.add(name);

        if (name !== "align") {
            return null;
        }

        const normalizedValue = value.toLowerCase();

        if (!["center", "left", "right"].includes(normalizedValue)) {
            return null;
        }

        alignValue = normalizedValue;
    }

    return alignValue ? `<div align="${alignValue}">` : "<div>";
}

function normalizeTableCellHtmlTag(tagName: string, rawAttributes: string) {
    if (rawAttributes.length === 0) {
        return `<${tagName}>`;
    }

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

        if (name === "align") {
            const normalizedValue = value.toLowerCase();

            if (!["center", "left", "right"].includes(normalizedValue)) {
                return null;
            }

            normalizedAttributes.push(`align="${normalizedValue}"`);
            continue;
        }

        if (name === "colspan" || name === "rowspan") {
            if (!/^[1-9]\d*$/.test(value)) {
                return null;
            }

            normalizedAttributes.push(`${name}="${value}"`);
            continue;
        }

        return null;
    }

    return normalizedAttributes.length > 0
        ? `<${tagName} ${normalizedAttributes.join(" ")}>`
        : `<${tagName}>`;
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
    if (/^(https?:\/\/|file:\/\/)/i.test(src)) {
        return true;
    }

    if (src.length === 0 || src.startsWith("//")) {
        return false;
    }

    return !/^[A-Za-z][A-Za-z0-9+.-]*:/i.test(src);
}

function isSafeLinkHref(href: string) {
    if (href.length === 0 || href.startsWith("//")) {
        return false;
    }

    if (/^(https?:\/\/|mailto:)/i.test(href)) {
        return true;
    }

    return !/^[A-Za-z][A-Za-z0-9+.-]*:/i.test(href);
}

function findFirstInlineTokenInListItem(
    tokens: MarkdownToken[],
    listItemOpenIndex: number
) {
    const listItemLevel = tokens[listItemOpenIndex].level;

    for (let index = listItemOpenIndex + 1; index < tokens.length; index += 1) {
        const token = tokens[index];

        if (token.type === "list_item_close" && token.level === listItemLevel) {
            return null;
        }

        if (token.type === "inline" && token.level === listItemLevel + 2) {
            return token;
        }
    }

    return null;
}

function stripTaskListMarkerFromChildren(
    inlineToken: MarkdownToken,
    markerLength: number
) {
    let remainingLength = markerLength;

    for (const child of inlineToken.children ?? []) {
        if (remainingLength === 0) {
            break;
        }

        if (child.type !== "text") {
            break;
        }

        if (child.content.length <= remainingLength) {
            remainingLength -= child.content.length;
            child.content = "";
            continue;
        }

        child.content = child.content.slice(remainingLength);
        remainingLength = 0;
    }

    inlineToken.children = inlineToken.children?.filter(
        (child) => child.type !== "text" || child.content.length > 0
    );
}

function escapeHtmlAttribute(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
