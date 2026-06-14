"use client";

import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export type MapPoint = { lat: number; lng: number; id: string };

export function WorldMap({ points }: { points: MapPoint[] }) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-paper/10 bg-night">
      <ComposableMap
        projectionConfig={{ scale: 147 }}
        width={800}
        height={400}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#2a2333"
                stroke="#101013"
                strokeWidth={0.4}
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none", fill: "#332a3f" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>
        {points.map((p) => (
          <Marker key={p.id} coordinates={[p.lng, p.lat]}>
            <circle r={6} fill="#eaeaec" fillOpacity={0.18} />
            <circle r={2.6} fill="#eaeaec">
              <animate
                attributeName="r"
                values="2.6;4.2;2.6"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="fill-opacity"
                values="1;0.5;1"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          </Marker>
        ))}
      </ComposableMap>
    </div>
  );
}
