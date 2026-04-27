import {
    PREVIEW_FIND_CHANNEL,
    PREVIEW_FIND_RESULT_CHANNEL,
    PREVIEW_INITIAL_STATE_CHANNEL,
    PREVIEW_STOP_FIND_CHANNEL,
    PREVIEW_UPDATE_CHANNEL,
    type PreviewApi,
    type PreviewFindOptions,
    type PreviewFindResult,
    type PreviewFindStopAction,
    type PreviewPayload,
} from "../shared/types";

interface PreviewIpcRenderer {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    off: (channel: string, listener: (...args: unknown[]) => void) => void;
    on: (channel: string, listener: (...args: unknown[]) => void) => void;
}

export function createPreviewApi(ipcRenderer: PreviewIpcRenderer): PreviewApi {
    return {
        findInPage: (text: string, options?: PreviewFindOptions) =>
            ipcRenderer.invoke(
                PREVIEW_FIND_CHANNEL,
                text,
                options
            ) as Promise<number>,
        getInitialState: () =>
            ipcRenderer.invoke(
                PREVIEW_INITIAL_STATE_CHANNEL
            ) as Promise<PreviewPayload>,
        onFindResult: (listener) => {
            const wrappedListener = (
                _event: unknown,
                result: PreviewFindResult
            ) => {
                listener(result);
            };

            ipcRenderer.on(PREVIEW_FIND_RESULT_CHANNEL, wrappedListener);

            return () => {
                ipcRenderer.off(PREVIEW_FIND_RESULT_CHANNEL, wrappedListener);
            };
        },
        onPreviewUpdate: (listener) => {
            const wrappedListener = (
                _event: unknown,
                payload: PreviewPayload
            ) => {
                listener(payload);
            };

            ipcRenderer.on(PREVIEW_UPDATE_CHANNEL, wrappedListener);

            return () => {
                ipcRenderer.off(PREVIEW_UPDATE_CHANNEL, wrappedListener);
            };
        },
        stopFindInPage: (action?: PreviewFindStopAction) =>
            ipcRenderer.invoke(
                PREVIEW_STOP_FIND_CHANNEL,
                action
            ) as Promise<void>,
    };
}
