import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Purify mark: white Orthodox three-bar cross inside a black circle.
// Drawn as composed divs because Satori / next-og has limited SVG support.
export default function Icon() {
 return new ImageResponse(
 (
 <div
 style={{
 width: "100%",
 height: "100%",
 background: "transparent",
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 }}
 >
 {/* Black filled circle */}
 <div
 style={{
 width: "100%",
 height: "100%",
 borderRadius: "50%",
 background: "#0a0a0a",
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 position: "relative",
 }}
 >
 {/* Cross container, absolute positioned children */}
 <div
 style={{
 position: "relative",
 width: "60%",
 height: "76%",
 display: "flex",
 }}
 >
 {/* Vertical post */}
 <div
 style={{
 position: "absolute",
 left: "50%",
 top: "8%",
 transform: "translateX(-50%)",
 width: "16%",
 height: "84%",
 background: "#fff",
 }}
 />
 {/* Titulus, short top bar */}
 <div
 style={{
 position: "absolute",
 left: "50%",
 top: "16%",
 transform: "translateX(-50%)",
 width: "44%",
 height: "9%",
 background: "#fff",
 }}
 />
 {/* Main horizontal bar */}
 <div
 style={{
 position: "absolute",
 left: "50%",
 top: "33%",
 transform: "translateX(-50%)",
 width: "72%",
 height: "11%",
 background: "#fff",
 }}
 />
 {/* Slanted footrest (suppedaneum), tilted down-right */}
 <div
 style={{
 position: "absolute",
 left: "50%",
 top: "66%",
 transform: "translateX(-50%) rotate(-18deg)",
 width: "54%",
 height: "9%",
 background: "#fff",
 }}
 />
 </div>
 </div>
 </div>
 ),
 { ...size },
 );
}
