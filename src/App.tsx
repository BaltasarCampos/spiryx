import { AQISummaryCard } from "./components/organisms/AQISummaryCard";
import { DashboardLayout } from "./components/organisms/DashboardLayout";
import { HealthMeaningPanel } from "./components/organisms/HealthMeaningPanel";
import { PollutantList } from "./components/organisms/PollutantList";
import { LocationGate } from "./components/organisms/LocationGate";
import { RetryButton } from "./components/atoms/RetryButton";
import { StatusPanel } from "./components/molecules/StatusPanel";
import { useGeolocation } from "./hooks/useGeolocation";
import { useCurrentAQI } from "./hooks/useCurrentAQI";
 
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
              <HealthMeaningPanel snapshot={snapshot} />
              <PollutantList pollutants={snapshot.pollutants} />
            </div>
          )}
        </LocationGate>
      </section>
    </DashboardLayout>
  );
}
 
export default App;
 