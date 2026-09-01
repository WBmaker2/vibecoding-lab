import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다",
  description: "요청하신 페이지가 없거나 이동되었습니다.",
  alternates: {
    canonical: null
  },
  robots: {
    index: false,
    follow: false
  }
};

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="hero-frame">
        <p className="eyebrow">404 · Not Found</p>
        <h1>페이지를 찾을 수 없습니다</h1>
        <p className="hero-copy">
          주소가 바뀌었거나 아직 공개되지 않은 페이지입니다. 앱 아카이브에서 다른 도구를 찾아보세요.
        </p>
        <Link className="admin-primary-button" href="/">
          앱 아카이브로 돌아가기
        </Link>
      </section>
    </main>
  );
}
