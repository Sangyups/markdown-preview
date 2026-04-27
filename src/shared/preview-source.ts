const SOURCE_FLAG = "--source";
const SOURCE_FLAG_PREFIX = `${SOURCE_FLAG}=`;
const EXPECTED_SOURCE_MESSAGE = "Expected file or stdin.";

export type PreviewSource = "file" | "stdin";

export function parsePreviewSourceOption(args: string[]): PreviewSource {
    let previewSource: PreviewSource = "file";

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];

        if (arg === SOURCE_FLAG) {
            const value = args[index + 1];

            if (!value || value.startsWith("--")) {
                throw new Error(
                    `Missing value for --source. ${EXPECTED_SOURCE_MESSAGE}`
                );
            }

            previewSource = parsePreviewSourceValue(value);
            index += 1;
            continue;
        }

        if (arg.startsWith(SOURCE_FLAG_PREFIX)) {
            previewSource = parsePreviewSourceValue(
                arg.slice(SOURCE_FLAG_PREFIX.length)
            );
        }
    }

    return previewSource;
}

function parsePreviewSourceValue(value: string): PreviewSource {
    if (value === "file" || value === "stdin") {
        return value;
    }

    throw new Error(
        `Unsupported preview source "${value}". ${EXPECTED_SOURCE_MESSAGE}`
    );
}
