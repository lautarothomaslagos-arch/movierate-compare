import { ImageResponse } from "next/og";

// Apple touch icon — 180×180 (tamaño recomendado por Apple para iOS).
// Misma estética que /icon: warm dark + brass star (paleta Late Night).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
            inset: 8,
            borderRadius: 22,
            border: "2px solid rgba(201, 169, 97, 0.15)",
            display: "flex",
          }}
        />
        <div
          style={{
            fontSize: 122,
            color: "#c9a961",
            fontWeight: 900,
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1,
            textShadow: "0 2px 22px rgba(201, 169, 97, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: -6,
          }}
        >
          ★
        </div>
      </div>
    ),
    { ...size }
  );
}
