import { ImageResponse } from "next/og";

// PWA icon HD — 512×512 PNG. Mismo sistema "Estrella-nota" que /icon.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

const BRASS = "#e0b870";
const CREAM = "#f3e7c8";
const STAR_PATH =
  "M50 10 L40.60 37.06 L11.96 37.64 L34.78 54.94 L26.49 82.36 L50 66 L73.51 82.36 L65.22 54.94 L88.04 37.64 L59.41 37.06 Z";
const FILL_Y = 28.81;

export default function IconHD() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0804",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={420} height={420} viewBox="0 0 100 100" fill="none">
          <defs>
            <clipPath id="star-clip">
              <path d={STAR_PATH} />
            </clipPath>
          </defs>
          <path d={STAR_PATH} fill={CREAM} fillOpacity={0.16} />
          <g clipPath="url(#star-clip)">
            <rect x={0} y={FILL_Y} width={100} height={100} fill={BRASS} />
          </g>
          <path
            d={STAR_PATH}
            fill="none"
            stroke={CREAM}
            strokeWidth={2.4}
            strokeLinejoin="round"
            strokeOpacity={0.85}
          />
        </svg>
      </div>
    ),
    size
  );
}
