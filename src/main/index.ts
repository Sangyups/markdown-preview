import { readFile } from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import { renderMarkdown } from "../shared/markdown/render-markdown";
import type { PreviewPayload } from "../shared/types";
import { createWindow } from "./create-window";
import { registerPreviewIpc, sendPreviewUpdate } from "./ipc";
import { watchFile } from "./watch-file";

void bootstrap();

async function bootstrap() {
    const targetPath = parseTargetPath(process.argv);

    if (!targetPath) {
        console.error("Missing --target <file-path> argument.");
        app.exit(1);
        return;
    }

    await app.whenReady();

    const previewWindow = createWindow(path.basename(targetPath));
    let currentPreview = await buildPreviewPayload(targetPath);

    const unregisterPreviewIpc = registerPreviewIpc(() => currentPreview);
    const stopWatching = watchFile(targetPath, async () => {
        currentPreview = await buildPreviewPayload(targetPath);
        sendPreviewUpdate(previewWindow, currentPreview);
    });

    previewWindow.on("closed", () => {
        stopWatching();
        unregisterPreviewIpc();
    });

    app.on("window-all-closed", () => {
        app.quit();
    });
}

async function buildPreviewPayload(filePath: string): Promise<PreviewPayload> {
    try {
        const markdownSource = await readFile(filePath, "utf8");
        const html = renderMarkdown(markdownSource);

        return {
            fileName: path.basename(filePath),
            filePath,
            html,
            status: {
                message: "Watching for file changes.",
                tone: "info",
            },
            updatedAt: Date.now(),
        };
    } catch (error) {
        const message = toErrorMessage(error);

        return {
            fileName: path.basename(filePath),
            filePath,
            html: renderPreviewError(message),
            status: {
                message,
                tone: "error",
            },
            updatedAt: Date.now(),
        };
    }
}

function parseTargetPath(argv: string[]) {
    const targetFlagIndex = argv.indexOf("--target");

    if (targetFlagIndex === -1) {
        return null;
    }

    const rawTargetPath = argv[targetFlagIndex + 1];

    if (!rawTargetPath) {
        return null;
    }

    return path.resolve(rawTargetPath);
}

function renderPreviewError(message: string) {
    const escapedMessage = message
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

    return [
        '<section class="preview-error" role="alert">',
        "<h2>Preview unavailable</h2>",
        `<p>${escapedMessage}</p>`,
        "</section>",
    ].join("");
}

function toErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return "Unknown error.";
}
