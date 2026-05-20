import { afterEach, describe, expect, mock, test } from "bun:test";

const originalDocument = globalThis.document;

afterEach(() => {
    globalThis.document = originalDocument;
    mock.restore();
});

describe("initializePreviewNavigation", () => {
    test("scrolls with vim-style navigation keys", async () => {
        const { document, scrollBy } = await setupNavigation();

        document.dispatchEvent(createKeyboardEvent("j"));
        document.dispatchEvent(createKeyboardEvent("k"));
        document.dispatchEvent(createKeyboardEvent("d", { ctrlKey: true }));
        document.dispatchEvent(createKeyboardEvent("u", { ctrlKey: true }));

        expect(scrollBy).toHaveBeenNthCalledWith(1, {
            behavior: "auto",
            left: 0,
            top: 32,
        });
        expect(scrollBy).toHaveBeenNthCalledWith(2, {
            behavior: "auto",
            left: 0,
            top: -32,
        });
        expect(scrollBy).toHaveBeenNthCalledWith(3, {
            behavior: "auto",
            left: 0,
            top: 300,
        });
        expect(scrollBy).toHaveBeenNthCalledWith(4, {
            behavior: "auto",
            left: 0,
            top: -300,
        });
    });

    test("does not hijack typing targets or modified letter keys", async () => {
        const { document, scrollBy } = await setupNavigation();

        document.dispatchEvent(
            createKeyboardEvent("j", {
                target: new FakeElement("input"),
            })
        );
        document.dispatchEvent(createKeyboardEvent("j", { metaKey: true }));
        document.dispatchEvent(createKeyboardEvent("k", { shiftKey: true }));
        document.dispatchEvent(createKeyboardEvent("d"));
        document.dispatchEvent(createKeyboardEvent("u"));

        expect(scrollBy).not.toHaveBeenCalled();
    });

    test("skips target and viewport checks for unrelated keys", async () => {
        const readViewportHeight = mock(() => 600);
        const target = new FakeElement("input");
        const { document, scrollBy } = await setupNavigation({
            readViewportHeight,
        });

        document.dispatchEvent(createKeyboardEvent("x", { target }));

        expect(target.closest).not.toHaveBeenCalled();
        expect(readViewportHeight).not.toHaveBeenCalled();
        expect(scrollBy).not.toHaveBeenCalled();
    });
});

async function setupNavigation(
    options: { readViewportHeight?: () => number } = {}
) {
    const document = new FakeDocument();
    const scrollBy = mock(() => undefined);
    globalThis.document = document as unknown as Document;

    const { initializePreviewNavigation } = await import(
        "../../src/renderer/navigation"
    );

    initializePreviewNavigation({
        lineScrollDistance: 32,
        readViewportHeight: options.readViewportHeight ?? (() => 600),
        scrollBy,
    });

    return {
        document,
        scrollBy,
    };
}

function createKeyboardEvent(
    key: string,
    options: {
        altKey?: boolean;
        ctrlKey?: boolean;
        metaKey?: boolean;
        shiftKey?: boolean;
        target?: EventTarget;
    } = {}
) {
    const event = new Event("keydown", {
        cancelable: true,
    }) as KeyboardEvent;

    Object.defineProperties(event, {
        altKey: { value: options.altKey ?? false },
        ctrlKey: { value: options.ctrlKey ?? false },
        key: { value: key },
        metaKey: { value: options.metaKey ?? false },
        shiftKey: { value: options.shiftKey ?? false },
        target: { value: options.target ?? null },
    });

    return event;
}

class FakeDocument extends EventTarget {}

class FakeElement extends EventTarget {
    closest = mock((selector: string) =>
        selector.includes(this.tagName.toLowerCase()) ? this : null
    );

    constructor(readonly tagName: string) {
        super();
    }
}
