import { DashboardLayout } from "./components/organisms/DashboardLayout";

function App() {
  return (
    <DashboardLayout>
      <section aria-labelledby="dashboard-heading" className="space-y-3">
        <h1 id="dashboard-heading" className="text-2xl font-bold tracking-tight text-ink">
          Local Air Quality
        </h1>
        <p className="max-w-prose text-sm text-slate-700">
          This dashboard will show your current AQI summary, health meaning, and pollutant detail after
          location permission.
        </p>
      </section>
    </DashboardLayout>
  );
}

export default App;
