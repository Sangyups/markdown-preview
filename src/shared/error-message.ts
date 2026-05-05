export function toErrorMessage(error: unknown, fallback = "Unknown error.") {
    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
}
