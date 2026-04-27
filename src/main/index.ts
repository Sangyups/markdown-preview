import { readFile } from "node:fs/promises";
import path from "node:path";
import { app, nativeTheme } from "electron";
import {
    type AppConfig,
    type AppTheme,
    loadAppConfig,
    toCssFontFamilyValue,
    toElectronThemeSource,
} from "../shared/config";
import { renderMarkdown } from "../shared/markdown/render-markdown";
import {
    type PreviewSource,
    parsePreviewSourceOption,
} from "../shared/preview-source";
import {
    applyThemeOverride,
    parseThemeOverrideOption,
} from "../shared/theme-override";
import type { PreviewPayload } from "../shared/types";
import { createWindow } from "./create-window";
import { registerFindIpc, registerPreviewIpc, sendPreviewUpdate } from "./ipc";
import { buildPreviewStatus } from "./preview-status";
import { watchFile } from "./watch-file";

void bootstrap();

async function bootstrap() {
    const targetPath = parseTargetPath(process.argv);
    let previewSource: PreviewSource;
    let themeOverride: AppTheme | null;

    try {
        previewSource = parsePreviewSourceOption(process.argv.slice(2));
        themeOverride = parseThemeOverrideOption(
            process.argv.slice(2)
        ).themeOverride;
    } catch (error) {
        console.error(toErrorMessage(error));
        app.exit(1);
        return;
    }

    if (!targetPath) {
        console.error("Missing --target <file-path> argument.");
        app.exit(1);
        return;
    }

    await app.whenReady();

    const appConfig = applyThemeOverride(await loadAppConfig(), themeOverride);
    nativeTheme.themeSource = toElectronThemeSource(appConfig.theme);

    const previewWindow = createWindow(
        path.basename(targetPath),
        appConfig,
        nativeTheme.shouldUseDarkColors
    );
    let currentPreview = await buildPreviewPayload(
        targetPath,
        appConfig,
        previewSource
    );

    const unregisterPreviewIpc = registerPreviewIpc(() => currentPreview);
    const unregisterFindIpc = registerFindIpc(previewWindow);
    const stopWatching = watchFile(targetPath, async () => {
        currentPreview = await buildPreviewPayload(
            targetPath,
            appConfig,
            previewSource
        );
        sendPreviewUpdate(previewWindow, currentPreview);
    });

    previewWindow.on("closed", () => {
        stopWatching();
        unregisterFindIpc();
        unregisterPreviewIpc();
    });

    app.on("window-all-closed", () => {
        app.quit();
    });
}

async function buildPreviewPayload(
    filePath: string,
    appConfig: AppConfig,
    previewSource: PreviewSource
): Promise<PreviewPayload> {
    try {
        const markdownSource = await readFile(filePath, "utf8");
        const html = renderMarkdown(markdownSource);

        return {
            fileName: path.basename(filePath),
            filePath,
            html,
            preferences: {
                fontFamily: toCssFontFamilyValue(appConfig.fontFamily),
                fontSize: appConfig.fontSize,
                monospaceFontFamily: toCssFontFamilyValue(
                    appConfig.monospaceFontFamily
                ),
                monospaceFontSize: appConfig.monospaceFontSize,
            },
            status: buildPreviewStatus(previewSource),
            updatedAt: Date.now(),
        };
    } catch (error) {
        const message = toErrorMessage(error);

        return {
            fileName: path.basename(filePath),
            filePath,
            html: renderPreviewError(message),
            preferences: {
                fontFamily: toCssFontFamilyValue(appConfig.fontFamily),
                fontSize: appConfig.fontSize,
                monospaceFontFamily: toCssFontFamilyValue(
                    appConfig.monospaceFontFamily
                ),
                monospaceFontSize: appConfig.monospaceFontSize,
            },
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
