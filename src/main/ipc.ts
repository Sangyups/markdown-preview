import { type BrowserWindow, ipcMain } from "electron";

import {
    PREVIEW_INITIAL_STATE_CHANNEL,
    PREVIEW_UPDATE_CHANNEL,
    type PreviewPayload,
} from "../shared/types";
import { registerFindIpcHandlers } from "./find-ipc";

export function registerPreviewIpc(
    getCurrentState: () => PreviewPayload | Promise<PreviewPayload>
) {
    ipcMain.handle(PREVIEW_INITIAL_STATE_CHANNEL, async () =>
        getCurrentState()
    );

    return () => {
        ipcMain.removeHandler(PREVIEW_INITIAL_STATE_CHANNEL);
    };
}

export function sendPreviewUpdate(
    previewWindow: BrowserWindow,
    payload: PreviewPayload
) {
    if (previewWindow.isDestroyed()) {
        return;
    }

    previewWindow.webContents.send(PREVIEW_UPDATE_CHANNEL, payload);
}

export function registerFindIpc(previewWindow: BrowserWindow) {
    const { webContents } = previewWindow;

    return registerFindIpcHandlers(ipcMain, {
        findInPage: (text, options) => webContents.findInPage(text, options),
        off: (eventName, listener) => {
            webContents.off(eventName, listener);
        },
        on: (eventName, listener) => {
            webContents.on(eventName, listener);
        },
        send: (channel, result) => {
            webContents.send(channel, result);
        },
        stopFindInPage: (action) => {
            webContents.stopFindInPage(action);
        },
    });
}
