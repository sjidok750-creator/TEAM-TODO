export interface GuidelineInfo {
  version: string;
  updatedAt: string;
  title: string;
  status: "loaded" | "loading" | "error";
}

export interface RuleResult {
  id: string;
  /** "overall" = 최초 종합 검토, "detail" = 세부사항 검토 */
  category: "overall" | "detail";
  rule: string;
  status: "pass" | "fail" | "partial";
  location?: string;
  suggestion?: string;
}

/** 페이지 단위 구체적 오류/경고 발견 사항 */
export interface Finding {
  /** 발견 위치 (예: "p.52", "표지·p.3·말미", "목차(i페이지)") */
  page: string;
  /** 오류 유형 (예: "용역명 오류", "손상수량 불일치") */
  type: string;
  /** 구체적 오류 내용 (예: "풍덕천교정밀안전점검 → 풍덕천교 정밀안전진단용역") */
  detail: string;
  /** error: 반드시 수정, warning: 권고 수정 */
  severity: "error" | "warning";
}

export interface TypoItem {
  original: string;
  corrected: string;
  location: string;
}

export interface ReviewSummary {
  total: number;
  pass: number;
  fail: number;
  partial: number;
  score: number;
}

export interface ReviewResult {
  guideline: { version: string; updatedAt: string };
  summary: ReviewSummary;
  /** 페이지 단위 구체적 발견 사항 (가장 먼저 표시) */
  findings: Finding[];
  /** 검토 항목별 pass/fail/partial 체크 (요약용) */
  rules: RuleResult[];
  typos: TypoItem[];
}

/** API 응답에서 파일 1개의 검토 결과 */
export interface FileReviewResult {
  fileName: string;
  result?: ReviewResult;
  /** 파싱 또는 API 오류 시 */
  error?: string;
}
