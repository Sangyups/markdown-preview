export const PREVIEW_INITIAL_STATE_CHANNEL = "preview:get-initial-state";
export const PREVIEW_UPDATE_CHANNEL = "preview:update";

export type PreviewStatusTone = "error" | "info";

export interface PreviewStatus {
    message: string;
    tone: PreviewStatusTone;
}

export interface PreviewPayload {
    fileName: string;
    filePath: string;
    html: string;
    status: PreviewStatus;
    updatedAt: number;
}

export interface PreviewApi {
    getInitialState: () => Promise<PreviewPayload>;
    onPreviewUpdate: (
        listener: (payload: PreviewPayload) => void
    ) => () => void;
}

declare global {
    interface Window {
        previewBridge: PreviewApi;
    }
}
