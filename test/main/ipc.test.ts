import { afterEach, describe, expect, mock, test } from "bun:test";

const handleCalls: Array<{
    channel: string;
    listener: (event: unknown, ...args: unknown[]) => unknown;
}> = [];
const removeHandler = mock((_channel: string) => undefined);
const handle = mock(
    (
        channel: string,
        listener: (event: unknown, ...args: unknown[]) => unknown
    ) => {
        handleCalls.push({ channel, listener });
    }
);

afterEach(() => {
    handleCalls.length = 0;
    handle.mockClear();
    removeHandler.mockClear();
    mock.restore();
});

describe("registerFindIpcHandlers", () => {
    test("delegates non-empty find requests to the preview webContents", async () => {
        const findInPage = mock(() => 42);
        const fakeWebContents = createFakeWebContents({ findInPage });

        const { PREVIEW_FIND_CHANNEL } = await import("../../src/shared/types");
        const { registerFindIpcHandlers } = await import(
            "../../src/main/find-ipc"
        );

        registerFindIpcHandlers({ handle, removeHandler }, fakeWebContents);

        const findHandler = handleCalls.find(
            (call) => call.channel === PREVIEW_FIND_CHANNEL
        )?.listener;

        expect(findHandler).toBeDefined();

        const requestId = findHandler?.(null, "markdown", {
            findNext: true,
            forward: false,
            matchCase: true,
        });

        expect(requestId).toBe(42);
        expect(findInPage).toHaveBeenCalledWith("markdown", {
            findNext: true,
            forward: false,
            matchCase: true,
        });
    });

    test("clears the active search when the query is empty", async () => {
        const findInPage = mock(() => 42);
        const stopFindInPage = mock(() => undefined);
        const fakeWebContents = createFakeWebContents({
            findInPage,
            stopFindInPage,
        });

        const { PREVIEW_FIND_CHANNEL } = await import("../../src/shared/types");
        const { registerFindIpcHandlers } = await import(
            "../../src/main/find-ipc"
        );

        registerFindIpcHandlers({ handle, removeHandler }, fakeWebContents);

        const findHandler = handleCalls.find(
            (call) => call.channel === PREVIEW_FIND_CHANNEL
        )?.listener;

        const requestId = findHandler?.(null, "   ");

        expect(requestId).toBe(0);
        expect(findInPage).not.toHaveBeenCalled();
        expect(stopFindInPage).toHaveBeenCalledWith("clearSelection");
    });

    test("stops find requests with a validated stop action", async () => {
        const stopFindInPage = mock(() => undefined);
        const fakeWebContents = createFakeWebContents({ stopFindInPage });

        const { PREVIEW_STOP_FIND_CHANNEL } = await import(
            "../../src/shared/types"
        );
        const { registerFindIpcHandlers } = await import(
            "../../src/main/find-ipc"
        );

        registerFindIpcHandlers({ handle, removeHandler }, fakeWebContents);

        const stopHandler = handleCalls.find(
            (call) => call.channel === PREVIEW_STOP_FIND_CHANNEL
        )?.listener;

        stopHandler?.(null, "keepSelection");
        stopHandler?.(null, "unsupported");

        expect(stopFindInPage).toHaveBeenNthCalledWith(1, "keepSelection");
        expect(stopFindInPage).toHaveBeenNthCalledWith(2, "clearSelection");
    });

    test("forwards Electron find results to the renderer and unregisters handlers", async () => {
        const on = mock((_eventName: string, _listener: unknown) => undefined);
        const off = mock((_eventName: string, _listener: unknown) => undefined);
        const send = mock((_channel: string, _result: unknown) => undefined);
        const fakeWebContents = createFakeWebContents({ off, on, send });

        const {
            PREVIEW_FIND_CHANNEL,
            PREVIEW_FIND_RESULT_CHANNEL,
            PREVIEW_STOP_FIND_CHANNEL,
        } = await import("../../src/shared/types");
        const { registerFindIpcHandlers } = await import(
            "../../src/main/find-ipc"
        );

        const unregister = registerFindIpcHandlers(
            { handle, removeHandler },
            fakeWebContents
        );
        const foundInPageListener = on.mock.calls[0]?.[1] as
            | ((event: unknown, result: unknown) => void)
            | undefined;
        const result = {
            activeMatchOrdinal: 2,
            finalUpdate: true,
            matches: 5,
            requestId: 7,
        };

        foundInPageListener?.(null, result);

        expect(send).toHaveBeenCalledWith(PREVIEW_FIND_RESULT_CHANNEL, result);

        unregister();

        expect(removeHandler).toHaveBeenCalledWith(PREVIEW_FIND_CHANNEL);
        expect(removeHandler).toHaveBeenCalledWith(PREVIEW_STOP_FIND_CHANNEL);
        expect(off).toHaveBeenCalledWith("found-in-page", foundInPageListener);
    });
});

function createFakeWebContents(
    webContentsOverrides: Partial<{
        findInPage: ReturnType<typeof mock>;
        off: ReturnType<typeof mock>;
        on: ReturnType<typeof mock>;
        send: ReturnType<typeof mock>;
        stopFindInPage: ReturnType<typeof mock>;
    }> = {}
) {
    return {
        findInPage: mock(() => 1),
        off: mock(() => undefined),
        on: mock(() => undefined),
        send: mock(() => undefined),
        stopFindInPage: mock(() => undefined),
        ...webContentsOverrides,
    } as never;
}
