# Markdown Preview

A focused desktop previewer for people who write Markdown from the terminal.

Open a file, keep editing in your favorite editor, and let `markdown-preview`
hold a clean, live-updating reading window next to it. It renders standard
Markdown, supports Mermaid diagrams out of the box, and keeps the workflow
small: choose a file, preview it, save, repeat.

```bash
mdp ~/notes/architecture.md
```

## Why It Exists

Most Markdown preview flows are either tied to an editor pane or hidden behind a
browser tab. `markdown-preview` gives local Markdown its own desktop window, so
long notes, specs, runbooks, and diagram-heavy docs can stay readable while the
source file remains wherever you want to edit it.

## Highlights

- **Terminal-first launch** - open a file directly, scan the current directory,
  or pass a directory and pick from matching Markdown files with `fzf`.
- **Dedicated preview window** - Electron provides a standalone desktop surface
  instead of another editor split.
- **Live reload on save** - the preview updates when the target file changes.
- **Mermaid included** - fenced `mermaid` blocks render as diagrams without a
  separate browser setup.
- **Readable defaults, local preferences** - configure theme, font stacks, font
  sizes, and window dimensions in a small TOML file.
- **Conservative renderer boundary** - the renderer gets a limited API surface,
  external links open outside the preview, and unsupported raw HTML is escaped.

## Quick Start

### Requirements

- To install a shared package: Bun 1.3.1 or newer, or Node.js 20 or newer with
  npm 9 or newer
- To build from source: `mise` and the Bun version pinned by `mise.toml`
- `fzf` - required only when selecting a file from a directory

### Install From A Shared Package

If you received a packaged `markdown-preview-*.tgz` file, install it globally
with Bun. Bun's global install requires an absolute path to the tarball, so run
the command from the directory containing the file:

```bash
bun install -g "$PWD/markdown-preview-0.1.0.tgz"
command -v mdp
```

The same tarball can also be installed with npm:

```bash
npm install -g ./markdown-preview-0.1.0.tgz
command -v mdp
```

Then open a Markdown file:

```bash
mdp ~/notes/architecture.md
```

To update to a newer shared package, run the same install command with the new
`.tgz` file.

### Create A Shared Package

Maintainers should use Bun for development and packaging:

```bash
mise install
bun install
bun pm pack
```

`bun pm pack` runs the package `prepare` script, builds `dist/`, and writes an
npm-compatible `markdown-preview-<version>.tgz` file in the project directory.
Share that tarball with teammates; they can install it with Bun or npm.

### Install From Source

Source development is Bun-only. Link the CLI if you want to run `mdp` from any
directory:

```bash
bun link
```

If `mdp` is not found after linking, add Bun's global bin directory to your
shell path:

```sh
# ~/.zshrc
export PATH="$HOME/.bun/bin:$PATH"
```

```bash
source ~/.zshrc
command -v mdp
```

## Usage

Open a specific file:

```bash
mdp ~/notes/demo.md
```

Preview Markdown from stdin:

```bash
cat README.md | mdp
```

Scan a directory, then pick a Markdown file with `fzf`:

```bash
mdp ~/notes
```

Scan the current directory:

```bash
mdp
```

Override the configured theme for one run:

```bash
mdp --theme=dark ~/notes/demo.md
```

During development, run the same flow through the source entrypoint:

```bash
bun run dev -- README.md
bun run dev -- docs
```

When a directory is scanned, `.git`, `node_modules`, and hidden directories are
excluded by default.

## Configuration

User preferences live at:

```text
~/.config/markdown-preview/config.toml
```

The file is created automatically on first run if it does not already exist.

```toml
font-family = ["Apple SD Gothic Neo", "Avenir Next", "Segoe UI", "sans-serif"]
font-size = 16
monospace-font-family = ["SFMono-Regular", "JetBrains Mono", "monospace"]
monospace-font-size = 16
theme = "auto"
width = 1560
height = 1560
```

`theme` accepts `auto`, `light`, or `dark`. `auto` follows the operating system
theme. Invalid or missing values fall back to the built-in defaults. Passing
`--theme=auto`, `--theme=light`, or `--theme=dark` on the CLI overrides the
configured theme for that launch only.

## What It Renders

- Common Markdown syntax through `markdown-it`
- YAML and TOML frontmatter rendered as structured metadata tables (GitHub-style
  frontmatter included)
- Tables with horizontal scrolling
- Footnotes through standard `[^1]` and `^[inline]` syntax
- `mermaid` fenced code blocks
- A conservative raw HTML allowlist for practical Markdown authoring, covering
  common inline formatting, disclosure blocks, simple layout tags, and table
  structure
- Search within preview with Ctrl+F (or Cmd+F on macOS)

Unsupported raw HTML is escaped so the document remains readable instead of
breaking the preview.

## Development

```bash
bun test
bun run check
bun run build
```

Build output is written to `dist/`. The CLI wrapper in `bin/markdown-preview.js`
expects that built entrypoint to exist.

## Current Scope

`markdown-preview` is intentionally preview-only. It does not edit files, manage
tabs, restore sessions, or emulate the full VS Code extension environment.

Planned extension points include relative image/link handling, file glob options,
and richer window reuse behavior.

## Remove The Local CLI Link

```bash
bun unlink
```

## Release & Package

### Local Release

```bash
# Update version (only source of truth)
vi package.json
"version": "1.0.2"

# Pack the release
bun run pack

# Git push (triggers CI/CD automatically)
git add package.json
git commit -m "Release 1.0.2"
git push
```

### Automated Release (CI/CD)

When `package.json` is pushed to `main`, GitHub Actions automatically:
1. Runs checks and tests
2. Packs the release
3. Creates a GitHub Release with tag `v{version}`
4. Uploads the `.tgz` artifact

Manual trigger available: Use `workflow_dispatch` in GitHub Actions UI if needed.
