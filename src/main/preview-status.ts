import type { PreviewSource } from "../shared/preview-source";
import type { PreviewStatus } from "../shared/types";

export function buildPreviewStatus(source: PreviewSource): PreviewStatus {
    if (source === "stdin") {
        return {
            message: "Previewing stdin input.",
            tone: "info",
        };
    }

    return {
        message: "Watching for file changes.",
        tone: "info",
    };
}
