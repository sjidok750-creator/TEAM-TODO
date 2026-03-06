"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import {
  Sparkles, BookOpen, Upload, FileText, X,
  FolderOpen, Loader2, FileSearch, TrendingUp, Shield, Zap,
  ChevronRight, Plus, AlertCircle, CheckCircle, Files,
} from "lucide-react";
import ReviewResultView from "@/components/ReviewResult";
import type { FileReviewResult } from "@/types/review";

/* ── Constants ──────────────────────────────────────────────── */
const ALLOWED_EXT = [".docx", ".pdf", ".txt", ".md"];
const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "text/plain",
  "text/markdown",
];
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB



/* ── Helpers ────────────────────────────────────────────────── */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileGradient(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  return ({
    pdf: "from-red-500 to-rose-600",
    docx: "from-blue-500 to-blue-700",
    txt: "from-slate-400 to-slate-600",
    md: "from-purple-500 to-violet-600",
  } as Record<string, string>)[ext ?? ""] ?? "from-slate-500 to-slate-600";
}

function validateFile(file: File): string | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXT.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
    return `${file.name}: 지원하지 않는 형식 (${ALLOWED_EXT.join(", ")})`;
  }
  if (file.size > MAX_SIZE) {
    return `${file.name}: 파일 크기 초과 (최대 100MB)`;
  }
  return null;
}

/* ── Main Component ─────────────────────────────────────────── */
export default function HomePage() {
  /* Guideline */
  const [glTab, setGlTab] = useState<"select" | "upload">("select");
  const [uploadedGls, setUploadedGls] = useState<File[]>([]);
  const glSelectInputRef = useRef<HTMLInputElement>(null);
  const [glErrors, setGlErrors] = useState<string[]>([]);
  const [isDraggingGl, setIsDraggingGl] = useState(false);
  const glInputRef = useRef<HTMLInputElement>(null);

  /* Reports */
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [isDraggingRep, setIsDraggingRep] = useState(false);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const repInputRef = useRef<HTMLInputElement>(null);

  /* Review */
  const [isReviewing, setIsReviewing] = useState(false);
  const [fileResults, setFileResults] = useState<FileReviewResult[]>([]);
  const [reviewProgress, setReviewProgress] = useState<{ current: number; total: number } | null>(null);

  /* Stats — start at 0, update after each review */
  const [stats, setStats] = useState({ reviews: 0, avgScore: 0, passRate: 0, typos: 0 });
  const historyRef = useRef<{ score: number; pass: number; total: number; typos: number }[]>([]);

  /* Derived */
  const hasGuideline = uploadedGls.length > 0;
  const canReview = hasGuideline && reportFiles.length > 0 && !isReviewing;

  /* ── Handlers ─────────────────────────────────────────────── */
  function addReportFiles(incoming: FileList | File[]) {
    const errs: string[] = [];
    const valid: File[] = [];
    Array.from(incoming).forEach((f) => {
      const err = validateFile(f);
      if (err) {
        errs.push(err);
      } else if (!reportFiles.some((r) => r.name === f.name && r.size === f.size)) {
        valid.push(f);
      }
    });
    setFileErrors(errs);
    if (valid.length) setReportFiles((prev) => [...prev, ...valid]);
  }

  function removeReportFile(idx: number) {
    setReportFiles((prev) => prev.filter((_, i) => i !== idx));
    setFileErrors([]);
  }

  function onRepDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingRep(false);
    addReportFiles(e.dataTransfer.files);
  }

  function onRepInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addReportFiles(e.target.files);
    e.target.value = "";
  }

  function addGlFiles(incoming: FileList | File[]) {
    const errs: string[] = [];
    const valid: File[] = [];
    Array.from(incoming).forEach((f) => {
      const err = validateFile(f);
      if (err) {
        errs.push(err);
      } else if (!uploadedGls.some((g) => g.name === f.name && g.size === f.size)) {
        valid.push(f);
      }
    });
    setGlErrors(errs);
    if (valid.length) setUploadedGls((prev) => [...prev, ...valid]);
  }

  function removeGlFile(idx: number) {
    setUploadedGls((prev) => prev.filter((_, i) => i !== idx));
    setGlErrors([]);
  }

  function onGlDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingGl(false);
    addGlFiles(e.dataTransfer.files);
  }

  function onGlInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addGlFiles(e.target.files);
    e.target.value = "";
  }

  async function handleReview() {
    if (!canReview) return;
    setIsReviewing(true);
    setFileResults([]);

    const accumulated: FileReviewResult[] = [];

    for (let i = 0; i < reportFiles.length; i++) {
      setReviewProgress({ current: i + 1, total: reportFiles.length });

      const fd = new FormData();
      uploadedGls.forEach((f) => fd.append("guideline[]", f));
      fd.append("report[]", reportFiles[i]);

      let fr: FileReviewResult;
      try {
        const res = await fetch("/api/review", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `서버 오류 ${res.status}`);
        // API returns { results: FileReviewResult[] } with one entry
        fr = (data.results as FileReviewResult[])[0] ?? {
          fileName: reportFiles[i].name,
          error: "서버 응답 형식 오류",
        };
      } catch (e) {
        fr = { fileName: reportFiles[i].name, error: String(e) };
      }

      accumulated.push(fr);
      // Show results as they arrive — don't wait for all files
      setFileResults([...accumulated]);
    }

    setReviewProgress(null);
    setIsReviewing(false);

    /* Accumulate stats for successfully reviewed files */
    accumulated.forEach((fr) => {
      if (fr.result) {
        historyRef.current.push({
          score: fr.result.summary.score,
          pass: fr.result.summary.pass,
          total: fr.result.summary.total,
          typos: fr.result.typos.length,
        });
      }
    });
    const h = historyRef.current;
    if (h.length > 0) {
      setStats({
        reviews: h.length,
        avgScore: Math.round(h.reduce((s, x) => s + x.score, 0) / h.length),
        passRate: Math.round(
          (h.reduce((s, x) => s + x.pass, 0) / h.reduce((s, x) => s + x.total, 0)) * 100
        ),
        typos: h.reduce((s, x) => s + x.typos, 0),
      });
    }
  }

  function handleExport(format: "pdf" | "md") {
    alert(`${format.toUpperCase()} 내보내기 기능은 Phase 3에서 구현됩니다.`);
  }

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #0B1120 0%, #0F172A 50%, #0B1120 100%)" }}
    >
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #3B82F6, transparent)" }}
        />
        <div
          className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #8B5CF6, transparent)" }}
        />
        <div
          className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #10B981, transparent)" }}
        />
      </div>

      <div className="relative z-10">
        {/* ── Header ─────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-30 border-b border-white/[0.06]"
          style={{ background: "rgba(11,17,32,0.85)", backdropFilter: "blur(20px)" }}
        >
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)" }}
              >
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <span className="text-sm font-bold text-white">MY OFFICE</span>
                <span className="text-xs text-slate-500 ml-2 hidden sm:inline">
                  보고서 검토 시스템
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 hidden md:inline">
                AI 기반 지침 준수 분석 · 오타 탐지
              </span>
              <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-300">K</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Stats Bar ──────────────────────────────────────── */}
        <div
          className="border-b border-white/[0.04]"
          style={{ background: "rgba(255,255,255,0.01)" }}
        >
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  icon: FileSearch,
                  label: "이번 달 검토",
                  value: stats.reviews,
                  unit: "건",
                  gradient: "from-blue-500 to-indigo-600",
                  glow: "rgba(59,130,246,0.2)",
                },
                {
                  icon: TrendingUp,
                  label: "평균 점수",
                  value: stats.avgScore,
                  unit: "점",
                  gradient: "from-violet-500 to-purple-600",
                  glow: "rgba(139,92,246,0.2)",
                },
                {
                  icon: Shield,
                  label: "통과율",
                  value: stats.passRate,
                  unit: "%",
                  gradient: "from-emerald-500 to-teal-600",
                  glow: "rgba(16,185,129,0.2)",
                },
                {
                  icon: Zap,
                  label: "오타 탐지",
                  value: stats.typos,
                  unit: "건",
                  gradient: "from-amber-500 to-orange-500",
                  glow: "rgba(245,158,11,0.2)",
                },
              ].map(({ icon: Icon, label, value, unit, gradient, glow }) => (
                <div
                  key={label}
                  className="glass-card rounded-xl p-4 flex items-center gap-3 transition-all duration-500"
                  style={{ boxShadow: `0 4px 20px ${glow}` }}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${gradient} flex-shrink-0`}
                  >
                    <Icon size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white tabular-nums">
                      {value}
                      <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
                    </div>
                    <div className="text-xs text-slate-500">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main Content ────────────────────────────────────── */}
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 items-start">

            {/* ─── Left Panel: Controls ─────────────────────── */}
            <div className="space-y-5">

              {/* Section 1: 검토 기준 */}
              <section className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #3B82F6, #6366F1)" }}
                  >
                    <BookOpen size={16} className="text-white" />
                  </div>
                  <h2 className="text-sm font-semibold text-white">검토 기준</h2>
                  {uploadedGls.length > 0 && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/25">
                      {uploadedGls.length}개 선택됨
                    </span>
                  )}
                </div>

                {/* Tab toggle */}
                <div className="flex border-b border-white/[0.06]">
                  {(["select", "upload"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setGlTab(tab)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-all duration-200 ${
                        glTab === tab
                          ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                          : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
                      }`}
                    >
                      {tab === "select" ? (
                        <>
                          <FolderOpen size={13} />
                          파일 선택
                        </>
                      ) : (
                        <>
                          <Upload size={13} />
                          드래그 업로드
                        </>
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-5 space-y-3">
                  {/* Shared file list — shown in both tabs */}
                  {uploadedGls.length > 0 && (
                    <div className="space-y-2">
                      {uploadedGls.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                        >
                          <div
                            className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getFileGradient(file.name)} flex items-center justify-center flex-shrink-0`}
                          >
                            <FileText size={15} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                          </div>
                          <button
                            onClick={() => removeGlFile(idx)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {glTab === "select" ? (
                    /* 파일 선택: OS 파일 탐색기로 파일 선택 */
                    <>
                      <input
                        ref={glSelectInputRef}
                        type="file"
                        accept={ALLOWED_EXT.join(",")}
                        multiple
                        onChange={onGlInputChange}
                        className="hidden"
                      />
                      <button
                        onClick={() => glSelectInputRef.current?.click()}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-blue-500/40 transition-all duration-200 group"
                      >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                          <FolderOpen size={22} className="text-blue-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-white">
                            {uploadedGls.length > 0 ? "파일 추가 선택" : "파일 선택"}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            클릭하여 폴더에서 파일 선택 · 여러 파일 가능
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-slate-600 ml-auto group-hover:text-blue-400 transition-colors" />
                      </button>
                      <p className="text-xs text-slate-600 text-center">
                        지원 형식: {ALLOWED_EXT.join(" ")} · 최대 100MB
                      </p>
                    </>
                  ) : (
                    /* 드래그 업로드: 드래그&드롭 */
                    <div
                      onClick={() => glInputRef.current?.click()}
                      onDrop={onGlDrop}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingGl(true); }}
                      onDragLeave={() => setIsDraggingGl(false)}
                      className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
                        isDraggingGl
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-white/10 hover:border-blue-500/40 hover:bg-white/[0.02]"
                      }`}
                    >
                      <input
                        ref={glInputRef}
                        type="file"
                        accept={ALLOWED_EXT.join(",")}
                        multiple
                        onChange={onGlInputChange}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                            isDraggingGl ? "bg-blue-500/20" : "bg-white/[0.04]"
                          }`}
                        >
                          <Upload size={22} className={isDraggingGl ? "text-blue-400" : "text-slate-400"} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {isDraggingGl ? "여기에 놓으세요" : uploadedGls.length > 0 ? "파일 추가" : "파일을 드래그하세요"}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            드래그&amp;드롭 또는 클릭 · 여러 파일 가능 · 최대 100MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {glErrors.length > 0 && (
                    <div className="space-y-1.5">
                      {glErrors.map((err, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20"
                        >
                          <AlertCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-red-400">{err}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Section 2: 보고서 파일 */}
              <section className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #8B5CF6, #6366F1)" }}
                  >
                    <Files size={16} className="text-white" />
                  </div>
                  <h2 className="text-sm font-semibold text-white">보고서 파일</h2>
                  {reportFiles.length > 0 && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/25">
                      {reportFiles.length}개 선택됨
                    </span>
                  )}
                </div>

                <div className="p-5 space-y-3">
                  {/* File list */}
                  {reportFiles.length > 0 && (
                    <div className="space-y-2">
                      {reportFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                        >
                          <div
                            className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getFileGradient(file.name)} flex items-center justify-center flex-shrink-0`}
                          >
                            <FileText size={15} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                          </div>
                          <button
                            onClick={() => removeReportFile(idx)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Drop zone */}
                  <div
                    onClick={() => repInputRef.current?.click()}
                    onDrop={onRepDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingRep(true);
                    }}
                    onDragLeave={() => setIsDraggingRep(false)}
                    className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
                      isDraggingRep
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-white/10 hover:border-violet-500/40 hover:bg-white/[0.02]"
                    }`}
                  >
                    <input
                      ref={repInputRef}
                      type="file"
                      accept={ALLOWED_EXT.join(",")}
                      multiple
                      onChange={onRepInputChange}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                          isDraggingRep ? "bg-violet-500/20" : "bg-white/[0.04]"
                        }`}
                      >
                        <Plus
                          size={22}
                          className={isDraggingRep ? "text-violet-400" : "text-slate-400"}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {reportFiles.length > 0 ? "파일 추가" : "보고서 파일 업로드"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          드래그&amp;드롭 또는 클릭 · 여러 파일 동시 업로드 가능 · 최대 100MB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Errors */}
                  {fileErrors.length > 0 && (
                    <div className="space-y-1.5">
                      {fileErrors.map((err, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20"
                        >
                          <AlertCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-red-400">{err}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Review Button */}
              <button
                onClick={handleReview}
                disabled={!canReview}
                className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={
                  canReview
                    ? {
                        background:
                          "linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #8B5CF6 100%)",
                        boxShadow: "0 8px 30px rgba(99,102,241,0.35)",
                      }
                    : { background: "rgba(255,255,255,0.06)" }
                }
              >
                {isReviewing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    AI 검토 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    AI 검토 시작
                    <ChevronRight size={18} />
                  </>
                )}
              </button>

              {/* Readiness hints */}
              {!canReview && !isReviewing && (
                <div className="space-y-1.5">
                  {!hasGuideline && (
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-600 inline-block" />
                      검토 기준을 선택하거나 업로드해주세요
                    </p>
                  )}
                  {reportFiles.length === 0 && (
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-600 inline-block" />
                      보고서 파일을 1개 이상 업로드해주세요
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ─── Right Panel: Results ──────────────────────── */}
            <div className="space-y-5">

              {/* Reviewing — per-file progress */}
              {isReviewing && (
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="shimmer h-1 w-full" />
                  <div className="p-12 flex flex-col items-center gap-5">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
                    >
                      <Loader2 size={32} className="text-blue-400 animate-spin" />
                    </div>
                    <div className="text-center w-full max-w-xs">
                      <p className="text-lg font-semibold text-white">AI 검토 진행 중</p>
                      {reviewProgress && (
                        <>
                          <p className="text-sm text-slate-400 mt-2">
                            {reviewProgress.current} / {reviewProgress.total} 파일 분석 중
                          </p>
                          <p className="text-xs text-slate-500 mt-1 truncate px-4">
                            {reportFiles[reviewProgress.current - 1]?.name}
                          </p>
                          <div className="mt-4 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(reviewProgress.current / reviewProgress.total) * 100}%`,
                                background: "linear-gradient(90deg, #3B82F6, #8B5CF6)",
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 파일별 검토 결과 — 수직 나열 ───────────────── */}
              {fileResults.length > 0 && !isReviewing && (
                <div className="space-y-5">
                  {/* 상단 요약 헤더 */}
                  <div
                    className="px-4 py-3 rounded-xl flex items-center justify-between"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <p className="text-sm font-semibold text-white">파일별 검토 결과</p>
                    <span className="text-xs text-slate-500">{fileResults.length}개 파일 · 검토 완료</span>
                  </div>

                  {/* 파일마다 — 파일명 헤더 + 결과 카드 */}
                  {fileResults.map((fr, idx) =>
                    fr.error ? (
                      <div
                        key={idx}
                        className="glass-card rounded-2xl p-6 border border-red-500/20"
                      >
                        <p className="text-sm font-semibold text-white mb-1 truncate">{fr.fileName}</p>
                        <p className="text-xs text-red-400 whitespace-pre-wrap">{fr.error}</p>
                      </div>
                    ) : fr.result ? (
                      <ReviewResultView
                        key={idx}
                        fileName={fr.fileName}
                        result={fr.result}
                        onExport={handleExport}
                      />
                    ) : null
                  )}
                </div>
              )}

              {/* Empty state */}
              {fileResults.length === 0 && !isReviewing && (
                <div className="glass-card rounded-2xl p-16 flex flex-col items-center gap-4 text-center">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-white/[0.03]">
                    <FileSearch size={32} className="text-slate-700" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-400">
                      검토 결과가 여기에 표시됩니다
                    </p>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      좌측에서 검토 기준과 보고서 파일을 선택한 후
                      <br />
                      AI 검토 시작 버튼을 눌러주세요
                    </p>
                  </div>
                  <div className="flex items-center gap-6 mt-4">
                    {[
                      { num: "01", text: "검토 기준 선택" },
                      { num: "02", text: "보고서 업로드" },
                      { num: "03", text: "AI 검토 시작" },
                    ].map(({ num, text }) => (
                      <div key={num} className="flex flex-col items-center gap-1.5">
                        <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                          <span className="text-xs font-bold text-slate-600">{num}</span>
                        </div>
                        <span className="text-xs text-slate-600">{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
