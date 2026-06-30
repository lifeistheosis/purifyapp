import { ImageResponse } from "next/og";

// Pre-render once at build time so the route is compatible with the Android
// static export (output:export); the website still serves the same icon.
export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon, same Orthodox-cross mark sized for iOS home-screen.
export default function AppleIcon() {
 return new ImageResponse(
 (
 <div
 style={{
 width: "100%",
 height: "100%",
 background: "#101013",
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 }}
 >
 <div
 style={{
 width: "82%",
 height: "82%",
 borderRadius: "50%",
 background: "#0a0a0a",
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 position: "relative",
 }}
 >
 <div
 style={{
 position: "relative",
 width: "60%",
 height: "76%",
 display: "flex",
 }}
 >
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
