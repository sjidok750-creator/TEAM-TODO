# 보고서 검토 앱 (Report Review App) — 계획서

**작성일:** 2026-03-04
**상태:** 초안 (Draft v2 — 지침 자동 다운로드 방식으로 수정)

---

## 1. 프로젝트 개요

### 목적
작성된 보고서 파일을 **기관 내부 API에서 자동으로 다운로드한 최신 지침**과 비교하여:
- 지침 준수 여부를 항목별로 검토
- 오타·오기·문법 오류를 탐지
- 교정 제안 및 검토 결과 리포트를 생성

### 기대 효과
- 수동 검토 시간 단축
- 항상 **최신 지침** 기준으로 자동 검토 (버전 불일치 문제 제거)
- 누락 항목·형식 오류의 일관된 탐지
- 보고서 품질 표준화

---

## 2. 핵심 기능

| 번호 | 기능 | 설명 |
|------|------|------|
| F-01 | 보고서 파일 업로드 | 검토할 보고서 파일 업로드 (.docx, .pdf, .txt, .md) |
| F-02 | 지침 자동 다운로드 | 기관 내부 API에 연결하여 최신 지침 파일 자동 취득 |
| F-03 | 지침 버전 표시 | 다운로드된 지침의 버전·일자를 화면에 표시 |
| F-04 | 지침 준수 검토 | AI가 지침의 각 항목을 추출하고 보고서와 대조 |
| F-05 | 오타·오기 탐지 | 맞춤법, 오탈자, 비표준 용어 감지 |
| F-06 | 검토 결과 리포트 | 항목별 Pass/Fail, 문제 위치, 교정 제안 출력 |
| F-07 | 리포트 내보내기 | 결과를 PDF 또는 Markdown 파일로 다운로드 |

---

## 3. 기술 스택

### Frontend
- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **파일 업로드:** react-dropzone
- **UI 컴포넌트:** shadcn/ui

### Backend
- **Runtime:** Node.js 22 (Next.js API Routes)
- **AI 엔진:** Claude API (claude-sonnet-4-6) — 지침 준수 분석 + 오타 탐지
- **지침 다운로드:** 기관 내부 API (HTTP/HTTPS, 인증 토큰 방식)
- **파일 파싱:**
  - `.docx` → mammoth (Word → HTML/Text)
  - `.pdf` → pdf-parse
  - `.txt` / `.md` → 직접 읽기

### 인프라 (향후)
- **배포:** 사내 서버 또는 Vercel (VPN 접근 가능 환경)
- **저장소:** 파일은 서버 메모리 처리 (업로드 파일 저장 안 함, 보안 강화)

---

## 4. 시스템 아키텍처

```
[기관 내부 API 서버]
   │  최신 지침 파일 제공
   │  (REST API / 파일 다운로드 엔드포인트)
   │
   ▼
[Next.js API Route: /api/guideline/fetch]
   - API 인증 (토큰/키)
   - 지침 파일 다운로드
   - 파싱 후 캐싱 (TTL 설정)
   │
   │                    [사용자]
   │                       │
   │                  보고서 파일 업로드
   │                       │
   ▼                       ▼
[Next.js API Route: /api/review]
   1. 캐시된 최신 지침 텍스트 로드
   2. 보고서 파일 파싱 (mammoth / pdf-parse)
   3. Claude API 호출 (지침 + 보고서 전달)
         │
         ▼
[Claude API]
   - 지침 항목 추출
   - 보고서 vs 지침 비교 분석
   - 오타·오기 탐지
   - JSON 형식으로 결과 반환
         │
         ▼
[결과 화면]
   - 적용된 지침 버전 표시
   - 항목별 Check 결과
   - 오류 위치 + 교정 제안
   - 전체 점수 / 등급
   - PDF 내보내기
```

---

## 5. 지침 자동 다운로드 상세

### 5-1. 지침 API 연동 방식

```typescript
// lib/guideline-fetcher.ts
async function fetchLatestGuideline(): Promise<GuidelineData> {
  const res = await fetch(process.env.GUIDELINE_API_URL, {
    headers: {
      'Authorization': `Bearer ${process.env.GUIDELINE_API_TOKEN}`,
      'Accept': 'application/json',
    },
  });
  // 파일 URL 또는 텍스트 내용 반환
  const data = await res.json();
  return {
    version: data.version,
    updatedAt: data.updatedAt,
    fileUrl: data.fileUrl,   // 또는 content 직접 반환
  };
}
```

### 5-2. 캐싱 전략

| 항목 | 설정 |
|------|------|
| 캐시 방식 | 서버 메모리 캐시 (Next.js unstable_cache) |
| TTL | 1시간 (환경변수로 조정 가능) |
| 강제 갱신 | 관리자 버튼 또는 `/api/guideline/refresh` 엔드포인트 |
| 캐시 실패 시 | 이전 버전 유지 + 사용자에게 경고 표시 |

### 5-3. 지침 버전 표시 (UI)

```
┌─────────────────────────────────────────┐
│  적용 지침: 업무보고서 작성지침 v2.3    │
│  최종 업데이트: 2026-02-28              │
│  [지침 새로고침]                        │
└─────────────────────────────────────────┘
```

---

## 6. Claude API 프롬프트 전략

### 역할 분리 (2-pass 방식)

**Pass 1 — 지침 파싱:**
```
지침 파일에서 검토 항목을 구조화된 JSON으로 추출:
{ "rules": [{ "id": "R01", "category": "형식", "rule": "제목은 굵게 표시" }] }
```

**Pass 2 — 보고서 검토:**
```
추출된 규칙 목록과 보고서 텍스트를 함께 전달하여:
- 각 규칙별 준수 여부 (pass/fail/partial)
- 문제가 발견된 위치(문장/단락)
- 오타·오기 목록
- 교정 제안
를 JSON으로 반환
```

### 출력 형식 (JSON Schema)
```json
{
  "guideline": { "version": "v2.3", "updatedAt": "2026-02-28" },
  "summary": { "total": 10, "pass": 7, "fail": 2, "partial": 1, "score": 75 },
  "rules": [
    {
      "id": "R01",
      "rule": "제목은 굵게 표시",
      "status": "fail",
      "location": "3페이지 2번 항목",
      "suggestion": "제목 텍스트에 Bold 서식 적용 필요"
    }
  ],
  "typos": [
    {
      "original": "기술직원",
      "corrected": "기술 직원",
      "location": "5페이지 3번째 줄"
    }
  ]
}
```

---

## 7. 화면 구성

```
┌─────────────────────────────────────────────┐
│         보고서 검토 앱                       │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐    │
│  │  적용 지침: 업무보고서 작성지침 v2.3 │    │
│  │  업데이트: 2026-02-28  [새로고침]    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [1단계] 보고서 파일 업로드                  │
│  ┌───────────────────────────────┐          │
│  │       보고서 파일 드래그&드롭  │          │
│  │   (.docx / .pdf / .txt / .md) │          │
│  └───────────────────────────────┘          │
│            [ 검토 시작 ]                     │
├─────────────────────────────────────────────┤
│  [2단계] 검토 결과                           │
│  ■ 전체 점수: 75점 / 100점                  │
│                                             │
│  ✅ R01. 제목 형식 — 통과                   │
│  ❌ R02. 날짜 표기 — 불일치 → 교정 제안     │
│  ⚠️  R03. 서명란 — 부분 충족               │
│                                             │
│  오타/오기 목록                              │
│  • "기술직원" → "기술 직원" (5p 3줄)        │
│                                             │
│  [ PDF 내보내기 ]  [ Markdown 내보내기 ]    │
└─────────────────────────────────────────────┘
```

---

## 8. 디렉터리 구조

```
MY-OFFICE-/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # 메인 페이지 (업로드 + 결과)
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── review/
│   │       │   └── route.ts            # 보고서 검토 API
│   │       └── guideline/
│   │           ├── fetch/route.ts      # 지침 다운로드 API
│   │           └── refresh/route.ts   # 지침 강제 갱신 API
│   ├── components/
│   │   ├── GuidelineInfo.tsx           # 현재 지침 버전 표시
│   │   ├── FileUploader.tsx            # 보고서 파일 업로드 UI
│   │   ├── ReviewResult.tsx            # 결과 표시 컴포넌트
│   │   ├── RuleItem.tsx                # 규칙별 결과 행
│   │   └── TypoList.tsx                # 오타 목록
│   ├── lib/
│   │   ├── guideline-fetcher.ts        # 기관 API 연동 + 캐싱
│   │   ├── file-parser.ts              # 파일 파싱 (docx/pdf/txt)
│   │   ├── claude-client.ts            # Claude API 클라이언트
│   │   └── review-prompt.ts            # 프롬프트 템플릿
│   └── types/
│       └── review.ts                   # TypeScript 타입 정의
├── docs/
│   └── plan.md                         # 이 파일
├── .env.example
├── package.json
└── CLAUDE.md
```

---

## 9. 개발 단계 (Milestones)

### Phase 1 — 기본 동작 (MVP)
- [ ] Next.js 프로젝트 초기화
- [ ] 기관 API 연동 + 지침 자동 다운로드 구현
- [ ] 보고서 파일 업로드 UI (txt, md 우선)
- [ ] Claude API 연동 + 기본 검토 프롬프트
- [ ] 결과 화면 구현 (지침 버전 표시 포함)

### Phase 2 — 파일 형식 확장
- [ ] .docx 파싱 (mammoth)
- [ ] .pdf 파싱 (pdf-parse)
- [ ] 지침 캐싱 + 강제 갱신 기능
- [ ] 결과 UI 개선 (항목별 아코디언)

### Phase 3 — 리포트 내보내기
- [ ] 결과 PDF 생성 (jsPDF 또는 Puppeteer)
- [ ] Markdown 내보내기
- [ ] 지침 버전 정보를 리포트에 포함

### Phase 4 — 품질 개선
- [ ] 검토 정확도 향상 (프롬프트 튜닝)
- [ ] 처리 속도 최적화 (스트리밍 응답)
- [ ] 에러 처리 강화 (API 다운 시 fallback)

---

## 10. 환경 변수

```bash
# .env.example

# Claude AI
ANTHROPIC_API_KEY=your-claude-api-key-here

# 기관 지침 API
GUIDELINE_API_URL=https://internal.example.com/api/guidelines/latest
GUIDELINE_API_TOKEN=your-internal-api-token-here
GUIDELINE_CACHE_TTL_SECONDS=3600

# 앱 설정
MAX_FILE_SIZE_MB=10
```

---

## 11. 리스크 및 고려사항

| 리스크 | 대응 방안 |
|--------|-----------|
| 기관 API 장애 | 캐시된 이전 지침으로 fallback + 경고 배너 표시 |
| API 인증 만료 | 토큰 갱신 알림 + 관리자 재설정 UI |
| 대용량 파일 처리 | 파일 크기 제한 (10MB), 청크 분할 처리 |
| Claude API 응답 지연 | 스트리밍 응답 + 로딩 UI |
| 민감 문서 보안 | 서버에 파일 저장 안 함, HTTPS 전송 |
| 비용 관리 | 토큰 사용량 모니터링, 요청당 상한선 설정 |

---

*계획서 최초 작성: 2026-03-04 / v2 수정: 2026-03-04 (지침 자동 다운로드 방식으로 변경)*
