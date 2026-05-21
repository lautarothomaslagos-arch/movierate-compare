import { ImageResponse } from "next/og";

// Apple touch icon (180x180 es el tamaño recomendado por Apple).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 120,
          background: "linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 900,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        ★
      </div>
    ),
    { ...size }
  );
}
