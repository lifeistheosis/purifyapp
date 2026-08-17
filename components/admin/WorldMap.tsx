"use client";

import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export type MapPoint = { lat: number; lng: number; id: string };

// Colours come through the `style` prop rather than the fill/stroke
// presentation attributes. react-simple-maps merges `style` into a real CSS
// declaration, which is the path that resolves custom properties reliably;
// a var() sitting in a presentation attribute is a different, flakier code
// path. The land used to be a hardcoded #2a2333 purple that matched neither
// theme and rendered as a dark slab inside a white card.
//
// Deliberately a token swap and nothing more. Task 4 of docs/admin-rework.md
// owns the real decision here, whether to keep react-simple-maps (a topojson
// fetch from a CDN, plus a React 19 peer-dep conflict papered over by
// legacy-peer-deps) or replace it with a hand-rolled inline SVG projection.
// That call is not Wave A's to make.
export function WorldMap({ points }: { points: MapPoint[] }) {
  return (
    <div
      className="w-full overflow-hidden rounded-[var(--adm-radius)] border"
      style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}
    >
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
                strokeWidth={0.4}
                style={{
                  default: {
                    outline: "none",
                    fill: "var(--adm-panel-2)",
                    stroke: "var(--adm-line-strong)",
                  },
                  hover: {
                    outline: "none",
                    fill: "var(--adm-line-strong)",
                    stroke: "var(--adm-line-strong)",
                  },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>
        {points.map((p) => (
          <Marker key={p.id} coordinates={[p.lng, p.lat]}>
            <circle r={6} fill="var(--adm-accent)" fillOpacity={0.18} />
            <circle r={2.6} fill="var(--adm-accent)">
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
