interface PreviewSearchController {
    refresh: () => void;
}

interface PreviewSearchResult {
    activeMatchOrdinal: number;
    matches: number;
}

interface PreviewSearchHighlighter {
    clear: () => void;
    move: (forward: boolean) => PreviewSearchResult;
    search: (query: string) => PreviewSearchResult;
}

type SearchScheduler = (callback: () => void) => () => void;

interface PreviewSearchOptions {
    highlighter?: PreviewSearchHighlighter;
    scheduleSearch?: SearchScheduler;
}

interface PreviewSearchElements {
    closeButton: HTMLElement;
    count: HTMLElement;
    input: HTMLInputElement;
    nextButton: HTMLElement;
    panel: HTMLElement;
    preview: HTMLElement;
    previousButton: HTMLElement;
}

export function initializePreviewSearch(
    options: PreviewSearchOptions = {}
): PreviewSearchController {
    const elements = readPreviewSearchElements();
    const highlighter =
        options.highlighter ??
        createDomPreviewSearchHighlighter(elements.preview);
    const scheduleSearch = options.scheduleSearch ?? scheduleSearchWithDelay;
    const pendingSearch = createPendingPreviewSearch(
        (query) => runSearch(query, highlighter, elements),
        scheduleSearch
    );

    resetFindCount(elements.count);

    document.addEventListener("keydown", (event) => {
        if (isFindShortcut(event)) {
            event.preventDefault();
            openSearchPanel(elements);
            return;
        }

        if (event.key === "Escape" && !elements.panel.hidden) {
            event.preventDefault();
            pendingSearch.cancel();
            closeSearchPanel(elements, highlighter);
        }
    });

    elements.input.addEventListener("input", () => {
        const query = elements.input.value;

        if (query.length === 0) {
            pendingSearch.cancel();
            clearSearch(highlighter, elements);
            return;
        }

        pendingSearch.schedule(query);
        preserveSearchFocus(elements);
    });

    elements.input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") {
            return;
        }

        event.preventDefault();
        pendingSearch.flush();
        moveSearch(!event.shiftKey, highlighter, elements);
    });

    elements.previousButton.addEventListener("click", () => {
        pendingSearch.flush();
        moveSearch(false, highlighter, elements);
    });

    elements.nextButton.addEventListener("click", () => {
        pendingSearch.flush();
        moveSearch(true, highlighter, elements);
    });

    elements.closeButton.addEventListener("click", () => {
        pendingSearch.cancel();
        closeSearchPanel(elements, highlighter);
    });

    return {
        refresh: () => {
            if (hasActiveSearchQuery(elements)) {
                pendingSearch.schedule(elements.input.value);
            }
        },
    };
}

interface PendingSearch {
    cancel: () => void;
    id: number;
    query: string;
}

function readPreviewSearchElements(): PreviewSearchElements {
    return {
        closeButton: getRequiredSearchElement("search-close"),
        count: getRequiredSearchElement("search-count"),
        input: getRequiredSearchElement("search-input") as HTMLInputElement,
        nextButton: getRequiredSearchElement("search-next"),
        panel: getRequiredSearchElement("search-panel"),
        preview: getRequiredSearchElement("preview"),
        previousButton: getRequiredSearchElement("search-previous"),
    };
}

function getRequiredSearchElement(elementId: string) {
    const element = document.getElementById(elementId);

    if (!element) {
        throw new Error("Search DOM is not ready.");
    }

    return element;
}

function createPendingPreviewSearch(
    runSearch: (query: string) => void,
    scheduleSearch: SearchScheduler
) {
    let pendingSearch: PendingSearch | null = null;
    let nextPendingSearchId = 0;

    function schedule(query: string) {
        cancel();

        const nextSearch: PendingSearch = {
            cancel: () => undefined,
            id: nextPendingSearchId + 1,
            query,
        };

        nextPendingSearchId = nextSearch.id;
        pendingSearch = nextSearch;
        nextSearch.cancel = scheduleSearch(() => {
            runPendingSearch(nextSearch);
        });
    }

    function cancel() {
        if (!pendingSearch) {
            return;
        }

        pendingSearch.cancel();
        pendingSearch = null;
    }

    function flush() {
        const search = pendingSearch;

        if (!search) {
            return;
        }

        search.cancel();
        runPendingSearch(search);
    }

    function runPendingSearch(search: PendingSearch) {
        if (pendingSearch?.id !== search.id) {
            return;
        }

        pendingSearch = null;
        runSearch(search.query);
    }

    return {
        cancel,
        flush,
        schedule,
    };
}

function scheduleSearchWithDelay(callback: () => void) {
    const timer = window.setTimeout(callback, 50);

    return () => {
        window.clearTimeout(timer);
    };
}

function openSearchPanel({ input, panel }: PreviewSearchElements) {
    panel.hidden = false;
    input.focus();
    input.select();
}

function closeSearchPanel(
    { count, panel }: PreviewSearchElements,
    highlighter: PreviewSearchHighlighter
) {
    panel.hidden = true;
    highlighter.clear();
    resetFindCount(count);
}

function clearSearch(
    highlighter: PreviewSearchHighlighter,
    elements: PreviewSearchElements
) {
    highlighter.clear();
    resetFindCount(elements.count);
    preserveSearchFocus(elements);
}

function runSearch(
    query: string,
    highlighter: PreviewSearchHighlighter,
    elements: PreviewSearchElements
) {
    if (query.length === 0) {
        clearSearch(highlighter, elements);
        return;
    }

    updateFindCount(elements.count, highlighter.search(query));
    preserveSearchFocus(elements);
}

function moveSearch(
    forward: boolean,
    highlighter: PreviewSearchHighlighter,
    elements: PreviewSearchElements
) {
    updateFindCount(elements.count, highlighter.move(forward));
    preserveSearchFocus(elements);
}

function resetFindCount(count: HTMLElement) {
    count.textContent = formatFindCount(0, 0);
}

function updateFindCount(count: HTMLElement, result: PreviewSearchResult) {
    count.textContent = formatFindCount(
        result.activeMatchOrdinal,
        result.matches
    );
}

function formatFindCount(activeMatchOrdinal: number, matches: number) {
    return `${activeMatchOrdinal}/${matches}`;
}

function preserveSearchFocus({ input, panel }: PreviewSearchElements) {
    if (!panel.hidden) {
        input.focus();
    }
}

function hasActiveSearchQuery({ input, panel }: PreviewSearchElements) {
    return !panel.hidden && input.value.length > 0;
}

function isFindShortcut(event: KeyboardEvent) {
    return (
        event.key.toLowerCase() === "f" &&
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey
    );
}

function createDomPreviewSearchHighlighter(
    preview: HTMLElement
): PreviewSearchHighlighter {
    let matches: HTMLElement[] = [];
    let activeMatchIndex = -1;

    function clearMatches() {
        const parents = new Set<Node>();

        for (const match of matches) {
            const parent = match.parentNode;

            if (!parent) {
                continue;
            }

            parents.add(parent);
            parent.replaceChild(
                document.createTextNode(match.textContent ?? ""),
                match
            );
        }

        for (const parent of parents) {
            parent.normalize();
        }

        matches = [];
        activeMatchIndex = -1;
    }

    function activateCurrentMatch() {
        activateMatch(matches, activeMatchIndex);
    }

    function currentSearchResult() {
        return createSearchResult(activeMatchIndex, matches.length);
    }

    return {
        clear: clearMatches,
        move: (forward: boolean) => {
            if (matches.length === 0) {
                return createSearchResult(-1, 0);
            }

            activeMatchIndex = normalizeMatchIndex(
                activeMatchIndex + (forward ? 1 : -1),
                matches.length
            );
            activateCurrentMatch();

            return currentSearchResult();
        },
        search: (query: string) => {
            clearMatches();
            matches = findAndMarkMatches(preview, query);
            activeMatchIndex = getInitialActiveMatchIndex(matches);
            activateCurrentMatch();

            return currentSearchResult();
        },
    };
}

function createSearchResult(
    activeMatchIndex: number,
    matches: number
): PreviewSearchResult {
    return {
        activeMatchOrdinal: activeMatchIndex + 1,
        matches,
    };
}

function getInitialActiveMatchIndex(matches: HTMLElement[]) {
    return matches.length > 0 ? 0 : -1;
}

function findAndMarkMatches(preview: HTMLElement, query: string) {
    const textNodes = collectSearchableTextNodes(preview);
    const nextMatches: HTMLElement[] = [];
    const queryLength = query.length;
    const normalizedQuery = normalizeSearchText(query);

    if (queryLength === 0) {
        return nextMatches;
    }

    for (const textNode of textNodes) {
        const sourceText = textNode.textContent ?? "";
        const matchIndexes = findMatchIndexes(
            sourceText,
            normalizedQuery,
            queryLength
        );

        if (matchIndexes.length > 0) {
            nextMatches.push(
                ...replaceTextNodeWithMatches(
                    textNode,
                    matchIndexes,
                    queryLength
                )
            );
        }
    }

    return nextMatches;
}

function findMatchIndexes(
    sourceText: string,
    normalizedQuery: string,
    queryLength: number
) {
    const normalizedSourceText = normalizeSearchText(sourceText);
    const matchIndexes: number[] = [];
    let searchFromIndex = 0;

    while (searchFromIndex < sourceText.length) {
        const matchIndex = normalizedSourceText.indexOf(
            normalizedQuery,
            searchFromIndex
        );

        if (matchIndex === -1) {
            break;
        }

        matchIndexes.push(matchIndex);
        searchFromIndex = matchIndex + queryLength;
    }

    return matchIndexes;
}

function normalizeSearchText(text: string) {
    return text.toLowerCase();
}

function collectSearchableTextNodes(root: HTMLElement) {
    const textNodes: Text[] = [];
    const visibilityCache = new WeakMap<Element, boolean>();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();

    while (currentNode) {
        if (isSearchableTextNode(currentNode, visibilityCache)) {
            textNodes.push(currentNode);
        }

        currentNode = walker.nextNode();
    }

    return textNodes;
}

function isSearchableTextNode(
    node: Node,
    visibilityCache: WeakMap<Element, boolean>
): node is Text {
    const parent = node.parentElement;

    if (!parent || !node.textContent) {
        return false;
    }

    return isElementSearchableForPreviewFind(
        parent,
        getComputedStyle,
        visibilityCache
    );
}

type SearchStyleReader = (
    element: Element
) => Pick<CSSStyleDeclaration, "display" | "visibility">;

const ignoredSearchTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

export function isElementSearchableForPreviewFind(
    element: Element,
    readStyle: SearchStyleReader = getComputedStyle,
    visibilityCache = new WeakMap<Element, boolean>()
): boolean {
    const cachedVisibility = visibilityCache.get(element);

    if (cachedVisibility !== undefined) {
        return cachedVisibility;
    }

    const isSearchable =
        isElementSelfSearchableForPreviewFind(element, readStyle) &&
        (!element.parentElement ||
            isElementSearchableForPreviewFind(
                element.parentElement,
                readStyle,
                visibilityCache
            ));

    visibilityCache.set(element, isSearchable);

    return isSearchable;
}

function isElementSelfSearchableForPreviewFind(
    element: Element,
    readStyle: SearchStyleReader
) {
    if (ignoredSearchTags.has(element.tagName)) {
        return false;
    }

    if ("hidden" in element && Boolean(element.hidden)) {
        return false;
    }

    if (element.getAttribute("aria-hidden") === "true") {
        return false;
    }

    const style = readStyle(element);

    return style.display !== "none" && !isHiddenVisibility(style.visibility);
}

function isHiddenVisibility(visibility: string) {
    return visibility === "hidden" || visibility === "collapse";
}

function replaceTextNodeWithMatches(
    textNode: Text,
    matchIndexes: number[],
    queryLength: number
) {
    const sourceText = textNode.textContent ?? "";
    const fragment = document.createDocumentFragment();
    const matches: HTMLElement[] = [];
    let copiedUntilIndex = 0;

    for (const matchIndex of matchIndexes) {
        if (matchIndex > copiedUntilIndex) {
            fragment.append(
                document.createTextNode(
                    sourceText.slice(copiedUntilIndex, matchIndex)
                )
            );
        }

        const mark = document.createElement("mark");
        mark.className = "search-match";
        mark.textContent = sourceText.slice(
            matchIndex,
            matchIndex + queryLength
        );
        fragment.append(mark);
        matches.push(mark);
        copiedUntilIndex = matchIndex + queryLength;
    }

    if (copiedUntilIndex < sourceText.length) {
        fragment.append(
            document.createTextNode(sourceText.slice(copiedUntilIndex))
        );
    }

    textNode.parentNode?.replaceChild(fragment, textNode);

    return matches;
}

function activateMatch(matches: HTMLElement[], activeMatchIndex: number) {
    for (const match of matches) {
        match.classList.remove("search-match-active");
    }

    const activeMatch = matches[activeMatchIndex];

    if (!activeMatch) {
        return;
    }

    activeMatch.classList.add("search-match-active");
    activeMatch.scrollIntoView({
        block: "center",
        inline: "nearest",
    });
}

function normalizeMatchIndex(matchIndex: number, matches: number) {
    return ((matchIndex % matches) + matches) % matches;
}
