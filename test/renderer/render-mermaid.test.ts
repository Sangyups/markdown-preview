import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { encodeMermaidSource } from "../../src/shared/markdown/extract-mermaid-blocks";

const initialize = mock(() => undefined);
const render = mock(async () => ({
    bindFunctions: undefined,
    svg: "<svg></svg>",
}));
const originalMatchMedia = globalThis.matchMedia;

beforeEach(() => {
    initialize.mockClear();
    render.mockClear();
    mock.module("mermaid", () => ({
        default: {
            initialize,
            render,
        },
    }));
});

afterEach(() => {
    globalThis.matchMedia = originalMatchMedia;
});

describe("renderMermaidBlocks", () => {
    test("initializes Mermaid with the dark theme when dark colors are active", async () => {
        globalThis.matchMedia = mock((query: string) => ({
            matches: query === "(prefers-color-scheme: dark)",
        })) as unknown as typeof globalThis.matchMedia;

        const mermaidBlock = {
            dataset: {
                mermaidSource: encodeMermaidSource("graph TD;A-->B;"),
            },
            querySelector() {
                return null;
            },
        } as unknown as HTMLElement;
        const rootElement = {
            querySelectorAll() {
                return [mermaidBlock];
            },
        } as unknown as ParentNode;

        const { renderMermaidBlocks } = await import(
            "../../src/renderer/render-mermaid"
        );

        await renderMermaidBlocks(rootElement);

        expect(initialize).toHaveBeenCalledWith(
            expect.objectContaining({
                theme: "dark",
            })
        );
    });

    test("skips Mermaid initialization when no diagrams are present", async () => {
        const matchMediaSpy = mock(() => ({ matches: false }));
        globalThis.matchMedia =
            matchMediaSpy as unknown as typeof globalThis.matchMedia;

        const rootElement = {
            querySelectorAll() {
                return [];
            },
        } as unknown as ParentNode;

        const { renderMermaidBlocks } = await import(
            "../../src/renderer/render-mermaid"
        );

        await renderMermaidBlocks(rootElement);

        expect(initialize).not.toHaveBeenCalled();
        expect(matchMediaSpy).not.toHaveBeenCalled();
    });

    test("renders Mermaid diagrams and clears previous errors on success", async () => {
        const bindFunctions = mock(() => undefined);
        const svgElement = {
            style: {
                height: "320px",
                maxWidth: "480px",
                width: "100%",
            },
        };
        const diagramContainer = {
            innerHTML: "",
            querySelector(selector: string) {
                if (selector === "svg") {
                    return svgElement;
                }

                return null;
            },
        };
        const errorContainer = {
            hidden: false,
            textContent: "Previous error",
        };
        const mermaidBlock = {
            dataset: {
                mermaidSource: encodeMermaidSource("graph TD;A-->B;"),
            },
            querySelector(selector: string) {
                if (selector === ".mermaid-diagram") {
                    return diagramContainer;
                }

                if (selector === ".mermaid-error") {
                    return errorContainer;
                }

                return null;
            },
        } as unknown as HTMLElement;
        const rootElement = {
            querySelectorAll() {
                return [mermaidBlock];
            },
        } as unknown as ParentNode;

        render.mockImplementationOnce(async () => ({
            bindFunctions,
            svg: "<svg><text>diagram</text></svg>",
        }));

        const { renderMermaidBlocks } = await import(
            "../../src/renderer/render-mermaid"
        );

        await renderMermaidBlocks(rootElement);

        expect(render).toHaveBeenCalledTimes(1);
        expect(render.mock.calls[0]?.[0]).toStartWith("mermaid-");
        expect(render.mock.calls[0]?.[1]).toBe("graph TD;A-->B;");
        expect(diagramContainer.innerHTML).toBe(
            "<svg><text>diagram</text></svg>"
        );
        expect(svgElement.style.width).toBe("100%");
        expect(svgElement.style.maxWidth).toBe("480px");
        expect(svgElement.style.height).toBe("auto");
        expect(bindFunctions).toHaveBeenCalledWith(diagramContainer);
        expect(mermaidBlock.dataset.mermaidState).toBe("ready");
        expect(errorContainer.hidden).toBe(true);
        expect(errorContainer.textContent).toBe("");
    });

    test("shows a readable error when Mermaid rendering fails", async () => {
        const diagramContainer = {
            innerHTML: "<svg>stale</svg>",
            querySelector() {
                return null;
            },
        };
        const errorContainer = {
            hidden: true,
            textContent: "",
        };
        const mermaidBlock = {
            dataset: {
                mermaidSource: encodeMermaidSource("graph TD;A-->B;"),
            },
            querySelector(selector: string) {
                if (selector === ".mermaid-diagram") {
                    return diagramContainer;
                }

                if (selector === ".mermaid-error") {
                    return errorContainer;
                }

                return null;
            },
        } as unknown as HTMLElement;
        const rootElement = {
            querySelectorAll() {
                return [mermaidBlock];
            },
        } as unknown as ParentNode;

        render.mockImplementationOnce(async () => {
            throw new Error("Invalid Mermaid syntax");
        });

        const { renderMermaidBlocks } = await import(
            "../../src/renderer/render-mermaid"
        );

        await renderMermaidBlocks(rootElement);

        expect(diagramContainer.innerHTML).toBe("");
        expect(mermaidBlock.dataset.mermaidState).toBe("error");
        expect(errorContainer.hidden).toBe(false);
        expect(errorContainer.textContent).toBe("Invalid Mermaid syntax");
    });
});

describe("normalizeMermaidSvg", () => {
    test("preserves Mermaid sizing and only normalizes height", async () => {
        const style = {
            width: "100%",
            maxWidth: "480px",
            height: "320px",
        };
        const svgElement = {
            removeAttributeCalls: [] as string[],
            style,
            removeAttribute(attribute: string) {
                this.removeAttributeCalls.push(attribute);
            },
        };
        const diagramContainer = {
            querySelector(selector: string) {
                if (selector === "svg") {
                    return svgElement;
                }

                return null;
            },
        } as unknown as HTMLElement;

        const { normalizeMermaidSvg } = await import(
            "../../src/renderer/render-mermaid"
        );

        normalizeMermaidSvg(diagramContainer);

        expect(svgElement.removeAttributeCalls).toEqual([]);
        expect(style.width).toBe("100%");
        expect(style.maxWidth).toBe("480px");
        expect(style.height).toBe("auto");
    });
});
