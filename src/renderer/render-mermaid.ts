import mermaid from "mermaid";

import { toErrorMessage } from "../shared/error-message";
import { decodeMermaidSource } from "../shared/markdown/extract-mermaid-blocks";

type MermaidTheme = "dark" | "default";

let activeMermaidTheme: MermaidTheme | null = null;
let nextDiagramId = 0;

export async function renderMermaidBlocks(rootElement: ParentNode) {
    const mermaidBlocks = Array.from(
        rootElement.querySelectorAll<HTMLElement>("[data-mermaid-source]")
    );

    if (mermaidBlocks.length === 0) {
        return;
    }

    initializeMermaid();

    await Promise.all(
        mermaidBlocks.map((mermaidBlock) => renderMermaidBlock(mermaidBlock))
    );
}

export function resolveMermaidTheme(
    matchMedia = globalThis.matchMedia
): MermaidTheme {
    return matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "default";
}

export function normalizeMermaidSvg(diagramContainer: ParentNode) {
    const svgElement = diagramContainer.querySelector<SVGSVGElement>("svg");

    if (!svgElement) {
        return;
    }

    svgElement.style.height = "auto";
}

function initializeMermaid() {
    const mermaidTheme = resolveMermaidTheme();

    if (activeMermaidTheme === mermaidTheme) {
        return;
    }

    mermaid.initialize({
        securityLevel: "strict",
        startOnLoad: false,
        theme: mermaidTheme,
    });

    activeMermaidTheme = mermaidTheme;
}

async function renderMermaidBlock(mermaidBlock: HTMLElement) {
    const encodedSource = mermaidBlock.dataset.mermaidSource;
    const diagramContainer =
        mermaidBlock.querySelector<HTMLElement>(".mermaid-diagram");
    const errorContainer =
        mermaidBlock.querySelector<HTMLElement>(".mermaid-error");

    if (!encodedSource || !diagramContainer || !errorContainer) {
        return;
    }

    try {
        nextDiagramId += 1;
        const diagramId = `mermaid-${nextDiagramId}`;
        const { bindFunctions, svg } = await mermaid.render(
            diagramId,
            decodeMermaidSource(encodedSource)
        );
        diagramContainer.innerHTML = svg;
        normalizeMermaidSvg(diagramContainer);
        bindFunctions?.(diagramContainer);
        mermaidBlock.dataset.mermaidState = "ready";
        errorContainer.hidden = true;
        errorContainer.textContent = "";
    } catch (error) {
        mermaidBlock.dataset.mermaidState = "error";
        diagramContainer.innerHTML = "";
        errorContainer.hidden = false;
        errorContainer.textContent = toErrorMessage(
            error,
            "Mermaid rendering failed."
        );
    }
}
