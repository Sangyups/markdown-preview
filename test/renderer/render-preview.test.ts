import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

const render = mock(async () => ({
    bindFunctions: undefined,
    svg: "<svg></svg>",
}));
const initialize = mock(() => undefined);

const setProperty = mock(() => undefined);

const originalDocument = globalThis.document;

beforeEach(() => {
    initialize.mockClear();
    render.mockClear();
    setProperty.mockClear();
    mock.module("mermaid", () => ({
        default: {
            initialize,
            render,
        },
    }));
});

afterEach(() => {
    globalThis.document = originalDocument;
    mock.restore();
});

function createPreviewDocument() {
    const fileNameElement = { textContent: "" };
    const filePathElement = { textContent: "" };
    const previewElement = {
        innerHTML: "",
        querySelectorAll: () => [],
    };

    const document = {
        documentElement: {
            style: {
                setProperty,
            },
        },
        getElementById: (elementId: string) => {
            switch (elementId) {
                case "file-name":
                    return fileNameElement;
                case "file-path":
                    return filePathElement;
                case "preview":
                    return previewElement;
                default:
                    return null;
            }
        },
        title: "",
    } as unknown as Document;

    return {
        document,
        fileNameElement,
        filePathElement,
        previewElement,
    };
}

describe("renderPreview", () => {
    test("applies configured preview typography to the document root", async () => {
        const { document, fileNameElement, filePathElement, previewElement } =
            createPreviewDocument();
        globalThis.document = document;

        const { renderPreview } = await import(
            "../../src/renderer/render-preview"
        );

        await renderPreview({
            fileName: "README.md",
            filePath: "/tmp/README.md",
            html: "<h1>Preview</h1>",
            preferences: {
                fontFamily: "Iosevka Term",
                fontSize: 18,
                monospaceFontFamily: '"Iosevka Term", monospace',
                monospaceFontSize: 15,
            },
            status: {
                message: "Watching for file changes.",
                tone: "info",
            },
            updatedAt: 0,
        });

        expect(document.title).toBe("README.md · Markdown Preview");
        expect(fileNameElement.textContent).toBe("README.md");
        expect(filePathElement.textContent).toBe("/tmp/README.md");
        expect(previewElement.innerHTML).toBe("<h1>Preview</h1>");
        expect(setProperty).toHaveBeenCalledWith(
            "--preview-font-family",
            "Iosevka Term"
        );
        expect(setProperty).toHaveBeenCalledWith("--preview-font-size", "18px");
        expect(setProperty).toHaveBeenCalledWith(
            "--preview-monospace-font-family",
            '"Iosevka Term", monospace'
        );
        expect(setProperty).toHaveBeenCalledWith(
            "--preview-monospace-font-size",
            "15px"
        );
    });

    test("throws when the preview DOM is not ready", async () => {
        globalThis.document = {
            documentElement: {
                style: {
                    setProperty,
                },
            },
            getElementById: () => null,
            title: "",
        } as unknown as Document;

        const { renderPreview } = await import(
            "../../src/renderer/render-preview"
        );

        await expect(
            renderPreview({
                fileName: "README.md",
                filePath: "/tmp/README.md",
                html: "<h1>Preview</h1>",
                preferences: {
                    fontFamily: "Iosevka Term",
                    fontSize: 18,
                    monospaceFontFamily: '"Iosevka Term", monospace',
                    monospaceFontSize: 15,
                },
                status: {
                    message: "Watching for file changes.",
                    tone: "info",
                },
                updatedAt: 0,
            })
        ).rejects.toThrow("Preview DOM is not ready.");
    });
});
