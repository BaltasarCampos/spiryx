import { AQISummaryCard } from "./components/organisms/AQISummaryCard";
import { ActivitySafetyChecker } from "./components/organisms/ActivitySafetyChecker";
import { DashboardLayout } from "./components/organisms/DashboardLayout";
import { ForecastChart } from "./components/organisms/ForecastChart";
import { HealthMeaningPanel } from "./components/organisms/HealthMeaningPanel";
import { PollutantList } from "./components/organisms/PollutantList";
import { TrendIndicator } from "./components/organisms/TrendIndicator";
import { LocationGate } from "./components/organisms/LocationGate";
import { RetryButton } from "./components/atoms/RetryButton";
import { StatusPanel } from "./components/molecules/StatusPanel";
import { useGeolocation } from "./hooks/useGeolocation";
import { useCurrentAQI } from "./hooks/useCurrentAQI";
import { useAQITrend } from "./hooks/useAQITrend";
import { useHourlyForecast } from "./hooks/useHourlyForecast";
import { getActivitySafety } from "./utils/activitySafety";
import { getNextBestHourIso } from "./utils/forecastTransform";
 
function App() {
  const {
    location,
    isLoading: isLocating,
    errorMessage: geoErrorMessage,
    requestLocation,
  } = useGeolocation();
 
  const { permissionStatus, latitude, longitude } = location;
  const isGranted = permissionStatus === "granted" && latitude !== null && longitude !== null;
 
  const {
    snapshot,
    locationName,
    loadState,
    errorMessage: aqiErrorMessage,
    refresh,
  } = useCurrentAQI({ latitude, longitude, enabled: isGranted });

  // Null until a second reading arrives (first load has nothing to compare).
  const trend = useAQITrend(snapshot);

  // Fetched independently of current conditions: a forecast failure degrades
  // to a status panel below without touching the AQI card or safety checks.
  const {
    forecast,
    loadState: forecastLoadState,
    fetchedAtIso: forecastFetchedAtIso,
  } = useHourlyForecast({ latitude, longitude, enabled: isGranted });

  // Surface when conditions next improve, using tier logic for
  // the current reading. Thresholds are identical for every activity,
  // so any activity type yields the current recommendation tier.
  const displayForecast =
    forecast && snapshot
      ? {
          ...forecast,
          nextBestHourIso: getNextBestHourIso(
            forecast.points,
            getActivitySafety(snapshot.aqiValue, "run").recommendationLevel,
          ),
        }
      : forecast;
 
  return (
    <DashboardLayout>
      <section aria-labelledby="dashboard-heading" className="space-y-6">
        <h1 id="dashboard-heading" className="text-2xl font-bold tracking-tight text-ink">
          Local Air Quality
        </h1>
 
        <LocationGate
          permissionStatus={permissionStatus}
          isLoading={isLocating}
          errorMessage={geoErrorMessage}
          onRetry={() => void requestLocation()}
        >
          {loadState === "loading" && (
            <StatusPanel
              tone="loading"
              title="Loading air quality data"
              message="Fetching current conditions for your location…"
            />
          )}
 
          {loadState === "error" && (
            <StatusPanel
              tone="error"
              title="Could not load air quality"
              message={aqiErrorMessage ?? "An error occurred while loading data."}
              action={<RetryButton onClick={() => refresh()} />}
            />
          )}
 
          {loadState === "success" && snapshot && (
            <div className="space-y-4">
              <AQISummaryCard
                snapshot={snapshot}
                locationName={locationName}
                onRefresh={() => refresh()}
              />
              <TrendIndicator trend={trend} />
              <HealthMeaningPanel snapshot={snapshot} />
              <PollutantList pollutants={snapshot.pollutants} />
              <ActivitySafetyChecker activities={["run", "cycle", "kids"]} aqiValue={snapshot.aqiValue} />
              {forecastLoadState === "loading" && (
                <StatusPanel
                  tone="loading"
                  title="Loading forecast"
                  message="Fetching the 48-hour air quality forecast…"
                />
              )}
              {forecastLoadState === "error" && (
                <StatusPanel
                  tone="warning"
                  title="Forecast unavailable"
                  message="The 48-hour forecast could not be loaded. Current conditions above are unaffected."
                />
              )}
              {displayForecast && forecastFetchedAtIso && (
                <ForecastChart forecast={displayForecast} fetchedAtIso={forecastFetchedAtIso} />
              )}
            </div>
          )}
        </LocationGate>
      </section>
    </DashboardLayout>
  );
}
 
export default App;
 