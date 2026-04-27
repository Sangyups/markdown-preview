import type { PreviewPayload } from "../shared/types";

import { renderMermaidBlocks } from "./render-mermaid";

export async function renderPreview(payload: PreviewPayload) {
    const fileNameElement = document.getElementById("file-name");
    const filePathElement = document.getElementById("file-path");
    const previewElement = document.getElementById("preview");

    if (!fileNameElement || !filePathElement || !previewElement) {
        throw new Error("Preview DOM is not ready.");
    }

    document.documentElement.style.setProperty(
        "--preview-font-family",
        payload.preferences.fontFamily
    );
    document.documentElement.style.setProperty(
        "--preview-font-size",
        `${payload.preferences.fontSize}px`
    );
    document.documentElement.style.setProperty(
        "--preview-monospace-font-family",
        payload.preferences.monospaceFontFamily
    );
    document.documentElement.style.setProperty(
        "--preview-monospace-font-size",
        `${payload.preferences.monospaceFontSize}px`
    );
    document.title = `${payload.fileName} · Markdown Preview`;
    fileNameElement.textContent = payload.fileName;
    filePathElement.textContent = payload.filePath;
    previewElement.innerHTML = payload.html;

    await renderMermaidBlocks(previewElement);
}
