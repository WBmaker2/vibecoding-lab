import type { Metadata } from "next";
import "./globals.css";
import { siteMetadata } from "./site-metadata";

export const metadata: Metadata = siteMetadata;

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
