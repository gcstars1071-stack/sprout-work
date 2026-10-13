# CLAUDE.md — Sprout Work

> 상세 인수인계는 [HANDOFF.md](HANDOFF.md) 참고. 이 파일은 **채팅/플랫폼 작업 규칙**만 요약한다.

## 한 저장소, 세 플랫폼
Windows·Android는 따로 개발하는 게 아니라 **모두 이 저장소 안에** 있다. 기준은 웹앱.

| 플랫폼 | 위치 | 기준 소스 |
|---|---|---|
| 웹 (메인) | `app.html` 외 마케팅 페이지 | — (여기가 원본) |
| Windows/mac | `desktop/` (Electron) | `../app.html` 등을 `extraResources`로 포함 |
| Android/iOS | `mobile/` (Capacitor) | 라이브 사이트를 감싸는 WebView |

→ **`app.html`이 단일 진실의 원천(single source of truth)**. desktop/mobile은 이걸 감싸기만 한다.

## 채팅 나누는 법 (폴더 아님, 주제로)
- 채팅끼리 대화 맥락은 공유되지 않는다. 공유는 **이 저장소의 커밋/파일로** 한다.
- "Windows 빌드" 채팅 → `desktop/` 작업. "Android" 채팅 → `mobile/android/` 작업.
- 어느 채팅에서든 **먼저 `git pull`** (SproutDesk 등이 다른 PC에서 병행 커밋됨 — HANDOFF.md 참고).

## 작업 규칙
- **버전 올릴 때**: `desktop/package.json`의 `version`과 모바일 버전을 함께 맞추고, 릴리스 후 `downloads.html` 링크도 교체.
- **i18n**: 새 문구는 en/ko/vi 3개 언어 모두 (`app.html`의 `TRANSLATIONS`).
- **배포**: `main`에 push하면 Cloudflare Pages가 자동 배포. 별도 명령 없음.
- **시크릿 금지**: service_role 키 등 클라이언트에 넣지 말 것. anon 키는 공개 안전(RLS가 보안).

## 주의: 떨어져 나간 빌드 스냅샷
`../sprout-work-win-build/` 폴더는 예전에 Windows 빌드용으로 떼어낸 **오래된 복사본(v1.0.1)**이다.
현재 저장소(v1.0.5+)와 `app.html`·`sw.js`가 다르다. **그 폴더에서 작업하지 말 것** — 혼동·덮어쓰기 위험.
