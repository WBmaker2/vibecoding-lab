import React from "react";

export default async function HomePage() {
  return (
    <main className="page-shell">
      <div className="hero-frame">
        <p className="eyebrow">Teacher-Built Classroom Tools</p>
        <h1>Hong&apos;s Vibe Coding Lab</h1>
        <p className="hero-copy">교실 수업과 교사 업무를 돕는 웹앱 아카이브</p>

        <div className="search-panel">
          <label className="sr-only" htmlFor="app-search">
            앱 검색
          </label>
          <input
            aria-label="앱 검색"
            className="search-input"
            id="app-search"
            placeholder="예: 학급경영, 영어수업, 퀴즈"
            type="search"
          />
        </div>

        <p className="tag-copy">태그로 탐색</p>
      </div>
    </main>
  );
}
