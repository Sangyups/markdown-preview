import { BrowserWindow, shell } from "electron";

import { resolveRuntimePath } from "../shared/runtime-path";

export function createWindow(fileName: string) {
    const preloadPath = resolveRuntimePath(process.argv, "../preload/index.js");
    const rendererHtmlPath = resolveRuntimePath(
        process.argv,
        "../renderer/index.html"
    );

    const previewWindow = new BrowserWindow({
        backgroundColor: "#f7f7f3",
        height: 1560,
        show: false,
        title: `${fileName} · Markdown Preview`,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: preloadPath,
        },
        width: 1560,
    });

    previewWindow.webContents.on("will-navigate", (event, navigationUrl) => {
        event.preventDefault();

        if (isSafeExternalUrl(navigationUrl)) {
            void shell.openExternal(navigationUrl);
        }
    });

    previewWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (isSafeExternalUrl(url)) {
            void shell.openExternal(url);
        }

        return { action: "deny" };
    });

    previewWindow.once("ready-to-show", () => {
        previewWindow.show();
    });

    void previewWindow.loadFile(rendererHtmlPath);

    return previewWindow;
}

function isSafeExternalUrl(url: string) {
    try {
        const parsedUrl = new URL(url);
        return (
            parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
        );
    } catch {
        return false;
    }
}
