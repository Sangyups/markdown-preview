export function extractFenceLanguage(info: string) {
    return info.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "";
}

export function isMermaidFence(info: string) {
    return extractFenceLanguage(info) === "mermaid";
}

export function encodeMermaidSource(source: string) {
    return encodeURIComponent(source);
}

export function decodeMermaidSource(source: string) {
    return decodeURIComponent(source);
}
