import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(246,247,251,1) 100%)",
          borderRadius: 48,
          border: "4px solid rgba(62,95,146,0.14)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top right, rgba(242,196,122,0.4), transparent 38%)"
          }}
        />
        <div
          style={{
            display: "flex",
            width: 116,
            height: 116,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            background: "#3E5F92",
            color: "#ffffff",
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "-0.08em",
            boxShadow: "0 20px 32px rgba(62,95,146,0.24)"
          }}
        >
          H
        </div>
      </div>
    ),
    size
  );
}
