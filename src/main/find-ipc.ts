import {
    PREVIEW_FIND_CHANNEL,
    PREVIEW_FIND_RESULT_CHANNEL,
    PREVIEW_STOP_FIND_CHANNEL,
    type PreviewFindOptions,
    type PreviewFindResult,
    type PreviewFindStopAction,
} from "../shared/types";

interface FindIpcMain {
    handle: (
        channel: string,
        listener: (_event: unknown, ...args: unknown[]) => unknown
    ) => void;
    removeHandler: (channel: string) => void;
}

interface FindWebContents {
    findInPage: (text: string, options: PreviewFindOptions) => number;
    off: (
        eventName: "found-in-page",
        listener: (_event: unknown, result: PreviewFindResult) => void
    ) => void;
    on: (
        eventName: "found-in-page",
        listener: (_event: unknown, result: PreviewFindResult) => void
    ) => void;
    send: (channel: string, result: PreviewFindResult) => void;
    stopFindInPage: (action: PreviewFindStopAction) => void;
}

export function registerFindIpcHandlers(
    ipcMain: FindIpcMain,
    webContents: FindWebContents
) {
    ipcMain.handle(PREVIEW_FIND_CHANNEL, (_event, text, options) => {
        const query = typeof text === "string" ? text : "";

        if (query.trim().length === 0) {
            webContents.stopFindInPage("clearSelection");
            return 0;
        }

        return webContents.findInPage(query, normalizeFindOptions(options));
    });

    ipcMain.handle(PREVIEW_STOP_FIND_CHANNEL, (_event, action) => {
        webContents.stopFindInPage(normalizeStopAction(action));
    });

    const handleFoundInPage = (_event: unknown, result: PreviewFindResult) => {
        webContents.send(PREVIEW_FIND_RESULT_CHANNEL, result);
    };

    webContents.on("found-in-page", handleFoundInPage);

    return () => {
        ipcMain.removeHandler(PREVIEW_FIND_CHANNEL);
        ipcMain.removeHandler(PREVIEW_STOP_FIND_CHANNEL);
        webContents.off("found-in-page", handleFoundInPage);
    };
}

function normalizeFindOptions(options: unknown): PreviewFindOptions {
    if (!isRecord(options)) {
        return {
            findNext: true,
            forward: true,
        };
    }

    return {
        findNext: options.findNext === true,
        forward: options.forward !== false,
        ...(options.matchCase === true ? { matchCase: true } : {}),
    };
}

function normalizeStopAction(action: unknown): PreviewFindStopAction {
    if (
        action === "activateSelection" ||
        action === "keepSelection" ||
        action === "clearSelection"
    ) {
        return action;
    }

    return "clearSelection";
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
