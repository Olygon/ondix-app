export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "ondix-theme";
export const THEME_COOKIE_NAME = "ondix-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function resolveThemeMode(value?: string | null): ThemeMode {
  return value === "dark" ? "dark" : "light";
}
