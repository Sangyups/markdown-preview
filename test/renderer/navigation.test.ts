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

    test("scrolls to top on gg", async () => {
        const { document, scrollTo, scrollBy } = await setupNavigation();

        document.dispatchEvent(createKeyboardEvent("g"));
        document.dispatchEvent(createKeyboardEvent("g"));

        expect(scrollTo).toHaveBeenCalledTimes(1);
        expect(scrollTo).toHaveBeenCalledWith({
            behavior: "auto",
            left: 0,
            top: 0,
        });
        expect(scrollBy).not.toHaveBeenCalled();
    });

    test("scrolls to bottom on G", async () => {
        const { document, scrollTo } = await setupNavigation({
            readScrollHeight: () => 5000,
        });

        document.dispatchEvent(createKeyboardEvent("G", { shiftKey: true }));

        expect(scrollTo).toHaveBeenCalledTimes(1);
        expect(scrollTo).toHaveBeenCalledWith({
            behavior: "auto",
            left: 0,
            top: 5000,
        });
    });

    test("single g times out and does not scroll on later g", async () => {
        const { document, scrollTo, fireTimer } = await setupNavigation();

        document.dispatchEvent(createKeyboardEvent("g"));
        fireTimer();
        document.dispatchEvent(createKeyboardEvent("g"));

        expect(scrollTo).not.toHaveBeenCalled();
    });

    test("g followed by unrelated key cancels pending state", async () => {
        const { document, scrollTo } = await setupNavigation();

        document.dispatchEvent(createKeyboardEvent("g"));
        document.dispatchEvent(createKeyboardEvent("x"));
        document.dispatchEvent(createKeyboardEvent("g"));

        expect(scrollTo).not.toHaveBeenCalled();
    });

    test("g followed by j scrolls one line and re-arms pending on next g", async () => {
        const { document, scrollBy, scrollTo, setTimer } =
            await setupNavigation();

        document.dispatchEvent(createKeyboardEvent("g"));
        document.dispatchEvent(createKeyboardEvent("j"));
        document.dispatchEvent(createKeyboardEvent("g"));

        expect(scrollBy).toHaveBeenCalledTimes(1);
        expect(scrollBy).toHaveBeenCalledWith({
            behavior: "auto",
            left: 0,
            top: 32,
        });
        expect(scrollTo).not.toHaveBeenCalled();
        expect(setTimer).toHaveBeenCalledTimes(2);
    });

    test("scrolls to bottom on shift+g even when caps lock inverts the case", async () => {
        const { document, scrollTo } = await setupNavigation({
            readScrollHeight: () => 5000,
        });

        document.dispatchEvent(createKeyboardEvent("g", { shiftKey: true }));

        expect(scrollTo).toHaveBeenCalledTimes(1);
        expect(scrollTo).toHaveBeenCalledWith({
            behavior: "auto",
            left: 0,
            top: 5000,
        });
    });

    test("ignores key auto-repeats for g so holding the key does not oscillate", async () => {
        const { document, scrollTo, setTimer } = await setupNavigation();

        document.dispatchEvent(createKeyboardEvent("g"));
        document.dispatchEvent(createKeyboardEvent("g", { repeat: true }));
        document.dispatchEvent(createKeyboardEvent("g", { repeat: true }));
        document.dispatchEvent(createKeyboardEvent("g", { repeat: true }));

        expect(scrollTo).not.toHaveBeenCalled();
        expect(setTimer).toHaveBeenCalledTimes(1);
    });

    test("ignores key auto-repeats for shift+g so holding the key does not thrash", async () => {
        const { document, scrollTo } = await setupNavigation({
            readScrollHeight: () => 5000,
        });

        document.dispatchEvent(createKeyboardEvent("G", { shiftKey: true }));
        document.dispatchEvent(
            createKeyboardEvent("G", { repeat: true, shiftKey: true })
        );
        document.dispatchEvent(
            createKeyboardEvent("G", { repeat: true, shiftKey: true })
        );

        expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    test("default-prevented events clear pending state", async () => {
        const { document, scrollTo } = await setupNavigation();

        document.dispatchEvent(createKeyboardEvent("g"));

        const blocked = createKeyboardEvent("x");
        blocked.preventDefault();
        document.dispatchEvent(blocked);

        document.dispatchEvent(createKeyboardEvent("g"));

        expect(scrollTo).not.toHaveBeenCalled();
    });

    test("allows j auto-repeats to keep scrolling while held", async () => {
        const { document, scrollBy } = await setupNavigation();

        document.dispatchEvent(createKeyboardEvent("j"));
        document.dispatchEvent(createKeyboardEvent("j", { repeat: true }));
        document.dispatchEvent(createKeyboardEvent("j", { repeat: true }));

        expect(scrollBy).toHaveBeenCalledTimes(3);
    });

    test("ignores g and G in typing targets", async () => {
        const { document, scrollTo } = await setupNavigation();

        document.dispatchEvent(
            createKeyboardEvent("g", { target: new FakeElement("input") })
        );
        document.dispatchEvent(
            createKeyboardEvent("g", { target: new FakeElement("input") })
        );
        document.dispatchEvent(
            createKeyboardEvent("G", {
                shiftKey: true,
                target: new FakeElement("textarea"),
            })
        );

        expect(scrollTo).not.toHaveBeenCalled();
    });
});

async function setupNavigation(
    options: {
        readViewportHeight?: () => number;
        readScrollHeight?: () => number;
    } = {}
) {
    const document = new FakeDocument();
    const scrollBy = mock(() => undefined);
    const scrollTo = mock(() => undefined);
    let pendingTimer: (() => void) | null = null;
    const setTimer = mock((callback: () => void) => {
        pendingTimer = callback;
        return 1;
    });
    const clearTimer = mock(() => {
        pendingTimer = null;
    });
    const fireTimer = () => {
        const callback = pendingTimer;
        pendingTimer = null;
        callback?.();
    };
    globalThis.document = document as unknown as Document;

    const { initializePreviewNavigation } = await import(
        "../../src/renderer/navigation"
    );

    initializePreviewNavigation({
        lineScrollDistance: 32,
        readViewportHeight: options.readViewportHeight ?? (() => 600),
        readScrollHeight: options.readScrollHeight ?? (() => 1000),
        scrollBy,
        scrollTo,
        setTimer,
        clearTimer,
    });

    return {
        clearTimer,
        document,
        fireTimer,
        scrollBy,
        scrollTo,
        setTimer,
    };
}

function createKeyboardEvent(
    key: string,
    options: {
        altKey?: boolean;
        ctrlKey?: boolean;
        metaKey?: boolean;
        repeat?: boolean;
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
        repeat: { value: options.repeat ?? false },
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
