import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2f3b51 0%, #4e6a9b 100%)",
          borderRadius: 8,
          color: "#ffffff",
          fontSize: 20,
          fontWeight: 800,
          fontFamily: "Arial, sans-serif",
          position: "relative",
        }}
      >
        E
        <div
          style={{
            position: "absolute",
            right: 6,
            bottom: 6,
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "#ffffff",
            opacity: 0.85,
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
