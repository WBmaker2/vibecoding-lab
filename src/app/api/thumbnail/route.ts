import React from "react";
import { ImageResponse } from "next/og";

export const runtime = "edge";

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

function sanitizeText(value: string | null, fallback: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, 80);
}

function getAsciiMark(title: string, host: string) {
  const words = title.toUpperCase().match(/[A-Z0-9]+/g) ?? [];

  if (words.length === 1) {
    return words[0].slice(0, 4);
  }

  if (words.length > 1) {
    return words
      .slice(0, 4)
      .map((word) => word[0])
      .join("");
  }

  const hostWords = host.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);

  if (hostWords.length === 0) {
    return "APP";
  }

  return hostWords
    .slice(0, 3)
    .map((word) => word[0])
    .join("");
}

function getPalette(host: string) {
  const hash = Array.from(host).reduce(
    (total, char) => total + char.charCodeAt(0),
    0
  );
  const hue = hash % 360;

  return {
    backdrop: `linear-gradient(135deg, hsl(${hue} 38% 28%), hsl(${(hue + 38) % 360} 34% 14%))`,
    glow: `rgba(242, 196, 122, 0.28)`,
    card: `rgba(255, 255, 255, 0.12)`,
    badge: `hsl(${(hue + 54) % 360} 88% 76%)`
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const host = sanitizeText(searchParams.get("host"), "web-app");
  const title = sanitizeText(searchParams.get("title"), host);
  const mark = getAsciiMark(title, host);
  const palette = getPalette(host);

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: palette.backdrop,
          color: "white",
          fontFamily: "sans-serif"
        }
      },
      React.createElement("div", {
        style: {
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08), transparent 58%)"
        }
      }),
      React.createElement("div", {
        style: {
          position: "absolute",
          right: "-8%",
          top: "-18%",
          width: 420,
          height: 420,
          borderRadius: 999,
          background: palette.glow,
          filter: "blur(10px)"
        }
      }),
      React.createElement(
        "div",
        {
          style: {
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "58px"
          }
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start"
            }
          },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "20px"
              }
            },
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }
              },
              React.createElement("div", {
                style: {
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: palette.badge
                }
              }),
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 28,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.72)"
                  }
                },
                "Auto Thumbnail"
              )
            ),
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  fontSize: 156,
                  lineHeight: 0.9,
                  fontWeight: 800,
                  letterSpacing: "-0.08em"
                }
              },
              mark
            )
          ),
          React.createElement("div", {
            style: {
              display: "flex",
              width: 240,
              height: 240,
              borderRadius: 54,
              background: palette.card,
              border: "1px solid rgba(255,255,255,0.14)"
            }
          })
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "14px"
            }
          },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                fontSize: 34,
                fontWeight: 600
              }
            },
            host
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                maxWidth: 760,
                fontSize: 24,
                color: "rgba(255,255,255,0.68)"
              }
            },
            "Generated from the app link when social preview images are missing."
          )
        )
      )
    ),
    {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT
    }
  );
}
