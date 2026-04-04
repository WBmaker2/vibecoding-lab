import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hong's Vibe Coding Lab",
  description: "교사용 웹앱을 소개하는 미니멀 아카이브"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
