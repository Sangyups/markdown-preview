export function shouldShowHelp(args: string[]): boolean {
    return args.includes("-h") || args.includes("--help");
}

export function formatHelpText(): string {
    return `markdown-preview - Terminal-first Markdown previewer

Usage:
  mdp [OPTIONS] [PATH]
  cat FILE | mdp

Arguments:
  PATH                  Path to a Markdown file or directory
                        If omitted, previews the current directory
                        If a directory, opens fzf to select a file

Options:
  -h, --help           Show this help message and exit
  --theme=THEME        Override the configured theme (auto, light, dark)

Examples:
  mdp ~/notes/demo.md         Open a specific file
  mdp ~/notes                 Browse and select from ~/notes
  mdp                         Browse and select from current directory
  cat README.md | mdp         Preview from stdin
  mdp --theme=dark README.md  Override theme for one session

For more information and configuration, see:
  https://github.com/Sangyups/markdown-preview
`;
}
