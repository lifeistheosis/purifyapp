// react-simple-maps@3 ships no type declarations; this minimal module
// declaration covers the components used in components/admin/WorldMap.tsx so
// the strict production build typechecks.
declare module "react-simple-maps" {
  import type { ComponentType, ReactNode } from "react";

  export const ComposableMap: ComponentType<{
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    width?: number;
    height?: number;
    style?: Record<string, unknown>;
    className?: string;
    children?: ReactNode;
  }>;

  export const Geographies: ComponentType<{
    geography: string | object;
    children: (args: { geographies: GeoFeature[] }) => ReactNode;
  }>;

  export type GeoFeature = { rsmKey: string; [key: string]: unknown };

  export const Geography: ComponentType<{
    geography: GeoFeature;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: Record<string, Record<string, unknown>>;
  }>;

  export const Marker: ComponentType<{
    coordinates: [number, number];
    children?: ReactNode;
  }>;
}
