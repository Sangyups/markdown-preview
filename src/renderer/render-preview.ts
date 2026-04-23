import type { PreviewPayload } from "../shared/types";

import { renderMermaidBlocks } from "./render-mermaid";

export async function renderPreview(payload: PreviewPayload) {
    const fileNameElement = document.getElementById("file-name");
    const filePathElement = document.getElementById("file-path");
    const statusElement = document.getElementById("status");
    const previewElement = document.getElementById("preview");

    if (
        !fileNameElement ||
        !filePathElement ||
        !statusElement ||
        !previewElement
    ) {
        throw new Error("Preview DOM is not ready.");
    }

    document.title = `${payload.fileName} · Markdown Preview`;
    fileNameElement.textContent = payload.fileName;
    filePathElement.textContent = payload.filePath;
    statusElement.textContent = payload.status.message;
    statusElement.className = `status status--${payload.status.tone}`;
    previewElement.innerHTML = payload.html;

    await renderMermaidBlocks(previewElement);
}
