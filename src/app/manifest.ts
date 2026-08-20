import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hong's Vibe Coding Lab",
    short_name: "Hong's Lab",
    description: "초등 수업과 교사 업무를 가볍게 만드는 교사용 웹앱 아카이브",
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
