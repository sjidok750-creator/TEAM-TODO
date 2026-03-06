"use client";

import { useState } from "react";
import {
  CheckCircle2, XCircle, AlertCircle, Lightbulb,
  Download, MapPin, AlertTriangle, Info,
  ChevronDown, ChevronUp, FileText,
} from "lucide-react";
import type { ReviewResult, RuleResult, Finding } from "@/types/review";

/* ── Finding row ─────────────────────────────────────────── */
function FindingRow({ f }: { f: Finding }) {
  const isError = f.severity === "error";
  return (
    <div
      className={`flex gap-3 px-4 py-3.5 border-b last:border-b-0 transition-colors hover:bg-white/[0.03] ${
        isError ? "border-white/[0.05]" : "border-white/[0.04]"
      }`}
    >
      {/* Severity icon */}
      <div className="flex-shrink-0 mt-0.5">
        {isError ? (
          <AlertTriangle size={14} className="text-red-400" />
        ) : (
          <Info size={14} className="text-amber-400" />
        )}
      </div>

      {/* Page badge */}
      <div className="flex-shrink-0 min-w-[80px]">
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded ${
            isError
              ? "bg-red-500/10 text-red-300 border border-red-500/20"
              : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
          }`}
        >
          {f.page}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-300 mb-0.5">{f.type}</p>
        <p className="text-xs text-slate-400 leading-relaxed">{f.detail}</p>
      </div>
    </div>
  );
}

/* ── Compact rule row (in collapsible summary) ───────────── */
function RuleRow({ rule }: { rule: RuleResult }) {
  const config = {
    pass:    { icon: <CheckCircle2 size={13} />, cls: "text-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "적합" },
    fail:    { icon: <XCircle size={13} />,       cls: "text-red-400",     badge: "bg-red-500/10 text-red-400 border-red-500/20",           label: "불일치" },
    partial: { icon: <AlertCircle size={13} />,   cls: "text-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",     label: "부분" },
  }[rule.status];

  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-white/[0.04] last:border-b-0">
      <span className={`${config.cls} flex-shrink-0 mt-0.5`}>{config.icon}</span>
      <span className="text-xs font-mono text-slate-600 flex-shrink-0 w-8">{rule.id}</span>
      <span className="text-xs text-slate-300 flex-1">{rule.rule}</span>
      <span className={`text-[11px] px-1.5 py-0.5 rounded border flex-shrink-0 ${config.badge}`}>
        {config.label}
      </span>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */
interface ReviewResultProps {
  fileName?: string;
  result: ReviewResult;
  onExport: (format: "pdf" | "md") => void;
}

export default function ReviewResultView({ fileName, result, onExport }: ReviewResultProps) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const { summary, findings, rules, typos } = result;

  const scoreColor =
    summary.score >= 80 ? "text-emerald-400" :
    summary.score >= 60 ? "text-amber-400" : "text-red-400";

  const scoreGradient =
    summary.score >= 80 ? "from-emerald-500 to-teal-500" :
    summary.score >= 60 ? "from-amber-500 to-orange-500" : "from-red-500 to-rose-500";

  const errorCount   = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">

      {/* ── Header: file name + score ─────────────────────── */}
      <div
        className="px-5 py-4 border-b border-white/[0.06]"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <div className="flex items-center gap-4">
          {/* File icon + name */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}
            >
              <FileText size={16} className="text-indigo-400" />
            </div>
            <div className="min-w-0">
              {fileName && (
                <p className="text-sm font-semibold text-white truncate">{fileName}</p>
              )}
              <p className="text-xs text-slate-500">
                지침 {result.guideline.version} · {result.guideline.updatedAt} 기준
              </p>
            </div>
          </div>

          {/* Score ring (compact) */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                <circle
                  cx="28" cy="28" r="22"
                  fill="none"
                  stroke={summary.score >= 80 ? "#10B981" : summary.score >= 60 ? "#F59E0B" : "#EF4444"}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - summary.score / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-base font-bold leading-none ${scoreColor}`}>{summary.score}</span>
                <span className="text-[10px] text-slate-500 leading-none">점</span>
              </div>
            </div>

            {/* pass/fail/partial mini summary */}
            <div className="flex flex-col gap-1 text-xs">
              <span className="text-emerald-400">적합 <b>{summary.pass}</b></span>
              <span className="text-red-400">불일치 <b>{summary.fail}</b></span>
              <span className="text-amber-400">부분 <b>{summary.partial}</b></span>
            </div>
          </div>
        </div>

        {/* Score progress bar */}
        <div className="mt-3">
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${scoreGradient} transition-all duration-1000`}
              style={{ width: `${summary.score}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Findings section ──────────────────────────────── */}
      <div>
        {/* Section label */}
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <AlertTriangle size={13} className="text-red-400" />
          <span className="text-xs font-semibold text-slate-300">오류·경고 발견 내역</span>
          {errorCount > 0 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 ml-1">
              오류 {errorCount}건
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              경고 {warningCount}건
            </span>
          )}
        </div>

        {findings.length === 0 ? (
          <div className="px-5 py-6 flex items-center gap-2 text-emerald-400">
            <CheckCircle2 size={15} />
            <span className="text-sm">발견된 오류 없음 — 검토기준 충족</span>
          </div>
        ) : (
          <div>
            {findings.map((f, i) => (
              <FindingRow key={i} f={f} />
            ))}
          </div>
        )}
      </div>

      {/* ── Rule checklist (collapsible) ──────────────────── */}
      <div className="border-t border-white/[0.06]">
        <button
          onClick={() => setRulesOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-slate-400 hover:text-slate-300 hover:bg-white/[0.02] transition-colors"
        >
          <span>검토 항목 체크리스트 ({summary.total}개 항목)</span>
          {rulesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {rulesOpen && (
          <div className="px-4 pb-3">
            {rules.map((r) => <RuleRow key={r.id} rule={r} />)}
          </div>
        )}
      </div>

      {/* ── Typos ─────────────────────────────────────────── */}
      {typos.length > 0 && (
        <div className="border-t border-white/[0.06]">
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">오타·오기 목록</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {typos.length}건
            </span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {typos.map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 px-5 py-2.5 text-xs">
                <span className="font-mono text-red-400 line-through opacity-70">{t.original}</span>
                <span className="text-slate-600">→</span>
                <span className="font-mono text-emerald-400 font-medium">{t.corrected}</span>
                <span className="ml-auto flex items-center gap-1 text-slate-500">
                  <MapPin size={10} />
                  {t.location}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Export ─────────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] px-5 py-4 flex gap-3">
        <button
          onClick={() => onExport("pdf")}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #3B82F6, #6366F1)" }}
        >
          <Download size={14} />
          PDF 내보내기
        </button>
        <button
          onClick={() => onExport("md")}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm text-slate-300 border border-white/10 hover:bg-white/[0.04] transition-all active:scale-[0.98]"
        >
          <Download size={14} />
          Markdown
        </button>
      </div>
    </div>
  );
}
