export const PREVIEW_INITIAL_STATE_CHANNEL = "preview:get-initial-state";
export const PREVIEW_UPDATE_CHANNEL = "preview:update";
export const PREVIEW_FIND_CHANNEL = "preview:find";
export const PREVIEW_STOP_FIND_CHANNEL = "preview:stop-find";
export const PREVIEW_FIND_RESULT_CHANNEL = "preview:find-result";

export type PreviewStatusTone = "error" | "info";

export interface PreviewStatus {
    message: string;
    tone: PreviewStatusTone;
}

export interface PreviewPreferences {
    fontFamily: string;
    fontSize: number;
    monospaceFontFamily: string;
    monospaceFontSize: number;
}

export interface PreviewPayload {
    fileName: string;
    filePath: string;
    html: string;
    preferences: PreviewPreferences;
    status: PreviewStatus;
    updatedAt: number;
}

export interface PreviewFindOptions {
    findNext?: boolean;
    forward?: boolean;
    matchCase?: boolean;
}

export type PreviewFindStopAction =
    | "activateSelection"
    | "clearSelection"
    | "keepSelection";

export interface PreviewFindResult {
    activeMatchOrdinal: number;
    finalUpdate: boolean;
    matches: number;
    requestId: number;
}

export interface PreviewApi {
    findInPage: (text: string, options?: PreviewFindOptions) => Promise<number>;
    getInitialState: () => Promise<PreviewPayload>;
    onFindResult: (listener: (result: PreviewFindResult) => void) => () => void;
    onPreviewUpdate: (
        listener: (payload: PreviewPayload) => void
    ) => () => void;
    stopFindInPage: (action?: PreviewFindStopAction) => Promise<void>;
}

declare global {
    interface Window {
        previewBridge: PreviewApi;
    }
}
