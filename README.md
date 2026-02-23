# 내란 우두머리 윤석열의 10가지 거짓말

**10 Lies of Insurrection Ringleader Yoon Suk-yeol**

인터랙티브 저널리즘 · Interactive Journalism

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

> [Live Demo](https://jaysongpung.github.io/liar-sisain/) · [시사IN](https://www.sisain.co.kr/) · [Studio Velcro](https://www.studio-velcro.com/)

---

## 한국어

### 개요

2024년 12월 3일 밤, 윤석열은 비상계엄을 선포했다. 이후 내란 우두머리 혐의로 재판에 넘겨졌고, 2026년 2월 19일 무기징역을 선고받았다.

이 프로젝트는 **312일간의 재판 기록**을 인터랙티브 웹 기사로 구현한 것이다. 44차례 공판, 61명 증인의 증언을 토대로, 피고인 윤석열의 **10가지 거짓말**과 그것을 무너뜨린 증거를 대조한다.

- **글**: 이은기
- **기획·취재**: 이은기 / 문준영 / 김동인
- **사진**: 시사IN 사진팀, 연합뉴스
- **제작**: [Studio Velcro](https://www.studio-velcro.com/)

### 주요 기능

- **스크롤 연동 SVG 관계도** — 31명의 내란 관련 인물 관계를 시각화. 스크롤에 따라 인물 노드가 점진적으로 드러남
  - PC: 왼쪽 고정 패널, 팬/줌 지원, 인물 클릭 시 모달
  - 모바일: 풀스크린 오버레이, 바텀시트
- **증언 대화 섹션** — 증인 직접 인용, 통화 녹취록, 증거 이미지 갤러리
- **플로팅 내비게이션** — 현재 거짓말 번호를 표시하는 스티키 버블 + 드롭다운 점프
- **반응형 레이아웃** — 1024px 기준으로 2단/1단 분기
- **GA4 커스텀 이벤트 20개** — 콘텐츠 진행, 관계도 상호작용, 인물 참여도 등 ([ANALYTICS.md](ANALYTICS.md) 참조)

### 로컬 실행

ES 모듈 + CSS import를 사용하므로 Vite 개발 서버가 필요합니다.

```bash
npm install
npm run dev
```

> `file://`로 직접 열면 CORS 정책 때문에 작동하지 않습니다.

### 프로젝트 구조

```
├── index.html                  # 진입점 (GA4, OG 태그, 폰트)
├── src/
│   ├── main.js                 # 앱 엔트리 — 레이아웃 조립, 이벤트 조율
│   ├── style.css               # 전역 레이아웃 (2단 플렉스, 모바일 오버레이)
│   ├── colors.css              # CSS 커스텀 프로퍼티 색상 시스템
│   ├── analytics.js            # GA4 커스텀 이벤트 트래킹
│   ├── components/
│   │   ├── IntroSection.js     # 히어로 이미지 + 기사 도입부
│   │   ├── ClaimCard.js        # 윤석열 발언 카드 (10개)
│   │   ├── ChatContainer.js    # 증언 대화 섹션 (21KB)
│   │   ├── RelationshipMap.js  # SVG 관계도, 팬/줌 (24KB)
│   │   ├── OutroSection.js     # 마무리 + 크레딧
│   │   ├── StickyClaimBubble.js # 플로팅 내비게이션 버블
│   │   └── spacingRules.js     # 공유 여백 로직
│   └── data/
│       ├── claims.js           # 10개 거짓말 (원문 인용 + 요약)
│       ├── people.js           # 31명 인물 (역할, 약력, 계층 구조)
│       ├── dialogue.js         # 증언 데이터 (41KB)
│       ├── mapState.js         # SVG 노드 좌표
│       └── content.js          # 제목, 서두, 크레딧, 결론
├── public/
│   └── images/                 # 증거 이미지, 인물 사진
├── ANALYTICS.md                # GA4 이벤트 문서
├── vite.config.js              # Vite 빌드 설정
└── package.json
```

### 기술 스택

| 분류 | 도구 |
|------|------|
| 언어 | Vanilla JavaScript (ES Modules) |
| 빌드 | Vite |
| 스타일 | CSS Custom Properties |
| 서체 | Pretendard Variable + Noto Serif KR (CDN) |
| 관계도 | SVG (팬/줌 직접 구현) |
| 분석 | Google Analytics 4 |

### 데이터 구조

`src/data/` 아래 5개의 순수 JS 모듈로 구성되어 있다. API 호출 없이 모든 데이터가 코드에 포함되어 있다.

| 파일 | 내용 |
|------|------|
| `claims.js` | 10개 거짓말 — 1차·43차 공판 윤석열 발언 원문 |
| `people.js` | 31명 인물 — 이름, 역할, 약력, `reportsTo` 계층 구조 |
| `dialogue.js` | 증언 데이터 — `person`, `transcript`, `image`, `gallery`, `calllog` 타입 |
| `mapState.js` | SVG 관계도 노드 좌표 및 스타일 설정 |
| `content.js` | 제목, 서두 텍스트, 크레딧, 결론 |

### `?editor` 모드

URL에 `?editor`를 추가하면 SVG 관계도를 전체 화면으로 표시하고, 노드 위치를 드래그로 편집할 수 있는 편집 모드가 활성화된다. 이 모드에서는 애널리틱스 이벤트가 발생하지 않는다.

### 라이선스

CC BY-NC 4.0 — 비상업적 목적에 한해 저작자 표시 후 자유롭게 사용 가능.

이미지 저작권: 시사IN 사진팀, 연합뉴스.

---

## English

### Overview

On the night of December 3, 2024, South Korean President Yoon Suk-yeol declared emergency martial law. He was subsequently charged as the ringleader of an insurrection and sentenced to life in prison on February 19, 2026.

This project is an **interactive web article** covering **312 days of trial proceedings** — 44 court hearings and 61 witnesses. It contrasts 10 specific lies told by the defendant with the testimony and evidence that dismantled each one.

Published by [SisaIN](https://www.sisain.co.kr/) magazine. Built by [Studio Velcro](https://www.studio-velcro.com/).

### Key Features

- **Scroll-synced SVG relationship map** — visualizes 31 key figures in the insurrection hierarchy. Nodes progressively reveal as the user scrolls
  - Desktop: sticky side panel with pan/zoom, click-to-focus person modal
  - Mobile: fullscreen overlay with bottom sheet
- **Testimony dialogue sections** — direct witness quotes, phone call transcripts, evidence photo galleries
- **Floating navigation** — sticky bubble showing current claim number + dropdown to jump between sections
- **Responsive layout** — two-column (desktop) / single-column (mobile) at 1024px breakpoint
- **20 custom GA4 analytics events** — content progression, map interaction, person engagement (see [ANALYTICS.md](ANALYTICS.md))

### Running Locally

Uses ES module CSS imports, so a Vite dev server is required.

```bash
npm install
npm run dev
```

> Opening `index.html` directly via `file://` will not work due to CORS restrictions on ES modules.

### Architecture

**No framework.** Each component is a plain function that creates and returns a DOM element.

#### Components

| Component | Role |
|-----------|------|
| `IntroSection()` | Hero image + article introduction |
| `ClaimCard(group, index)` | Displays one of Yoon's 10 claims with his portrait |
| `DialogueSection(quoteId)` | All testimony for one claim (text, transcripts, galleries) |
| `RelationshipMap()` | Full SVG relationship map with pan/zoom |
| `OutroSection()` | Closing text and credits |
| `StickyClaimBubble(panel)` | Floating navigation showing current claim |

#### Event-Driven Coordination

Components communicate via `CustomEvent` on `window`:

| Event | Purpose |
|-------|---------|
| `open-map-overlay` | Opens map panel, centers on a person |
| `person-revealed` | Reveals a person node on the map |
| `person-focus-changed` | Highlights + pans to person (desktop) |

#### CSS Architecture

- `colors.css` — CSS custom properties (single source of truth for all colors)
- `style.css` — global layout (two-column flex, mobile overlay breakpoints)
- Per-component `.css` files co-located with their `.js`

#### Data Layer

Pure JS modules exporting plain objects/arrays in `src/data/`. No API calls — all data is embedded in the source code.

### `?editor` Mode

Append `?editor` to the URL for a fullscreen map editor where node positions can be adjusted by dragging. Produces no analytics events.

### License

[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) — free to share and adapt for non-commercial purposes with attribution.

Images copyright SisaIN / Yonhap News Agency.
