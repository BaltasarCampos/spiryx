export type PermissionStatus = "prompt" | "granted" | "denied" | "unavailable";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationContext {
  permissionStatus: PermissionStatus;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  resolvedAtIso: string | null;
}

export const INITIAL_LOCATION_CONTEXT: LocationContext = {
  permissionStatus: "prompt",
  latitude: null,
  longitude: null,
  locationName: null,
  resolvedAtIso: null,
};
