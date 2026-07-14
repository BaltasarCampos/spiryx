import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAQICategoryDescriptor } from "../../utils/aqiMapping";
import type { ForecastWindow, HourlyForecastPoint } from "../../types/activity";

interface ForecastChartProps {
  fetchedAtIso: string;
  forecast: ForecastWindow;
}

const SOURCE_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const SOURCE_PROVIDER = "Open-Meteo";

function formatHour(isoString: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
  }).format(new Date(isoString));
}

function formatTimestamp(isoString: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

interface BestHourSegment {
  fromIso: string;
  toIso: string;
}

/** Contiguous runs of best hours, shaded behind the line as ReferenceAreas. */
function getBestHourSegments(points: HourlyForecastPoint[]): BestHourSegment[] {
  const segments: BestHourSegment[] = [];

  for (const point of points) {
    const lastSegment = segments[segments.length - 1];
    if (!point.isBestHour) {
      continue;
    }
    if (lastSegment && lastSegment.toIso === previousHourIso(point.timeIso)) {
      lastSegment.toIso = point.timeIso;
    } else {
      segments.push({ fromIso: point.timeIso, toIso: point.timeIso });
    }
  }

  return segments;
}

function previousHourIso(timeIso: string): string {
  return new Date(new Date(timeIso).getTime() - 3_600_000).toISOString();
}

export function ForecastChart({ fetchedAtIso, forecast }: ForecastChartProps) {
  const [isTableVisible, setIsTableVisible] = useState(false);
  const { points, coveredHours, requestedHours, isIncomplete, nextBestHourIso } = forecast;

  // Rendering the 48-point SVG is the most expensive part of this component;
  // memoise it so unrelated re-renders (e.g. the table toggle) skip it.
  const chartVisual = useMemo(() => {
    const bestHourSegments = getBestHourSegments(points);
    return (
      <div data-testid="forecast-chart-visual" aria-hidden="true" className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {bestHourSegments.map((segment) => (
              <ReferenceArea
                key={segment.fromIso}
                x1={segment.fromIso}
                x2={segment.toIso}
                fill="#34d399"
                fillOpacity={0.15}
              />
            ))}
            <XAxis
              dataKey="timeIso"
              tickFormatter={formatHour}
              minTickGap={32}
              tick={{ fontSize: 12 }}
            />
            <YAxis width={36} tick={{ fontSize: 12 }} />
            <Tooltip
              labelFormatter={(label) => formatHour(String(label))}
              formatter={(value) => [String(value ?? "—"), "AQI"]}
            />
            <Line
              type="monotone"
              dataKey="aqiValue"
              stroke="#0369a1"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }, [points]);

  return (
    <section aria-labelledby="forecast-heading" className="space-y-4">
      <div className="space-y-1">
        <h2 id="forecast-heading" className="text-base font-semibold text-slate-900">
          48-Hour Forecast
        </h2>
        {isIncomplete && (
          <p className="text-sm text-amber-800">
            Forecast covers {coveredHours} of the next {requestedHours} hours — the remaining
            hours are not yet available.
          </p>
        )}
        {nextBestHourIso && (
          <p className="text-sm text-slate-700">
            Conditions next improve around{" "}
            <time dateTime={nextBestHourIso} className="font-semibold">
              {formatHour(nextBestHourIso)}
            </time>
            .
          </p>
        )}
      </div>

      {/* Decorative duplicate of the table below; hidden from assistive tech. */}
      {chartVisual}

      <button
        type="button"
        aria-pressed={isTableVisible}
        onClick={() => setIsTableVisible((visible) => !visible)}
        className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tide"
      >
        View as table
      </button>

      <table className={isTableVisible ? "w-full text-left text-sm text-slate-700" : "sr-only"}>
        <caption className="sr-only">Hourly AQI forecast for the next 48 hours</caption>
        <thead>
          <tr>
            <th scope="col" className="py-1 pr-2 font-semibold">
              Time
            </th>
            <th scope="col" className="py-1 pr-2 font-semibold">
              AQI
            </th>
            <th scope="col" className="py-1 pr-2 font-semibold">
              Category
            </th>
            <th scope="col" className="py-1 font-semibold">
              Best hour
            </th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.timeIso} className={point.isBestHour ? "bg-emerald-50" : ""}>
              <th scope="row" className="py-1 pr-2 font-normal">
                <time dateTime={point.timeIso}>{formatHour(point.timeIso)}</time>
              </th>
              <td className="py-1 pr-2 tabular-nums">{point.aqiValue ?? "—"}</td>
              <td className="py-1 pr-2">{getAQICategoryDescriptor(point.aqiValue).label}</td>
              <td className="py-1">{point.isBestHour ? "Best hour" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
        <div>
          <dt className="font-semibold">Source</dt>
          <dd>
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted hover:text-tide"
            >
              {SOURCE_PROVIDER}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Fetched</dt>
          <dd>
            <time dateTime={fetchedAtIso}>{formatTimestamp(fetchedAtIso)}</time>
          </dd>
        </div>
      </dl>
    </section>
  );
}
