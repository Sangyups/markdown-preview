import { type BrowserWindow, ipcMain } from "electron";

import {
    PREVIEW_INITIAL_STATE_CHANNEL,
    PREVIEW_UPDATE_CHANNEL,
    type PreviewPayload,
} from "../shared/types";

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
