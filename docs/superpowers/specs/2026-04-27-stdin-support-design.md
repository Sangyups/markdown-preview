# stdin 마크다운 입력 지원 설계

## 개요

`markdown-preview`가 파일 경로뿐 아니라 파이프된 표준 입력도 프리뷰할 수 있게 한다.

대표 사용법은 다음과 같다.

```bash
cat README.md | mdp
```

기존 구조는 CLI가 최종 파일 경로를 결정하고 Electron main process에
`--target <filePath>`로 전달한다. stdin 지원도 이 경계를 유지한다. CLI가
stdin 문자열을 임시 Markdown 파일로 저장한 뒤 기존 `--target` 파일 경로 흐름을
재사용한다.

## 목표

- path argument가 없고 stdin이 TTY가 아니면 stdin을 Markdown source로 사용한다.
- path argument가 있으면 stdin이 파이프되어 있어도 기존 path target 규칙을 우선한다.
- Electron main, preload, renderer의 파일 기반 preview 흐름은 최대한 유지한다.
- stdin source는 UTF-8 텍스트로 읽고 Markdown renderer에 그대로 전달한다.
- stdin preview가 라이브 파일 감시 대상이 아니라는 점을 상태 메시지에서 명확히
  한다.

## 비목표

- `mdp -` 같은 명시적 stdin target 문법
- stdin source의 live update
- stdin 내용을 사용자 파일로 저장하거나 편집하는 기능
- 여러 입력 source를 동시에 병합하는 기능
- renderer 또는 IPC에 별도의 string-backed preview mode를 추가하는 것

## 사용자 동작 규칙

CLI 입력 source 결정 순서는 다음과 같다.

1. `--theme` 같은 옵션을 먼저 파싱해 path argument 후보만 남긴다.
2. path argument가 1개 있으면 기존처럼 파일 또는 디렉터리 target으로 해석한다.
3. path argument가 없고 `process.stdin.isTTY === false`이면 stdin 전체를 읽어
   임시 Markdown 파일로 만든다.
4. path argument가 없고 stdin이 TTY이면 기존처럼 현재 작업 디렉터리를 target으로
   사용한다.

stdin은 자동으로 감지한다. 따라서 `cat README.md | mdp`는 추가 플래그 없이
프리뷰 창을 연다. 반대로 `cat README.md | mdp docs`처럼 path argument가 있으면
`docs` target이 우선한다.

빈 stdin은 오류가 아니다. 빈 Markdown 문서를 프리뷰하는 것으로 처리한다.

## 아키텍처

stdin source의 내용 처리와 임시 파일 관리는 CLI 계층에 국한한다. Electron main
process에는 preview source를 구분하기 위한 작은 metadata만 전달한다.

### CLI 입력 선택

`src/cli/index.ts`의 target 선택 흐름에 stdin source 판별을 추가한다. 기존
`resolveTarget()`은 path argument 해석만 계속 담당한다. stdin 감지와 임시 파일
생성은 별도 helper로 분리해 테스트 가능한 단위로 둔다.

새 helper의 책임은 다음과 같다.

- stdin stream이 TTY인지 확인한다.
- stdin 전체를 UTF-8 문자열로 읽는다.
- OS temp directory 아래에 `markdown-preview-stdin-` prefix를 가진 임시 디렉터리를
  만든다.
- 그 안에 `.md` 확장자의 임시 파일을 쓰고 파일 경로를 반환한다.
- Electron process가 종료된 뒤 임시 디렉터리를 best-effort로 삭제할 수 있게
  cleanup callback을 함께 제공한다.

### Electron main process

Electron main process는 계속 `--target <filePath>`를 받는다. stdin preview도
임시 파일 경로로 전달되므로 main process의 파일 읽기, Markdown 변환, IPC payload
생성 경계는 유지된다.

추가로 CLI는 source metadata를 `--source=file` 또는 `--source=stdin` 형태로
전달한다. 값이 없으면 `file`로 간주해 기존 실행 방식과 호환한다.

stdin preview에서는 실제 사용자가 편집하는 원본 파일이 없으므로 파일 감시에 따른
live reload는 의미가 없다. main process는 `--source=stdin`일 때 payload의 status
message를 `Previewing stdin input.`으로 설정한다. 파일 target은 기존처럼
`Watching for file changes.`를 유지한다.

### Renderer

renderer는 `PreviewPayload`를 받아 DOM을 갱신하는 기존 책임을 유지한다. stdin
source 자체를 직접 알 필요는 없다. 필요한 경우 payload의 status message만
달라진다.

## 데이터 흐름

```text
mdp < piped markdown
CLI parses options
CLI sees no path args and non-TTY stdin
CLI reads stdin as UTF-8
CLI writes temp .md file
CLI launches Electron with --target <temp .md> --source=stdin
Main reads target file
Main renders Markdown into PreviewPayload
Renderer displays preview
Electron exits
CLI removes temp directory best-effort
```

path argument가 있는 경우 데이터 흐름은 기존과 같다.

```text
mdp docs
CLI parses options
CLI resolves docs as path target
CLI scans directory or selects file
CLI launches Electron with --target <selected file> --source=file
```

## 에러 처리

- stdin 읽기 실패는 CLI error로 출력하고 exit code `1`로 종료한다.
- 임시 디렉터리 또는 파일 생성 실패도 CLI error로 출력하고 exit code `1`로 종료한다.
- cleanup 실패는 preview session 결과를 실패로 바꾸지 않는다.
- 빈 stdin은 정상 입력으로 처리한다.
- path argument가 있을 때 stdin이 파이프되어 있어도 stdin은 소비하지 않는다.

## 테스트 전략

단위 테스트를 우선한다.

- stdin이 non-TTY이고 path argument가 없으면 stdin 내용을 임시 Markdown 파일로
  쓰고 그 파일을 target으로 선택한다.
- stdin이 non-TTY여도 path argument가 있으면 path target을 우선한다.
- stdin 임시 파일은 UTF-8 source를 손상 없이 저장한다.
- 빈 stdin은 빈 파일 target으로 처리한다.
- 임시 파일 cleanup은 Electron process 종료 이후 호출된다.
- `buildElectronMainArgs`는 `--source=stdin`을 전달할 수 있고, 기존 file target은
  `--source=file` 또는 기본값으로 동작한다.
- 기존 `resolveTarget`, `scanMarkdownFiles`, `runFzf` 테스트는 기존 동작을 계속
  보장한다.

통합 검증은 `bun test`, `bun run check`, `bun run build`로 수행한다. 필요하면 수동
검증으로 `printf '# Hi\n' | mdp`를 실행해 GUI 프리뷰가 열리는지 확인한다.
