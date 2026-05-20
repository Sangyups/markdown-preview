export interface PreviewNavigationOptions {
    lineScrollDistance?: number;
    readViewportHeight?: () => number;
    scrollBy?: (options: ScrollToOptions) => void;
}

const DEFAULT_LINE_SCROLL_DISTANCE = 48;
const PAGE_SCROLL_RATIO = 0.5;
const TYPING_TARGET_SELECTOR =
    "input, textarea, select, button, [contenteditable='true']";
const TYPING_TARGET_TAGS = new Set(["button", "input", "select", "textarea"]);

type ScrollDirection = -1 | 1;

interface NavigationShortcut {
    direction: ScrollDirection;
    kind: "line" | "page";
}

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
    const readViewportHeight =
        options.readViewportHeight ?? (() => window.innerHeight);
    const scrollBy = options.scrollBy ?? ((scroll) => window.scrollBy(scroll));

    document.addEventListener("keydown", (event) => {
        if (event.defaultPrevented) {
            return;
        }

        const shortcut = readNavigationShortcut(event);

        if (!shortcut || isTypingTarget(event.target)) {
            return;
        }

        const top = readNavigationScrollDelta(
            shortcut,
            lineScrollDistance,
            readViewportHeight
        );

        event.preventDefault();
        scrollBy({
            behavior: "auto",
            left: 0,
            top,
        });
    });
}

function readNavigationShortcut(
    event: KeyboardEvent
): NavigationShortcut | null {
    const key = event.key.toLowerCase();

    if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
        return toNavigationShortcut(PAGE_SCROLL_DIRECTIONS[key], "page");
    }

    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return null;
    }

    return toNavigationShortcut(LINE_SCROLL_DIRECTIONS[key], "line");
}

function toNavigationShortcut(
    direction: ScrollDirection | undefined,
    kind: NavigationShortcut["kind"]
): NavigationShortcut | null {
    if (direction === undefined) {
        return null;
    }

    return {
        direction,
        kind,
    };
}

function readNavigationScrollDelta(
    shortcut: NavigationShortcut,
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
