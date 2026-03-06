import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MY OFFICE — 보고서 검토 시스템",
  description: "AI 기반 보고서 지침 준수 검토 및 오타 탐지 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased" style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
