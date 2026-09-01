import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "바이브홍 | Hong's Vibe Coding Lab",
    short_name: "바이브홍",
    description: "바이브홍이 만든 교실 수업·교사 업무용 웹앱 아카이브",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f7",
    theme_color: "#f4f5f7",
    lang: "ko-KR",
    icons: [
      {
        src: "/icon",
        sizes: "any",
        type: "image/png"
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  };
}
