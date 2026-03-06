"use client";

import { BookOpen, RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { GuidelineInfo } from "@/types/review";

interface GuidelineInfoProps {
  guideline: GuidelineInfo;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function GuidelineInfoCard({
  guideline,
  onRefresh,
  isRefreshing,
}: GuidelineInfoProps) {
  const statusIcon = {
    loaded: <CheckCircle size={14} className="text-emerald-400" />,
    loading: <Loader2 size={14} className="text-blue-400 animate-spin" />,
    error: <AlertCircle size={14} className="text-red-400" />,
  }[guideline.status];

  const statusText = {
    loaded: "최신 지침 적용됨",
    loading: "지침 불러오는 중...",
    error: "지침 로드 실패",
  }[guideline.status];

  return (
    <div className="glass-card glass-card-hover rounded-2xl p-4 flex items-center justify-between transition-all duration-200">
      <div className="flex items-center gap-3">
        {/* Icon badge */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #3B82F6, #6366F1)" }}>
          <BookOpen size={18} className="text-white" />
        </div>

        <div>
          <p className="text-sm font-semibold text-white leading-tight">{guideline.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {statusIcon}
            <span className="text-xs text-slate-400">{statusText}</span>
            {guideline.status === "loaded" && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-500">{guideline.version}</span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-500">{guideline.updatedAt}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
      >
        <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
        새로고침
      </button>
    </div>
  );
}
