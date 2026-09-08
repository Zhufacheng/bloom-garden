import type { GameState, WeatherKind } from "./types";

export const WEATHER_META: Record<WeatherKind, { icon: string; label: string; hint: string }> = {
  sunny: { icon: "☀️", label: "晴天", hint: "正常澆水" },
  hot: { icon: "🔥", label: "炎熱", hint: "水乾得快，多澆水" },
  rain: { icon: "🌧️", label: "下雨", hint: "免澆水，雨水自動補充" },
};

/** water drained per second while growing */
export const DRAIN_RATES: Record<WeatherKind, number> = {
  sunny: 1 / 40,
  hot: 1 / 20, // twice as fast — hot weather means watering more often
  rain: 0, // rain keeps the soil wet
};

/** water refilled per second (rain only) */
export const REFILL_RATES: Record<WeatherKind, number> = {
  sunny: 0,
  hot: 0,
  rain: 1 / 30,
};

const DURATIONS: Record<WeatherKind, [number, number]> = {
  sunny: [180, 300],
  hot: [120, 240],
  rain: [120, 240],
};

export function rollWeather(
  now: number,
  rnd: () => number = Math.random
): { weather: WeatherKind; weatherUntil: number } {
  const r = rnd();
  const weather: WeatherKind = r < 0.4 ? "sunny" : r < 0.7 ? "hot" : "rain";
  const [min, max] = DURATIONS[weather];
  return { weather, weatherUntil: now + (min + rnd() * (max - min)) * 1000 };
}

/** Roll a fresh weather if the current one expired. Pure. */
export function tickWeather(s: GameState, now: number): GameState {
  if (now < s.weatherUntil) return s;
  return { ...s, ...rollWeather(now) };
}
