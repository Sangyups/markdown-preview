import { renderPreview } from "./render-preview";
import { initializePreviewSearch } from "./search";

void bootstrap();

async function bootstrap() {
    try {
        const initialState = await window.previewBridge.getInitialState();
        await renderPreview(initialState);
        const searchController = initializePreviewSearch();

        window.previewBridge.onPreviewUpdate((nextState) => {
            void renderPreview(nextState).then(() => {
                searchController.refresh();
            });
        });
    } catch (error) {
        const previewElement = document.getElementById("preview");

        if (previewElement) {
            previewElement.innerHTML = `<section class="preview-error" role="alert"><h2>Renderer failed</h2><p>${toErrorMessage(
                error
            )}</p></section>`;
        }
    }
}

function toErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return "Unknown renderer error.";
}
