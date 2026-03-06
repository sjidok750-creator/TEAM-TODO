import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { ReviewResult, FileReviewResult } from "@/types/review";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large files

// ─── Text extraction ──────────────────────────────────────────────────────────

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer, verbosity: 0 });
    const result = await parser.getText();
    return result.text;
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value as string;
  }

  // Plain text / markdown
  return buffer.toString("utf-8");
}

// Trim text to avoid exceeding context window (approx 80K chars ≈ 20K tokens)
function trimText(text: string, maxChars = 80_000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[... 이하 내용은 길이 제한으로 생략됨 ...]";
}

// ─── Claude prompt ────────────────────────────────────────────────────────────

function buildPrompt(guidelineText: string, reportText: string): string {
  return `당신은 시설물 안전점검 및 정밀안전진단 보고서 검토 전문가입니다.

아래에 주어진 검토기준과 평가사례를 면밀히 분석한 후,
검토 대상 보고서가 해당 기준에 적합하게 작성되었는지 철저히 검토하세요.

─────────────────────────────────────────
【검토기준 및 평가사례】
─────────────────────────────────────────
${guidelineText}

─────────────────────────────────────────
【검토 대상 보고서】
─────────────────────────────────────────
${reportText}

─────────────────────────────────────────
【검토 지시사항】
─────────────────────────────────────────
1. 검토기준의 각 요구사항을 하나씩 확인하여 보고서가 기준에 부합하는지 판단하세요.
2. 평가사례에서 제시된 문제점 유형(오기, 누락, 불일치, 오산정 등)이 이 보고서에도 나타나는지 확인하세요.
3. 페이지, 표, 그림 등 구체적인 위치를 명시하여 오류 및 미흡 사항을 기록하세요.
4. 보고서 내 용역명, 수량, 날짜, 등급, 계산값 등 핵심 데이터의 내부 일관성을 검증하세요.
5. 오타·오기·표기 오류도 확인하세요.
6. score는 발견된 오류의 심각도와 개수를 고려하여 100점 만점으로 산정하세요.
   - 치명적 오류(error) 1건당 약 −10점, 경고(warning) 1건당 약 −3점 기준.
   - 최저 0점.

─────────────────────────────────────────
【출력 형식】반드시 아래 JSON만 출력하세요. 다른 텍스트는 일절 포함하지 마세요.
─────────────────────────────────────────
{
  "guideline": { "version": "v2.3", "updatedAt": "2026-02-28" },
  "summary": {
    "total": <검토항목 수, 정수>,
    "pass": <통과 항목 수, 정수>,
    "fail": <불합격 항목 수, 정수>,
    "partial": <부분 통과 항목 수, 정수>,
    "score": <0~100 정수>
  },
  "findings": [
    {
      "page": "p.X 또는 '표지', '목차 p.ii' 등 구체적 위치",
      "type": "오류 유형 (예: 용역명 오류, 손상수량 불일치, 날짜 혼재, 누락 등)",
      "detail": "기준과 보고서 내용을 대비하여 구체적으로 설명 (원문 인용 포함)",
      "severity": "error 또는 warning"
    }
  ],
  "rules": [
    {
      "id": "rule-1",
      "category": "overall 또는 detail",
      "rule": "검토 항목명 (예: 업무 수행 근거 기재, 용역명 통일성 등)",
      "status": "pass, fail, partial 중 하나",
      "location": "해당 위치 (없으면 생략)",
      "suggestion": "개선 방향 (없으면 생략)"
    }
  ],
  "typos": [
    {
      "original": "보고서 내 오류 표현",
      "corrected": "올바른 표현",
      "location": "발견 위치"
    }
  ]
}`;
}

// ─── API handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData 파싱 실패" }, { status: 400 });
  }

  // Collect guideline files (key: "guideline[]")
  const guidelineFiles = formData.getAll("guideline[]") as File[];
  // Collect report files (key: "report[]")
  const reportFiles = formData.getAll("report[]") as File[];

  if (guidelineFiles.length === 0 || reportFiles.length === 0) {
    return NextResponse.json(
      { error: "검토기준 파일과 보고서 파일을 모두 업로드해 주세요." },
      { status: 400 }
    );
  }

  // Extract guideline text (all guideline files concatenated)
  let guidelineText = "";
  for (const f of guidelineFiles) {
    try {
      const text = await extractText(f);
      guidelineText += `\n\n=== ${f.name} ===\n${text}`;
    } catch (e) {
      console.error(`[review] guideline 파싱 실패: ${f.name}`, e);
      guidelineText += `\n\n=== ${f.name} === [파싱 실패: ${String(e)}]`;
    }
  }
  guidelineText = trimText(guidelineText, 60_000);

  const client = new Anthropic({ apiKey });
  const results: FileReviewResult[] = [];

  for (const reportFile of reportFiles) {
    let reportText: string;
    try {
      reportText = await extractText(reportFile);
    } catch (e) {
      console.error(`[review] report 파싱 실패: ${reportFile.name}`, e);
      results.push({
        fileName: reportFile.name,
        error: `파일 파싱 실패: ${String(e)}`,
      });
      continue;
    }

    reportText = trimText(reportText, 80_000);

    const prompt = buildPrompt(guidelineText, reportText);

    let raw: string;
    try {
      const message = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });

      const block = message.content.find((b) => b.type === "text");
      raw = block ? block.text : "";
    } catch (e) {
      console.error(`[review] Claude API 호출 실패: ${reportFile.name}`, e);
      results.push({
        fileName: reportFile.name,
        error: `Claude API 오류: ${String(e)}`,
      });
      continue;
    }

    // Parse JSON from Claude's response
    let reviewResult: ReviewResult;
    try {
      // Strip any markdown code fences if present
      const jsonStr = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      reviewResult = JSON.parse(jsonStr) as ReviewResult;
    } catch (e) {
      console.error(`[review] JSON 파싱 실패`, e, "\nRaw:", raw.slice(0, 500));
      results.push({
        fileName: reportFile.name,
        error: `응답 파싱 실패. Claude 원문:\n${raw.slice(0, 1000)}`,
      });
      continue;
    }

    results.push({ fileName: reportFile.name, result: reviewResult });
  }

  return NextResponse.json({ results });
}
