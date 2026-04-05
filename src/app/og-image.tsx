import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "56px 64px",
          background:
            "linear-gradient(180deg, rgba(251,251,252,1) 0%, rgba(244,245,247,1) 58%, rgba(255,255,255,1) 100%)",
          color: "#1A2133",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top right, rgba(242,196,122,0.3), transparent 28%)"
          }}
        />

        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            borderRadius: 40,
            border: "1px solid rgba(20,27,45,0.08)",
            background: "rgba(255,255,255,0.9)",
            padding: "48px 52px",
            boxShadow: "0 28px 80px rgba(17,24,39,0.06)",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              maxWidth: 660
            }}
          >
            <div
              style={{
                display: "flex",
                color: "#3E5F92",
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase"
              }}
            >
              Hong&apos;s Vibe Coding Lab
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 72,
                lineHeight: 1.05,
                letterSpacing: "-0.05em",
                fontWeight: 700
              }}
            >
              교실 수업과 교사 업무를
              <br />
              가볍게 만드는 웹앱 아카이브
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 28,
                lineHeight: 1.6,
                color: "#646D80"
              }}
            >
              태그 탐색, 빠른 검색, 절제된 카드형 쇼케이스로 필요한 도구를
              곧장 찾을 수 있게 정리했습니다.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: 236,
              height: 236,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              background: "#3E5F92",
              color: "#ffffff",
              fontSize: 132,
              fontWeight: 700,
              letterSpacing: "-0.08em",
              boxShadow: "0 28px 48px rgba(62,95,146,0.2)"
            }}
          >
            H
          </div>
        </div>
      </div>
    ),
    size
  );
}
