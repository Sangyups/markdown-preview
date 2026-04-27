#!/usr/bin/env bash
set -u

if ! repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
    printf '{"decision":"block","reason":"Codex stop quality gate could not find the git repository root."}\n'
    exit 0
fi

if ! cd "$repo_root"; then
    printf '{"decision":"block","reason":"Codex stop quality gate could not enter the git repository root."}\n'
    exit 0
fi

failures=()

run_check() {
    local label="$1"
    shift

    printf '\n==> %s\n' "$label" >&2
    "$@" >&2
}

if ! run_check "bun run check" bun run check; then
    failures+=("bun run check")
fi

if ! run_check "bun test" bun test; then
    failures+=("bun test")
fi

if ((${#failures[@]} > 0)); then
    joined_failures="${failures[0]}"
    for ((index = 1; index < ${#failures[@]}; index++)); do
        joined_failures+=", ${failures[$index]}"
    done

    printf '{"decision":"block","reason":"Codex stop quality gate failed: %s. Fix the failures, then rerun the checks."}\n' "$joined_failures"
fi

exit 0
