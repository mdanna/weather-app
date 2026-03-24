"use client";

import { useState, useRef, useEffect } from "react";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { voltmx: any; appConfig: any; }
}

const APP_KEY = "935bcbea7fae08277889d176dfca53f6";
const APP_SECRET = "94f3229d7ed67db54f8cfc5ebd6422c9";
// Build the URL at runtime so no cached bundle can override it
const getServiceURL = () => window.location.origin + "/foundry/appconfig";

interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
    localtime: string;
    localtime_epoch: number;
  };
  condition: {
    icon: string;
    text: string;
  };
}

export default function Home() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const tryInit = () => {
      if (initializedRef.current || !window.voltmx?.sdk) return;
      if (!window.appConfig) window.appConfig = { appId: "" };
      const client = new window.voltmx.sdk();
      client.setGlobalRequestParam("Pragma", "no-cache", client.globalRequestParamType.headers);
      client.init(APP_KEY, APP_SECRET, getServiceURL(), () => {
        clientRef.current = client;
        initializedRef.current = true;
      }, (err: unknown) => {
        console.error("SDK init failure", err);
      });
    };

    if (window.voltmx?.sdk) {
      tryInit();
    } else {
      const interval = setInterval(() => {
        if (window.voltmx?.sdk) {
          clearInterval(interval);
          tryInit();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invokeWeather = (client: any, query: string) => {
    try {
      const svc = client.getIntegrationService("WeatherAPIService");
      svc.invokeOperation(
        "currentweather",
        null,
        { q: query },
        (result: WeatherData) => {
          setWeather(result);
          setLoading(false);
        },
        (err: unknown) => {
          setError("Could not fetch weather: " + JSON.stringify(err));
          setLoading(false);
        }
      );
    } catch (ex: unknown) {
      setError("Exception: " + (ex instanceof Error ? ex.message : String(ex)));
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = city.trim();
    if (!query) return;

    setLoading(true);
    setError(null);
    setWeather(null);

    if (clientRef.current) {
      invokeWeather(clientRef.current, query);
      return;
    }

    if (!window.appConfig) window.appConfig = { appId: "" };
    const client = new window.voltmx.sdk();
    client.setGlobalRequestParam("Pragma", "no-cache", client.globalRequestParamType.headers);
    client.init(APP_KEY, APP_SECRET, getServiceURL(), () => {
      clientRef.current = client;
      initializedRef.current = true;
      invokeWeather(client, query);
    }, (err: unknown) => {
      setError("SDK initialization failed: " + JSON.stringify(err));
      setLoading(false);
    });
  };

  const iconSrc = weather?.condition?.icon
    ? weather.condition.icon.startsWith("//")
      ? "https:" + weather.condition.icon
      : weather.condition.icon
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center p-8">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl font-bold text-indigo-800 mb-1 text-center">Weather Search</h1>
          <p className="text-center text-indigo-400 mb-8 text-sm">Powered by HCL Volt MX Foundry</p>

          <form onSubmit={handleSearch} className="flex gap-2 mb-8">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter a city name..."
              className="flex-1 px-4 py-3 rounded-xl border border-indigo-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-700 bg-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </form>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
              {error}
            </div>
          )}

          {weather && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-indigo-600 text-white p-6 flex items-center gap-4">
                {iconSrc && (
                  <img src={iconSrc} alt={weather.condition.text} className="w-16 h-16" />
                )}
                <div>
                  <h2 className="text-3xl font-bold">{weather.location?.name}</h2>
                  <p className="text-indigo-200 mt-0.5">{weather.condition?.text}</p>
                </div>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4">
                <InfoCard label="Region" value={weather.location?.region} />
                <InfoCard label="Country" value={weather.location?.country} />
                <InfoCard label="Local Time" value={weather.location?.localtime} />
                <InfoCard label="Timezone" value={weather.location?.tz_id} />
                <InfoCard label="Latitude" value={String(weather.location?.lat ?? "—")} />
                <InfoCard label="Longitude" value={String(weather.location?.lon ?? "—")} />
              </div>
            </div>
          )}
        </div>
      </main>
  );
}

function InfoCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="bg-indigo-50 rounded-xl p-4">
      <p className="text-xs text-indigo-400 uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className="text-gray-800 font-medium">{value || "—"}</p>
    </div>
  );
}
