import { afterEach, describe, expect, mock, test } from "bun:test";

const invoke = mock((channel: string, ...args: unknown[]) =>
    Promise.resolve({ channel, args })
);
const on = mock((_channel: string, _listener: unknown) => undefined);
const off = mock((_channel: string, _listener: unknown) => undefined);

afterEach(() => {
    invoke.mockClear();
    on.mockClear();
    off.mockClear();
    mock.restore();
});

describe("preload previewBridge", () => {
    test("exposes find controls through the constrained bridge", async () => {
        const {
            PREVIEW_FIND_CHANNEL,
            PREVIEW_FIND_RESULT_CHANNEL,
            PREVIEW_STOP_FIND_CHANNEL,
        } = await import("../../src/shared/types");
        const { createPreviewApi } = await import(
            "../../src/preload/preview-api"
        );

        const previewBridge = createPreviewApi({
            invoke,
            off,
            on,
        });

        await previewBridge.findInPage("markdown", {
            findNext: true,
            forward: false,
        });
        await previewBridge.stopFindInPage("keepSelection");

        expect(invoke).toHaveBeenCalledWith(PREVIEW_FIND_CHANNEL, "markdown", {
            findNext: true,
            forward: false,
        });
        expect(invoke).toHaveBeenCalledWith(
            PREVIEW_STOP_FIND_CHANNEL,
            "keepSelection"
        );

        const listener = mock(() => undefined);
        const unsubscribe = previewBridge.onFindResult(listener);
        const wrappedListener = on.mock.calls[0]?.[1] as
            | ((event: unknown, result: unknown) => void)
            | undefined;
        const result = {
            activeMatchOrdinal: 1,
            finalUpdate: true,
            matches: 3,
            requestId: 9,
        };

        expect(on).toHaveBeenCalledWith(
            PREVIEW_FIND_RESULT_CHANNEL,
            expect.any(Function)
        );

        wrappedListener?.(null, result);

        expect(listener).toHaveBeenCalledWith(result);

        unsubscribe();

        expect(off).toHaveBeenCalledWith(
            PREVIEW_FIND_RESULT_CHANNEL,
            wrappedListener
        );
    });
});
