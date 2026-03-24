"use client";

import { useState, useRef, useEffect } from "react";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { voltmx: any; appConfig: any; }
}

const APP_KEY = "935bcbea7fae08277889d176dfca53f6";
const APP_SECRET = "94f3229d7ed67db54f8cfc5ebd6422c9";
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
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoginLoading(true);
    setLoginError(null);

    const doLogin = (client: ReturnType<typeof clientRef.current>) => {
      try {
        const authClient = client.getIdentityService("idsvcweatherapi");
        authClient.login(
          { userid: username.trim(), password: password.trim() },
          () => {
            setLoggedIn(true);
            setLoginLoading(false);
          },
          (err: unknown) => {
            setLoginError("Invalid credentials. Please try again.");
            setLoginLoading(false);
            console.error("Login failure", err);
          }
        );
      } catch (ex: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = ex instanceof Error ? ex.message : ((ex as any)?.message ?? JSON.stringify(ex));
        setLoginError(msg);
        console.error("Login exception", ex);
        setLoginLoading(false);
      }
    };

    if (clientRef.current) {
      doLogin(clientRef.current);
      return;
    }

    if (!window.appConfig) window.appConfig = { appId: "" };
    const client = new window.voltmx.sdk();
    client.setGlobalRequestParam("Pragma", "no-cache", client.globalRequestParamType.headers);
    client.init(APP_KEY, APP_SECRET, getServiceURL(), () => {
      clientRef.current = client;
      initializedRef.current = true;
      doLogin(client);
    }, (err: unknown) => {
      setLoginError("SDK initialization failed.");
      setLoginLoading(false);
      console.error("SDK init failure", err);
    });
  };

  const handleLogout = () => {
    try {
      const authClient = clientRef.current.getIdentityService("idsvcweatherapi");
      authClient.logout(
        () => {
          setLoggedIn(false);
          setWeather(null);
          setCity("");
        },
        (err: unknown) => {
          console.error("Logout failure", err);
          setLoggedIn(false);
          setWeather(null);
          setCity("");
        }
      );
    } catch {
      setLoggedIn(false);
      setWeather(null);
      setCity("");
    }
  };

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
          setSearchLoading(false);
        },
        (err: unknown) => {
          setSearchError("Could not fetch weather: " + JSON.stringify(err));
          setSearchLoading(false);
        }
      );
    } catch (ex: unknown) {
      setSearchError("Exception: " + (ex instanceof Error ? ex.message : String(ex)));
      setSearchLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = city.trim();
    if (!query) return;

    setSearchLoading(true);
    setSearchError(null);
    setWeather(null);

    if (clientRef.current) {
      invokeWeather(clientRef.current, query);
    }
  };

  const iconSrc = weather?.condition?.icon
    ? weather.condition.icon.startsWith("//")
      ? "https:" + weather.condition.icon
      : weather.condition.icon
    : null;

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="text-4xl font-bold text-indigo-800 mb-1 text-center">Weather App</h1>
          <p className="text-center text-indigo-400 mb-8 text-sm">Powered by HCL Volt MX Foundry</p>

          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-lg p-8 flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Sign in</h2>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-indigo-400 uppercase tracking-wider font-semibold">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="px-4 py-3 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-700"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-indigo-400 uppercase tracking-wider font-semibold">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="px-4 py-3 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-700"
              />
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="mt-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loginLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center p-8">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-4xl font-bold text-indigo-800">Weather Search</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-indigo-400 hover:text-indigo-600 font-medium transition-colors"
          >
            Sign out
          </button>
        </div>
        <p className="text-indigo-400 mb-8 text-sm">Powered by HCL Volt MX Foundry</p>

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
            disabled={searchLoading}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {searchLoading ? "Searching…" : "Search"}
          </button>
        </form>

        {searchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
            {searchError}
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
