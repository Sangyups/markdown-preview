# Markdown Preview

Electron 기반의 로컬 Markdown 프리뷰 앱이다. 터미널에서 파일 또는 디렉토리를 넘기면 GUI 창을 열고, Markdown과 Mermaid 다이어그램을 렌더한다.

## 요구사항

- `mise`
- `bun`
- `fzf`

`bun` 버전은 `mise.toml`로 고정한다.

## 설치

```bash
mise install
bun install
```

어느 디렉토리에서나 `mdp` 커맨드로 실행하려면 이 저장소를 전역 링크한다.

```bash
bun link
```

`mdp`가 바로 실행되지 않으면 Bun의 전역 bin 디렉토리를 `PATH`에 추가한다.

```sh
# ~/.zshrc
export PATH="$HOME/.bun/bin:$PATH"
```

```bash
source ~/.zshrc
command -v mdp
```

링크 후에는 현재 저장소 밖에서도 같은 커맨드를 사용할 수 있다.

```bash
mdp ~/notes/demo.md
mdp ~/notes
```

전역 링크를 제거하려면 아래 명령을 사용한다.

```bash
bun unlink
```

## 실행

인자를 넘기지 않으면 현재 작업 디렉토리를 기준으로 `*.md` 파일을 찾는다.

```bash
bun run dev
```

빌드된 CLI 엔트리를 직접 실행하려면 아래 명령을 사용한다.

```bash
bun run build
mdp
```

파일 경로를 직접 넘기면 바로 해당 파일을 연다.

```bash
bun run dev -- docs/superpowers/specs/2026-04-23-markdown-preview-renderer-design.md
```

디렉토리를 넘기면 재귀적으로 `*.md`를 수집한 뒤 `fzf`로 선택한다.

```bash
bun run dev -- docs
```

## 설정 파일

사용자 설정 파일은 `$HOME/.config/markdown-preview/config.toml` 경로를 사용한다.
파일이 없으면 첫 실행 시 기본값 기준으로 자동 생성한다.

```toml
font-family = ["Iosevka Aile", "Pretendard", "sans-serif"]
font-size = 18
monospace-font-family = ["Iosevka Term", "monospace"]
monospace-font-size = 15
width = 1440
height = 960
```

설정 파일이 없거나 값이 잘못되면 기본값을 사용한다.

## 검증 명령

```bash
bun test
bun run check
bun run build
```

## 현재 범위

- Markdown 기본 렌더링
- `mermaid` fenced code block 렌더링
- preload 기반의 제한된 renderer API 노출
- 파일 저장 시 자동 프리뷰 갱신
- `.git`, `node_modules`, 숨김 디렉토리 제외

## 현재 비범위

- 상대 경로 링크 처리
- 상대 경로 이미지 처리
- 테마 전환
- VS Code extension 호환
- 전체 Electron E2E 테스트

## 구현 메모

- Mermaid는 renderer에서 `startOnLoad: false`와 `securityLevel: 'strict'`로 초기화한다.
- Markdown 렌더링과 Mermaid SVG 렌더링을 분리해서, 다이어그램 실패가 창 전체 실패로 번지지 않게 했다.
