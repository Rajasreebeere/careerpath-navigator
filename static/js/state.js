const STORAGE = {
  token: "careerpath.token",
  user: "careerpath.user",
  progress: "careerpath.progress",
  pace: "careerpath.pace",
  theme: "careerpath.theme",
};

function readJson(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

const preferredTheme = () => {
  const saved = localStorage.getItem(STORAGE.theme);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const state = {
  token: localStorage.getItem(STORAGE.token),
  user: readJson(STORAGE.user),
  careers: { sectors: [], careers: [] },
  progress: readJson(STORAGE.progress, {}),
  pace: localStorage.getItem(STORAGE.pace) || "regular",
  theme: preferredTheme(),
  quiz: { index: 0, answers: [], result: null },
  selectedCompare: [],
  selectedDailyPhase: 0,
  searchIndex: -1,
};

export function setToken(token, user) {
  state.token = token || null;
  state.user = user || null;
  if (token) localStorage.setItem(STORAGE.token, token);
  else localStorage.removeItem(STORAGE.token);
  if (user) localStorage.setItem(STORAGE.user, JSON.stringify(user));
  else localStorage.removeItem(STORAGE.user);
}

export function setProgress(progress) {
  state.progress = progress && typeof progress === "object" ? progress : {};
  localStorage.setItem(STORAGE.progress, JSON.stringify(state.progress));
}

export function setPace(pace) {
  if (["intensive", "regular", "relaxed"].includes(pace)) {
    state.pace = pace;
    localStorage.setItem(STORAGE.pace, pace);
  }
}

export function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem(STORAGE.theme, theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function logout() {
  setToken(null, null);
  state.careers = { sectors: [], careers: [] };
  setProgress({});
  state.quiz = { index: 0, answers: [], result: null };
  location.hash = "#/login";
}

setTheme(state.theme);
