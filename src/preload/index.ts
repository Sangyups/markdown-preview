import { contextBridge, ipcRenderer } from "electron";

import {
    PREVIEW_INITIAL_STATE_CHANNEL,
    PREVIEW_UPDATE_CHANNEL,
    type PreviewApi,
    type PreviewPayload,
} from "../shared/types";

const previewApi: PreviewApi = {
    getInitialState: () => ipcRenderer.invoke(PREVIEW_INITIAL_STATE_CHANNEL),
    onPreviewUpdate: (listener) => {
        const wrappedListener = (
            _event: Electron.IpcRendererEvent,
            payload: PreviewPayload
        ) => {
            listener(payload);
        };

        ipcRenderer.on(PREVIEW_UPDATE_CHANNEL, wrappedListener);

        return () => {
            ipcRenderer.off(PREVIEW_UPDATE_CHANNEL, wrappedListener);
        };
    },
};

contextBridge.exposeInMainWorld("previewBridge", previewApi);
