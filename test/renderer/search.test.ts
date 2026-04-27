import { afterEach, describe, expect, mock, test } from "bun:test";

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;

afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    mock.restore();
});

describe("initializePreviewSearch", () => {
    test("opens the search panel and searches only preview content when the query changes", async () => {
        const { document, elements, highlighter } = createSearchHarness({
            searchResult: {
                activeMatchOrdinal: 0,
                matches: 0,
            },
        });
        globalThis.document = document as unknown as Document;
        globalThis.window = {} as Window & typeof globalThis;

        const { initializePreviewSearch } = await import(
            "../../src/renderer/search"
        );

        initializePreviewSearch({
            highlighter,
            scheduleSearch: runSearchImmediately,
        });

        const shortcutEvent = createKeyboardEvent("f", { metaKey: true });

        document.dispatchEvent(shortcutEvent);

        expect(shortcutEvent.defaultPrevented).toBe(true);
        expect(elements.panel.hidden).toBe(false);
        expect(elements.input.focused).toBe(true);
        expect(elements.input.selected).toBe(true);

        elements.input.value = "markdown";
        elements.input.focused = false;
        elements.input.dispatchEvent(new Event("input"));

        await Promise.resolve();

        expect(highlighter.search).toHaveBeenCalledWith("markdown");
        expect(elements.count.textContent).toBe("0/0");
        expect(elements.input.focused).toBe(true);
    });

    test("moves between matches with Enter, Shift+Enter, and navigation buttons", async () => {
        const { document, elements, highlighter } = createSearchHarness();
        globalThis.document = document as unknown as Document;
        globalThis.window = {} as Window & typeof globalThis;

        const { initializePreviewSearch } = await import(
            "../../src/renderer/search"
        );

        initializePreviewSearch({
            highlighter,
            scheduleSearch: runSearchImmediately,
        });

        document.dispatchEvent(createKeyboardEvent("f", { metaKey: true }));
        elements.input.value = "markdown";

        elements.input.dispatchEvent(createKeyboardEvent("Enter"));
        elements.input.dispatchEvent(
            createKeyboardEvent("Enter", { shiftKey: true })
        );
        elements.nextButton.dispatchEvent(new Event("click"));
        elements.previousButton.dispatchEvent(new Event("click"));

        await Promise.resolve();

        expect(highlighter.move).toHaveBeenNthCalledWith(1, true);
        expect(highlighter.move).toHaveBeenNthCalledWith(2, false);
        expect(highlighter.move).toHaveBeenNthCalledWith(3, true);
        expect(highlighter.move).toHaveBeenNthCalledWith(4, false);
    });

    test("updates the match count and closes with Escape", async () => {
        const { document, elements, highlighter } = createSearchHarness({
            searchResult: {
                activeMatchOrdinal: 2,
                matches: 5,
            },
        });
        globalThis.document = document as unknown as Document;
        globalThis.window = {} as Window & typeof globalThis;

        const { initializePreviewSearch } = await import(
            "../../src/renderer/search"
        );

        initializePreviewSearch({
            highlighter,
            scheduleSearch: runSearchImmediately,
        });

        document.dispatchEvent(createKeyboardEvent("f", { metaKey: true }));
        elements.input.value = "markdown";
        elements.input.dispatchEvent(new Event("input"));

        expect(elements.count.textContent).toBe("2/5");

        elements.input.value = "";
        elements.input.focused = false;
        elements.input.dispatchEvent(new Event("input"));

        await Promise.resolve();

        expect(elements.count.textContent).toBe("0/0");
        expect(highlighter.clear).toHaveBeenCalledTimes(1);
        expect(elements.input.focused).toBe(true);

        document.dispatchEvent(createKeyboardEvent("Escape"));

        expect(elements.panel.hidden).toBe(true);
        expect(highlighter.clear).toHaveBeenCalledTimes(2);
        expect(elements.count.textContent).toBe("0/0");
    });

    test("refreshes the active search after preview content changes", async () => {
        const { document, elements, highlighter } = createSearchHarness();
        globalThis.document = document as unknown as Document;
        globalThis.window = {} as Window & typeof globalThis;

        const { initializePreviewSearch } = await import(
            "../../src/renderer/search"
        );

        const controller = initializePreviewSearch({
            highlighter,
            scheduleSearch: runSearchImmediately,
        });

        document.dispatchEvent(createKeyboardEvent("f", { metaKey: true }));
        elements.input.value = "markdown";

        controller.refresh();

        await Promise.resolve();

        expect(highlighter.search).toHaveBeenCalledWith("markdown");
    });

    test("coalesces typing into the latest pending search", async () => {
        const { document, elements, highlighter } = createSearchHarness();
        const scheduledSearches: Array<{
            callback: () => void;
            canceled: boolean;
        }> = [];
        const scheduleSearch = mock((callback: () => void) => {
            const scheduledSearch = {
                callback,
                canceled: false,
            };
            scheduledSearches.push(scheduledSearch);

            return () => {
                scheduledSearch.canceled = true;
            };
        });
        globalThis.document = document as unknown as Document;
        globalThis.window = {} as Window & typeof globalThis;

        const { initializePreviewSearch } = await import(
            "../../src/renderer/search"
        );

        initializePreviewSearch({ highlighter, scheduleSearch });

        document.dispatchEvent(createKeyboardEvent("f", { metaKey: true }));

        elements.input.value = "m";
        elements.input.dispatchEvent(new Event("input"));
        elements.input.value = "ma";
        elements.input.dispatchEvent(new Event("input"));
        elements.input.value = "markdown";
        elements.input.dispatchEvent(new Event("input"));

        expect(scheduleSearch).toHaveBeenCalledTimes(3);
        expect(highlighter.search).not.toHaveBeenCalled();

        for (const scheduledSearch of scheduledSearches) {
            if (!scheduledSearch.canceled) {
                scheduledSearch.callback();
            }
        }

        expect(highlighter.search).toHaveBeenCalledTimes(1);
        expect(highlighter.search).toHaveBeenCalledWith("markdown");
    });
});

describe("isElementSearchableForPreviewFind", () => {
    test("excludes text hidden by ancestors from preview search results", async () => {
        const { isElementSearchableForPreviewFind } = await import(
            "../../src/renderer/search"
        );
        const visibleParent = createSearchElement("P");
        const hiddenParent = createSearchElement("PRE", visibleParent, {
            display: "none",
        });
        const hiddenChild = createSearchElement("CODE", hiddenParent);

        expect(
            isElementSearchableForPreviewFind(hiddenChild, readFakeStyle)
        ).toBe(false);
    });

    test("excludes script and style text from preview search results", async () => {
        const { isElementSearchableForPreviewFind } = await import(
            "../../src/renderer/search"
        );

        expect(
            isElementSearchableForPreviewFind(
                createSearchElement("SCRIPT"),
                readFakeStyle
            )
        ).toBe(false);
        expect(
            isElementSearchableForPreviewFind(
                createSearchElement("STYLE"),
                readFakeStyle
            )
        ).toBe(false);
    });
});

function createSearchHarness(
    options: {
        searchResult?: {
            activeMatchOrdinal: number;
            matches: number;
        };
    } = {}
) {
    const defaultSearchResult = {
        activeMatchOrdinal: 1,
        matches: 3,
    };
    const highlighter = {
        clear: mock(() => undefined),
        move: mock(() => defaultSearchResult),
        search: mock(() => options.searchResult ?? defaultSearchResult),
    };

    const elements = {
        closeButton: new FakeElement("search-close"),
        count: new FakeElement("search-count"),
        input: new FakeInputElement("search-input"),
        nextButton: new FakeElement("search-next"),
        panel: new FakeElement("search-panel"),
        preview: new FakeElement("preview"),
        previousButton: new FakeElement("search-previous"),
    };
    elements.panel.hidden = true;

    const document = new FakeDocument({
        "search-close": elements.closeButton,
        "search-count": elements.count,
        "search-input": elements.input,
        "search-next": elements.nextButton,
        "search-panel": elements.panel,
        "search-previous": elements.previousButton,
        preview: elements.preview,
    });

    return {
        document,
        elements,
        highlighter,
    };
}

function createKeyboardEvent(
    key: string,
    options: {
        ctrlKey?: boolean;
        metaKey?: boolean;
        shiftKey?: boolean;
    } = {}
) {
    const event = new Event("keydown", {
        cancelable: true,
    }) as KeyboardEvent;

    Object.defineProperties(event, {
        ctrlKey: { value: options.ctrlKey ?? false },
        key: { value: key },
        metaKey: { value: options.metaKey ?? false },
        shiftKey: { value: options.shiftKey ?? false },
    });

    return event;
}

function runSearchImmediately(callback: () => void) {
    callback();

    return () => undefined;
}

class FakeDocument extends EventTarget {
    constructor(private readonly elements: Record<string, FakeElement>) {
        super();
    }

    getElementById(elementId: string) {
        return this.elements[elementId] ?? null;
    }
}

class FakeElement extends EventTarget {
    dataset: Record<string, string> = {};
    hidden = false;
    textContent = "";

    constructor(readonly id: string) {
        super();
    }

    focus() {
        // Buttons share the element shape but tests only inspect input focus.
    }
}

class FakeInputElement extends FakeElement {
    focused = false;
    selected = false;
    value = "";

    override focus() {
        this.focused = true;
    }

    select() {
        this.selected = true;
    }
}

function createSearchElement(
    tagName: string,
    parentElement: SearchTestElement | null = null,
    style: {
        display?: string;
        visibility?: string;
    } = {}
) {
    return {
        getAttribute: () => null,
        hidden: false,
        parentElement,
        style,
        tagName,
    } as unknown as SearchTestElement;
}

interface SearchTestElement extends Element {
    style: {
        display?: string;
        visibility?: string;
    };
}

function readFakeStyle(element: Element) {
    const searchElement = element as SearchTestElement;

    return {
        display: searchElement.style.display ?? "block",
        visibility: searchElement.style.visibility ?? "visible",
    } as CSSStyleDeclaration;
}
