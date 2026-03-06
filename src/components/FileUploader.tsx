"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, FileText, X, CheckCircle2 } from "lucide-react";

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

const ALLOWED_EXTENSIONS = [".docx", ".pdf", ".txt", ".md"];
const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "text/plain",
  "text/markdown",
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  const colors: Record<string, string> = {
    pdf: "from-red-500 to-rose-600",
    docx: "from-blue-500 to-blue-700",
    txt: "from-slate-500 to-slate-600",
    md: "from-purple-500 to-violet-600",
  };
  return colors[ext ?? ""] ?? "from-slate-500 to-slate-600";
}

export default function FileUploader({ onFileSelect, selectedFile }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File): boolean {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
      setError(`지원하지 않는 형식입니다. (${ALLOWED_EXTENSIONS.join(", ")})`);
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("파일 크기는 10MB 이하여야 합니다.");
      return false;
    }
    setError(null);
    return true;
  }

  function handleFile(file: File) {
    if (validateFile(file)) onFileSelect(file);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  if (selectedFile) {
    return (
      <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getFileColor(selectedFile.name)} flex items-center justify-center flex-shrink-0`}>
          <FileText size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{selectedFile.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{formatBytes(selectedFile.size)}</p>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <button
            onClick={() => { onFileSelect(null); setError(null); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
        isDragging
          ? "border-blue-500 bg-blue-500/10"
          : "border-white/10 hover:border-blue-500/50 hover:bg-white/[0.02]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.join(",")}
        onChange={onInputChange}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-3">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${
          isDragging ? "bg-blue-500/20" : "bg-white/[0.04]"
        }`}>
          <Upload size={26} className={isDragging ? "text-blue-400" : "text-slate-400"} />
        </div>

        <div>
          <p className="text-sm font-semibold text-white">
            {isDragging ? "여기에 놓으세요" : "보고서 파일 업로드"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            드래그&amp;드롭 또는 클릭 &mdash; .docx .pdf .txt .md (최대 10MB)
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  );
}
