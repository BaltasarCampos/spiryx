import { useEffect, useRef, useState } from "react";
import {
  GEOLOCATION_MAXIMUM_AGE_MS,
  GEOLOCATION_TIMEOUT_MS,
} from "../config/constants";
import {
  INITIAL_LOCATION_CONTEXT,
  type Coordinates,
  type LocationContext,
  type PermissionStatus,
} from "../types/location";

export interface UseGeolocationOptions {
  enabled?: boolean;
  maximumAgeMs?: number;
  timeoutMs?: number;
}

export interface UseGeolocationResult {
  errorMessage: string | null;
  isLoading: boolean;
  location: LocationContext;
  requestLocation: () => Promise<void>;
  resetLocation: () => void;
}

function getCurrentPosition(options: PositionOptions): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is unavailable in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => reject(error),
      options,
    );
  });
}

function getErrorState(error: unknown): { message: string; permissionStatus: PermissionStatus } {
  if (error instanceof GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      return {
        permissionStatus: "denied",
        message: "Location access was denied. Enable it in your browser settings to load local air quality.",
      };
    }

    return {
      permissionStatus: "unavailable",
      message: "Your location could not be determined right now. Check your device settings and try again.",
    };
  }

  return {
    permissionStatus: "unavailable",
    message: "Geolocation is unavailable in this browser.",
  };
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationResult {
  const {
    enabled = true,
    maximumAgeMs = GEOLOCATION_MAXIMUM_AGE_MS,
    timeoutMs = GEOLOCATION_TIMEOUT_MS,
  } = options;
  const [location, setLocation] = useState<LocationContext>(INITIAL_LOCATION_CONTEXT);
  const [isLoading, setIsLoading] = useState(enabled);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function requestLocation() {
    if (!isMountedRef.current) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLocation((currentState) => ({
      ...currentState,
      permissionStatus: "prompt",
    }));

    try {
      const coordinates = await getCurrentPosition({
        enableHighAccuracy: false,
        maximumAge: maximumAgeMs,
        timeout: timeoutMs,
      });

      if (!isMountedRef.current) {
        return;
      }

      setLocation({
        permissionStatus: "granted",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        locationName: null,
        resolvedAtIso: new Date().toISOString(),
      });
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      const errorState = getErrorState(error);
      setErrorMessage(errorState.message);
      setLocation({
        ...INITIAL_LOCATION_CONTEXT,
        permissionStatus: errorState.permissionStatus,
      });
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }

  function resetLocation() {
    setErrorMessage(null);
    setIsLoading(false);
    setLocation(INITIAL_LOCATION_CONTEXT);
  }

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    void requestLocation();
  }, [enabled, maximumAgeMs, timeoutMs]);

  return {
    errorMessage,
    isLoading,
    location,
    requestLocation,
    resetLocation,
  };
}
