# 프로젝트 인수인계 (다른 PC에서 이어가기)

이 리포에는 **두 개의 웹 제품**이 함께 들어 있습니다.
- **Sprout Work** — 작업 트리 + 집중 타이머 (메인 제품). 파일: `app.html` + 마케팅 페이지들
- **SproutDesk** — 원격 팀 업무 관리 도구 (별도 프로토타입, 병행 개발 중). 파일: `sproutdesk.html`

라이브: **https://sproutwork.xyz** · 앱: **/app** · SproutDesk: **/sproutdesk**

---

## 1. 새 PC에서 시작하기
```bash
git clone https://github.com/gcstars1071-stack/sprout-work.git
cd sprout-work
git pull            # ⚠️ 항상 먼저: SproutDesk가 다른 PC에서 병행 커밋될 수 있음
```
- 정적 사이트라 **빌드 불필요**. 로컬 미리보기는 아무 정적 서버나:
  ```bash
  python3 -m http.server 8000    # → http://localhost:8000/app.html
  ```
- 편집 대상은 대부분 **단일 파일 `app.html`**(약 5000줄, HTML+CSS+JS 한 파일).

## 2. 배포 흐름 (자동)
- **GitHub `main`에 push → Cloudflare Pages가 자동 빌드·배포** (몇 분). 별도 배포 명령 없음.
- 확인 시 브라우저 **강력 새로고침(⌘⇧R / Ctrl+Shift+R)** 필요 (서비스워커 캐시).

## 3. 계정 / 인프라 (어디서 관리되나)
| 항목 | 위치 | 비고 |
|---|---|---|
| 소스/배포 트리거 | **GitHub** `gcstars1071-stack/sprout-work` | main push = 배포 |
| 호스팅 | **Cloudflare Pages** | GitHub 연동, 자동 배포 |
| DNS·SSL | **Cloudflare** | 네임서버 `*.ns.cloudflare.com` |
| 도메인 등록·갱신 | **Spaceship** | 만료 2027-06-25 |
| 백엔드(DB/Auth) | **Supabase** 프로젝트 `yifomauvulnqattaklgq` | 아래 참조 |

> 시크릿은 리포에 없음. `app.html`의 Supabase URL/anon(publishable) 키는 **공개돼도 안전**(RLS가 실제 보안). service_role 키는 절대 클라이언트에 넣지 말 것.

## 4. 백엔드 (Supabase)
- 프로젝트: `https://yifomauvulnqattaklgq.supabase.co`
- Auth: Google OAuth + 이메일/비밀번호
- 테이블: **`user_data`** (`user_id`, `data_key`, `data_value`, `updated_at`) — 앱 상태를 key별로 저장. **RLS: 본인 행만**.
  - 스키마 SQL: `sql/001_user_data.sql`, `sql/002_feedback.sql`
- **실시간 동기화**: Realtime이 `user_data`에 켜져 있어야 함 → 대시보드 **Database → Publications → `supabase_realtime` → user_data 포함**. (이미 켜둠)
- Edge Function: **`supabase/functions/delete-account/index.ts`** (회원 탈퇴, service_role로 서버측 삭제)
- OAuth redirect: Supabase Auth의 Redirect URLs에 `https://sproutwork.xyz/app` 등록돼 있어야 함.
- ⚠️ 무료 플랜은 미사용 시 프로젝트가 **자동 일시정지(paused)** 될 수 있음 → 로그인이 "Failed to fetch"면 대시보드에서 **Resume**.

## 5. 데스크톱 앱 (Electron)
- 폴더 `desktop/`. 빌드: `cd desktop && npm install && npm run dist:mac` (또는 `dist:win`).
- Windows는 Windows/CI에서 빌드 권장. 산출물은 GitHub **Releases**(현재 `v1.0.1`)에 업로드하고 `downloads.html` 링크를 그 버전으로 맞춤.
- 데스크톱은 OS 알림 + `powerMonitor`로 시스템 전역 유휴 감지 사용.

## 6. 모바일 (Capacitor)
- 폴더 `mobile/` (ios/android). 라이브 사이트를 감싸는 형태. 알림은 웹 표준 사용.

## 7. 앱 구조 메모 (app.html)
- 상태: `state.sessions`(작업), 각 세션의 `intervals`(focus/pause) — **열린 인터벌은 벽시계 시간**(시작~현재)으로 집계. 자리비움/유휴로 제외 가능.
- 저장: `localStorage` 즉시 쓰기 + 로그인 시 `cloudSet`으로 Supabase 동기화 + **Realtime 구독**으로 타기기 즉시 반영.
- i18n: en/ko/vi (`TRANSLATIONS` 객체). 새 문구는 3개 언어 모두 추가.
- 위젯: GridStack 대시보드. 모바일 1열 순서는 `applyMobileOrderIfNeeded()`가 강제 정렬.
- Pomodoro: `state.pomo`(phase/targetSec/phaseStartMs/workTaskId), 전환은 `tick()`→`pomodoroTransition()`.

## 8. 현재 상태 / 최근 작업 (요약)
- Pomodoro 자동순환(무료), 집중 인사이트(Pro 훅), 주간/월간 넛지, PDF 리포트(Pro)
- 실시간 크로스기기 동기화, 모바일 웹 알림(showNotification) 수정, 알림 무더기·깜빡임 버그 수정
- 프리셋 시간(15/25/30) → 5분으로 리셋되던 버그 수정, +30 연장 버튼 추가
- 캘린더 집중시간 색상, 휴식 초과 정리 모달, 자리비움 오탐(타기기 동기화) 수정
- 상세 이력·미해결 제안: **`docs/improvement-plan.md`** 참고

## 9. 남은 후속 과제 (backlog)
- 월간 인사이트 **이메일 발송** (Supabase Edge Function + 이메일 서비스 필요 — 미구현, 현재는 인앱 배너로 대체)
- 앱을 **완전히 닫았을 때** 알림 → Web Push(서버 푸시) 필요
- 마케팅 페이지 상단 메뉴에 SproutDesk 링크는 **index.html에만** 추가됨 → 다른 페이지에도 넣을지 결정
- 결제(Stripe 등) 연동 시 `PDF_EXPORT_PRO_ONLY`/`appSettings.plan` 게이팅 실제화

## 10. 개발 시 주의 (gotchas)
- **항상 `git pull` 먼저** — SproutDesk가 다른 PC에서 병행 커밋됨(히스토리에 `SproutDesk:` 커밋 다수).
- `app.html`은 단일 파일 → 문법 오류 하나면 전체 스크립트가 죽음. 커밋 전 검증:
  ```bash
  node --check <(python3 -c "import re;print(max(re.findall(r'<script>(.*?)</script>',open('app.html').read(),re.S),key=len))")
  ```
- 새 알림/문구는 en/ko/vi 3개 다 추가.
- 서비스워커 캐시 바꾸면 `sw.js`의 `CACHE_NAME` 버전 올릴 것.
