import { ImageResponse } from "next/og";

// PWA icon HD — 512×512 PNG.
// Tamaño obligatorio que pide Chrome para PWA installable, además del
// 192×192 en icon.tsx. Mismo diseño, escalado al doble largo de cada lado.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function IconHD() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #1a1208 0%, #3d2f1c 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 22,
            borderRadius: 64,
            border: "5px solid rgba(201, 169, 97, 0.15)",
            display: "flex",
          }}
        />
        <div
          style={{
            fontSize: 346,
            color: "#c9a961",
            fontWeight: 900,
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1,
            textShadow: "0 6px 64px rgba(201, 169, 97, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: -16,
          }}
        >
          ★
        </div>
      </div>
    ),
    { ...size }
  );
}
