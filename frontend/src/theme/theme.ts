export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";
const KEY = "cemtn:theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");
export function getThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}
export function getPreferredTheme(): Theme {
  const preference = getThemePreference();
  return preference === "system"
    ? media().matches
      ? "dark"
      : "light"
    : preference;
}
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.dispatchEvent(new Event("cemtn-theme-change"));
}
export function initializeTheme() {
  applyTheme(getPreferredTheme());
  media().addEventListener("change", () => {
    if (getThemePreference() === "system") applyTheme(getPreferredTheme());
  });
  window.addEventListener("storage", (event) => {
    if (event.key === KEY) applyTheme(getPreferredTheme());
  });
}
export function saveThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(KEY, preference);
  } catch {
    /* Session preference still applies. */
  }
  applyTheme(
    preference === "system" ? (media().matches ? "dark" : "light") : preference,
  );
}
export function saveTheme(theme: Theme) {
  saveThemePreference(theme);
}
