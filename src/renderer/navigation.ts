export interface PreviewNavigationOptions {
    lineScrollDistance?: number;
    pendingTimeoutMs?: number;
    readViewportHeight?: () => number;
    readScrollHeight?: () => number;
    scrollBy?: (options: ScrollToOptions) => void;
    scrollTo?: (options: ScrollToOptions) => void;
    setTimer?: (callback: () => void, ms: number) => unknown;
    clearTimer?: (handle: unknown) => void;
}

const DEFAULT_LINE_SCROLL_DISTANCE = 48;
const DEFAULT_PENDING_TIMEOUT_MS = 1000;
const PAGE_SCROLL_RATIO = 0.5;
const TYPING_TARGET_SELECTOR =
    "input, textarea, select, button, [contenteditable='true']";
const TYPING_TARGET_TAGS = new Set(["button", "input", "select", "textarea"]);

type ScrollDirection = -1 | 1;
type DocumentEdge = "top" | "bottom";

type NavigationShortcut =
    | { kind: "line" | "page"; direction: ScrollDirection }
    | { kind: "pending-g" }
    | { kind: "edge"; edge: DocumentEdge };

const LINE_SCROLL_DIRECTIONS: Record<string, ScrollDirection> = {
    j: 1,
    k: -1,
};

const PAGE_SCROLL_DIRECTIONS: Record<string, ScrollDirection> = {
    d: 1,
    u: -1,
};

export function initializePreviewNavigation(
    options: PreviewNavigationOptions = {}
) {
    const lineScrollDistance =
        options.lineScrollDistance ?? DEFAULT_LINE_SCROLL_DISTANCE;
    const pendingTimeoutMs =
        options.pendingTimeoutMs ?? DEFAULT_PENDING_TIMEOUT_MS;
    const readViewportHeight =
        options.readViewportHeight ?? (() => window.innerHeight);
    const readScrollHeight =
        options.readScrollHeight ??
        (() => document.documentElement.scrollHeight);
    const scrollBy = options.scrollBy ?? ((scroll) => window.scrollBy(scroll));
    const scrollTo = options.scrollTo ?? ((scroll) => window.scrollTo(scroll));
    const setTimer =
        options.setTimer ?? ((callback, ms) => window.setTimeout(callback, ms));
    const clearTimer =
        options.clearTimer ??
        ((handle) => window.clearTimeout(handle as number));

    let pendingTimer: unknown = null;
    let pendingActive = false;

    const clearPendingG = () => {
        if (pendingTimer !== null) {
            clearTimer(pendingTimer);
            pendingTimer = null;
        }
        pendingActive = false;
    };

    document.addEventListener("keydown", (event) => {
        if (event.defaultPrevented) {
            clearPendingG();
            return;
        }

        const shortcut = readNavigationShortcut(event, pendingActive);

        if (!shortcut || isTypingTarget(event.target)) {
            clearPendingG();
            return;
        }

        if (
            event.repeat &&
            (shortcut.kind === "pending-g" || shortcut.kind === "edge")
        ) {
            return;
        }

        if (shortcut.kind === "pending-g") {
            pendingActive = true;
            pendingTimer = setTimer(() => {
                pendingActive = false;
                pendingTimer = null;
            }, pendingTimeoutMs);
            return;
        }

        clearPendingG();
        event.preventDefault();

        if (shortcut.kind === "edge") {
            const top = shortcut.edge === "top" ? 0 : readScrollHeight();
            scrollTo({ behavior: "auto", left: 0, top });
            return;
        }

        const top = readNavigationScrollDelta(
            shortcut,
            lineScrollDistance,
            readViewportHeight
        );

        scrollBy({ behavior: "auto", left: 0, top });
    });
}

function readNavigationShortcut(
    event: KeyboardEvent,
    hasPendingG: boolean
): NavigationShortcut | null {
    const lowerKey = event.key.toLowerCase();

    if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
        return toLineOrPage(PAGE_SCROLL_DIRECTIONS[lowerKey], "page");
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
        return null;
    }

    if (lowerKey === "g") {
        if (event.shiftKey) {
            return { kind: "edge", edge: "bottom" };
        }
        if (hasPendingG) {
            return { kind: "edge", edge: "top" };
        }
        return { kind: "pending-g" };
    }

    if (event.shiftKey) {
        return null;
    }

    return toLineOrPage(LINE_SCROLL_DIRECTIONS[lowerKey], "line");
}

function toLineOrPage(
    direction: ScrollDirection | undefined,
    kind: "line" | "page"
): NavigationShortcut | null {
    if (direction === undefined) {
        return null;
    }

    return { kind, direction };
}

function readNavigationScrollDelta(
    shortcut: { kind: "line" | "page"; direction: ScrollDirection },
    lineScrollDistance: number,
    readViewportHeight: () => number
) {
    if (shortcut.kind === "line") {
        return shortcut.direction * lineScrollDistance;
    }

    return shortcut.direction * readViewportHeight() * PAGE_SCROLL_RATIO;
}

function isTypingTarget(target: EventTarget | null) {
    if (!hasElementShape(target)) {
        return false;
    }

    if (
        typeof target.closest === "function" &&
        target.closest(TYPING_TARGET_SELECTOR)
    ) {
        return true;
    }

    return (
        target.isContentEditable === true ||
        TYPING_TARGET_TAGS.has(target.tagName.toLowerCase())
    );
}

function hasElementShape(target: EventTarget | null): target is EventTarget & {
    closest?: (selector: string) => Element | null;
    isContentEditable?: boolean;
    tagName: string;
} {
    return (
        typeof target === "object" &&
        target !== null &&
        "tagName" in target &&
        typeof target.tagName === "string"
    );
}
