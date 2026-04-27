import { afterEach, describe, expect, mock, test } from "bun:test";

const mockBunExecutablePath = "/mock/tools/bun/bin/bun";
const mockProjectRootPath = "/mock/project/markdown-preview";
const mockMainEntryPath = `${mockProjectRootPath}/dist/main/index.js`;
const mockPreloadEntryPath = `${mockProjectRootPath}/dist/preload/index.js`;
const mockRendererHtmlPath = `${mockProjectRootPath}/dist/renderer/index.html`;

const originalArgv = [...process.argv];
const openExternal = mock(() => Promise.resolve());
const willNavigateHandlers: Array<
    (event: { preventDefault: () => void }, url: string) => void
> = [];
const windowOpenHandlers: Array<
    (details: { url: string }) => { action: "allow" | "deny" }
> = [];

const fakeWindow = {
    loadFile: mock(() => Promise.resolve()),
    once: mock(() => undefined),
    show: mock(() => undefined),
    webContents: {
        on: mock(
            (
                eventName: string,
                listener: (
                    event: { preventDefault: () => void },
                    url: string
                ) => void
            ) => {
                if (eventName === "will-navigate") {
                    willNavigateHandlers.push(listener);
                }
            }
        ),
        setWindowOpenHandler: mock(
            (
                handler: (details: { url: string }) => {
                    action: "allow" | "deny";
                }
            ) => {
                windowOpenHandlers.push(handler);
            }
        ),
    },
};

const BrowserWindow = mock(() => fakeWindow);

mock.module("electron", () => ({
    BrowserWindow,
    shell: {
        openExternal,
    },
}));

afterEach(() => {
    process.argv = [...originalArgv];
    willNavigateHandlers.length = 0;
    windowOpenHandlers.length = 0;
    BrowserWindow.mockClear();
    openExternal.mockClear();
    fakeWindow.loadFile.mockClear();
    fakeWindow.once.mockClear();
    fakeWindow.show.mockClear();
    fakeWindow.webContents.on.mockClear();
    fakeWindow.webContents.setWindowOpenHandler.mockClear();
    mock.restore();
});

describe("createWindow", () => {
    test("creates the preview window with 1560 square defaults", async () => {
        process.argv = [mockBunExecutablePath, mockMainEntryPath];

        const { createWindow } = await import("../../src/main/create-window");

        const previewWindow = createWindow("README.md");

        expect(previewWindow).toBe(fakeWindow);
        expect(BrowserWindow).toHaveBeenCalledWith({
            backgroundColor: "#f7f7f3",
            height: 1560,
            show: false,
            title: "README.md · Markdown Preview",
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                preload: mockPreloadEntryPath,
            },
            width: 1560,
        });
        expect(fakeWindow.loadFile).toHaveBeenCalledWith(mockRendererHtmlPath);
        expect(fakeWindow.webContents.on).toHaveBeenCalledWith(
            "will-navigate",
            expect.any(Function)
        );
        expect(
            fakeWindow.webContents.setWindowOpenHandler
        ).toHaveBeenCalledWith(expect.any(Function));
        expect(fakeWindow.once).toHaveBeenCalledWith(
            "ready-to-show",
            expect.any(Function)
        );

        const readyToShowHandler = fakeWindow.once.mock.calls[0]?.[1];

        expect(readyToShowHandler).toBeDefined();

        readyToShowHandler?.();

        expect(fakeWindow.show).toHaveBeenCalledTimes(1);
    });

    test("uses configured window dimensions when provided", async () => {
        process.argv = [mockBunExecutablePath, mockMainEntryPath];

        const { createWindow } = await import("../../src/main/create-window");

        createWindow("README.md", {
            height: 900,
            width: 1280,
        });

        expect(BrowserWindow).toHaveBeenCalledWith(
            expect.objectContaining({
                height: 900,
                width: 1280,
            })
        );
    });

    test("uses a dark window background when dark colors are active", async () => {
        process.argv = [mockBunExecutablePath, mockMainEntryPath];

        const { createWindow } = await import("../../src/main/create-window");

        createWindow(
            "README.md",
            {
                height: 900,
                width: 1280,
            },
            true
        );

        expect(BrowserWindow).toHaveBeenCalledWith(
            expect.objectContaining({
                backgroundColor: "#111614",
            })
        );
    });

    test("blocks in-app navigation and opens safe external urls in the default browser", async () => {
        process.argv = [mockBunExecutablePath, mockMainEntryPath];

        const { createWindow } = await import("../../src/main/create-window");

        createWindow("README.md");

        const preventDefault = mock(() => undefined);
        const willNavigateHandler = willNavigateHandlers[0];

        expect(willNavigateHandler).toBeDefined();

        willNavigateHandler?.(
            { preventDefault },
            "https://example.com/docs/preview"
        );

        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(openExternal).toHaveBeenCalledWith(
            "https://example.com/docs/preview"
        );

        const windowOpenHandler = windowOpenHandlers[0];

        expect(windowOpenHandler).toBeDefined();
        expect(
            windowOpenHandler?.({ url: "https://example.com/docs/preview" })
        ).toEqual({ action: "deny" });
        expect(openExternal).toHaveBeenCalledTimes(2);
    });

    test("denies unsupported navigation targets without opening them externally", async () => {
        process.argv = [mockBunExecutablePath, mockMainEntryPath];

        const { createWindow } = await import("../../src/main/create-window");

        createWindow("README.md");

        const preventDefault = mock(() => undefined);
        const willNavigateHandler = willNavigateHandlers[0];

        willNavigateHandler?.({ preventDefault }, "file:///tmp/evil.html");

        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(openExternal).not.toHaveBeenCalled();

        const windowOpenHandler = windowOpenHandlers[0];

        expect(windowOpenHandler?.({ url: "javascript:alert(1)" })).toEqual({
            action: "deny",
        });
        expect(openExternal).not.toHaveBeenCalled();
    });
});
