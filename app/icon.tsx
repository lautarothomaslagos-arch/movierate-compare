import { ImageResponse } from "next/og";

// Genera el icono de la app dinámicamente (favicon + PWA icon).
// Next.js lo sirve en /icon automáticamente cuando este archivo existe.
export const size = { width: 256, height: 256 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 160,
          background: "linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 900,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-0.05em",
        }}
      >
        ★
      </div>
    ),
    { ...size }
  );
}
