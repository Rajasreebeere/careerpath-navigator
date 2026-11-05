import { api, postJson } from "./api.js";
import { Spinner, esc, icon } from "./components.js";
import { logout, setPace, setProgress, setTheme, setToken, state } from "./state.js";
import { loginPage } from "./pages/login.js";
import { registerPage } from "./pages/register.js";
import { homePage } from "./pages/home.js";
import { sectorsPage } from "./pages/sectors.js";
import { sectorPage } from "./pages/sector.js";
import { rolePage } from "./pages/role.js";
import { comparePage } from "./pages/compare.js";
import { quizPage } from "./pages/quiz.js";
import { quizQuestions } from "./pages/quiz.js";
import { journeyPage } from "./pages/journey.js";
import { notFoundPage } from "./pages/notfound.js";

const appRoot = document.querySelector("#app");
let checkingSession = false;
let privateDataLoaded = false;
let authError = "";
let authLoading = false;
let journeySyncStatus = "Saved";
let progressSaveTimer = 0;
let activeRoleTab = "overview";

function routeParts() {
  const route = (location.hash.replace(/^#/, "") || "/").split("?")[0];
  return route.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
}

function render() {
  if (!appRoot) return;
  const parts = routeParts();
  const current = parts[0] || "";
  if (checkingSession) {
    appRoot.innerHTML = Spinner({ label: "Checking your account" });
    renderIcons();
    return;
  }
  if (!state.token) {
    if (current !== "login" && current !== "register") {
      location.hash = "#/login";
      return;
    }
    appRoot.innerHTML = current === "register" ? registerPage(authError, authLoading) : loginPage(authError, authLoading);
    renderIcons();
    return;
  }
  if (!privateDataLoaded) {
    appRoot.innerHTML = Spinner({ label: "Loading your career paths" });
    renderIcons();
    return;
  }
  if (current === "login" || current === "register") {
    if (!current) {
      location.hash = "#/";
      return;
    }
    location.hash = "#/";
    return;
  }
  let content = "";
  if (current === "sectors" && parts.length === 1) content = sectorsPage(state);
  else if (current === "sector" && parts.length === 2) content = sectorPage(state, parts[1]) || notFoundPage();
  else if (current === "role" && parts.length === 2) {
    const role = state.careers.careers.find((item) => item.id === parts[1]);
    content = role ? rolePage(state, role, activeRoleTab, state.selectedDailyPhase) : notFoundPage();
  } else if (current === "compare" && parts.length === 1) content = comparePage(state);
  else if (current === "quiz" && parts.length === 1) content = quizPage(state);
  else if (current === "journey" && parts.length === 1) content = journeyPage(state, journeySyncStatus);
  else if (current === "" && parts.length === 0) content = homePage(state);
  else content = notFoundPage();
  appRoot.innerHTML = `<header class="topbar">${navbarMarkup()}</header><main class="page-shell">${content}</main>${footerMarkup()}`;
  renderIcons();
  document.title = pageTitle(parts);
}

function navbarMarkup() {
  const links = [
    ["Home", "#/", "house"],
    ["Sectors", "#/sectors", "blocks"],
    ["Compare", "#/compare", "columns-3"],
    ["Quiz", "#/quiz", "sparkles"],
    ["My Journey", "#/journey", "route"],
  ];
  const hash = location.hash || "#/";
  return `<a class="brand" href="#/" aria-label="CareerPath Navigator home"><span class="brand-mark">${icon("compass", 19)}</span><span>CareerPath <b>Navigator</b></span></a><button class="menu-toggle icon-button" data-action="menu-toggle" aria-label="Open navigation" aria-expanded="false">${icon("menu")}</button><nav class="nav-links" aria-label="Main navigation">${links.map(([label, href, ico]) => `<a href="${href}" class="${hash === href ? "active" : ""}">${icon(ico, 16)}<span>${label}</span></a>`).join("")}</nav><div class="user-controls"><button class="icon-button theme-toggle" data-action="theme-toggle" aria-label="Toggle color theme">${icon(state.theme === "dark" ? "sun" : "moon", 17)}</button><span class="user-greeting">${esc(state.user?.name || "Student")}</span><button class="logout-button" data-action="logout">${icon("log-out", 16)}<span>Log out</span></button></div>`;
}

function footerMarkup() {
  return `<footer class="site-footer"><span>CareerPath Navigator</span><span>Timelines are estimates and vary by individual.</span></footer>`;
}

function pageTitle(parts) {
  const [section, id] = parts;
  if (section === "role") return `${state.careers.careers.find((item) => item.id === id)?.name || "Career"} · CareerPath Navigator`;
  if (section === "sector") return `${state.careers.sectors.find((item) => item.id === id)?.name || "Sector"} · CareerPath Navigator`;
  const names = { sectors: "Sectors", compare: "Compare careers", quiz: "Career quiz", journey: "My Journey" };
  return `${names[section] || "Find your path"} · CareerPath Navigator`;
}

function renderIcons() {
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

async function loadPrivateData() {
  const [careers, progressResult] = await Promise.all([
    api("/api/careers"),
    api("/api/user/progress").then((progress) => ({ progress, synced: true }))
      .catch(() => ({ progress: state.progress || {}, synced: false })),
  ]);
  state.careers = careers;
  setProgress(progressResult.progress);
  journeySyncStatus = progressResult.synced ? "Saved" : "Saved locally";
  if (["intensive", "regular", "relaxed"].includes(progressResult.progress?.pace)) setPace(progressResult.progress.pace);
  privateDataLoaded = true;
}

async function verifyStoredToken() {
  if (!state.token) {
    checkingSession = false;
    render();
    return;
  }
  checkingSession = true;
  render();
  try {
    const result = await api("/api/auth/me");
    state.user = result.user;
    localStorage.setItem("careerpath.user", JSON.stringify(result.user));
    await loadPrivateData();
  } catch (error) {
    if (state.token) {
      logout();
    }
  } finally {
    checkingSession = false;
    render();
  }
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function finishAuth(path, body) {
  authLoading = true;
  authError = "";
  render();
  try {
    const result = await postJson(path, body);
    setToken(result.token, result.user);
    await loadPrivateData();
    location.hash = "#/";
  } catch (error) {
    authError = error.message;
  } finally {
    authLoading = false;
    render();
  }
}

function setError(error, message) {
  const existing = error.closest("form")?.querySelector(".form-error");
  if (existing) existing.textContent = message;
  else {
    const notice = document.createElement("p");
    notice.className = "form-error";
    notice.setAttribute("role", "alert");
    notice.textContent = message;
    error.closest("form")?.insertBefore(notice, error.closest("form").querySelector("button[type=submit]"));
  }
}

function updateSearchResults(input) {
  const overlay = document.querySelector("#search-suggestions");
  if (!overlay) return;
  const query = input.value.trim().toLocaleLowerCase();
  input.setAttribute("aria-expanded", "false");
  state.searchIndex = -1;
  if (!query) {
    overlay.hidden = true;
    overlay.innerHTML = "";
    return;
  }
  const results = state.careers.careers.filter((role) => role.name.toLocaleLowerCase().includes(query)).slice(0, 7);
  if (!results.length) {
    overlay.innerHTML = `<div class="suggestion-empty">No role names match “${esc(input.value)}”. Try another search.</div>`;
    overlay.hidden = false;
    input.setAttribute("aria-expanded", "true");
    return;
  }
  overlay.innerHTML = results.map((role, index) => `<button role="option" aria-selected="false" class="search-suggestion" data-action="open-role" data-role-id="${esc(role.id)}" data-index="${index}"><span class="suggestion-icon">${icon(role.icon, 17)}</span><span class="suggestion-name">${esc(role.name)}<small>${esc(state.careers.sectors.find((item) => item.id === role.sector)?.name || "")}</small></span><span class="suggestion-time">${icon("clock-3", 14)}${esc(role.timeToGoal.regular.totalTime)}</span></button>`).join("");
  overlay.hidden = false;
  input.setAttribute("aria-expanded", "true");
  renderIcons();
}

function chooseSearchResult(index) {
  const options = [...document.querySelectorAll(".search-suggestion")];
  if (!options.length) return;
  state.searchIndex = (index + options.length) % options.length;
  options.forEach((option, i) => {
    option.classList.toggle("active", i === state.searchIndex);
    option.setAttribute("aria-selected", String(i === state.searchIndex));
  });
  options[state.searchIndex].scrollIntoView({ block: "nearest" });
}

function matchingRoles() {
  const questions = quizQuestions();
  const counts = {};
  for (const answer of state.quiz.answers) if (answer) counts[answer] = (counts[answer] || 0) + 1;
  const total = questions.length;
  return state.careers.careers.map((role) => {
    const score = role.quizTags.reduce((sum, tag) => sum + (counts[tag] || 0), 0);
    return { role, score, match: Math.min(96, Math.max(52, Math.round(52 + score / total * 44))) };
  }).sort((a, b) => b.score - a.score || a.role.name.localeCompare(b.role.name)).slice(0, 3);
}

function scheduleProgressSave() {
  clearTimeout(progressSaveTimer);
  journeySyncStatus = "Syncing…";
  if (routeParts()[0] === "journey") render();
  progressSaveTimer = window.setTimeout(async () => {
    try {
      await postJson("/api/user/progress", state.progress || {});
      journeySyncStatus = "Saved";
    } catch {
      journeySyncStatus = "Saved locally";
    }
    if (routeParts()[0] === "journey") render();
  }, 600);
}

function updateProgress(updater) {
  const next = structuredClone(state.progress || {});
  updater(next);
  setProgress(next);
  scheduleProgressSave();
}

function goToRole(roleId) {
  activeRoleTab = "overview";
  state.selectedDailyPhase = 0;
  location.hash = `#/role/${encodeURIComponent(roleId)}`;
}

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.id === "login-form") {
    event.preventDefault();
    const values = new FormData(form);
    await finishAuth("/api/auth/login", {
      username: String(values.get("username") || "").trim(),
      password: String(values.get("password") || ""),
    });
  }
  if (form.id === "register-form") {
    event.preventDefault();
    const values = new FormData(form);
    const password = String(values.get("password") || "");
    const confirmPassword = String(values.get("confirmPassword") || "");
    if (password !== confirmPassword) {
      setError(form.querySelector('[name="confirmPassword"]'), "Those passwords don't match yet.");
      return;
    }
    await finishAuth("/api/auth/register", {
      name: String(values.get("name") || "").trim(),
      username: String(values.get("username") || "").trim(),
      password,
    });
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.matches("#role-search")) updateSearchResults(target);
  if (target.matches("#compare-search")) {
    const query = target.value.toLocaleLowerCase().trim();
    document.querySelectorAll(".compare-option").forEach((option) => {
      option.hidden = !option.textContent.toLocaleLowerCase().includes(query);
    });
  }
});

document.addEventListener("keydown", (event) => {
  if (!event.target.matches("#role-search")) return;
  const options = document.querySelectorAll(".search-suggestion");
  if (event.key === "ArrowDown" && options.length) {
    event.preventDefault();
    chooseSearchResult(state.searchIndex + 1);
  } else if (event.key === "ArrowUp" && options.length) {
    event.preventDefault();
    chooseSearchResult(state.searchIndex <= 0 ? options.length - 1 : state.searchIndex - 1);
  } else if (event.key === "Enter" && state.searchIndex >= 0 && options[state.searchIndex]) {
    event.preventDefault();
    goToRole(options[state.searchIndex].dataset.roleId);
  } else if (event.key === "Escape") {
    document.querySelector("#search-suggestions").hidden = true;
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches("#daily-phase-select")) {
    state.selectedDailyPhase = Number(target.value);
    render();
  }
  if (target.matches('[data-action="compare-select"]')) {
    const id = target.value;
    if (target.checked && !state.selectedCompare.includes(id) && state.selectedCompare.length < 3) state.selectedCompare.push(id);
    else state.selectedCompare = state.selectedCompare.filter((selected) => selected !== id);
    render();
  }
  if (target.matches('[data-action="toggle-milestone"]')) {
    const key = target.dataset.milestone;
    updateProgress((progress) => {
      progress.completedMilestones = progress.completedMilestones || [];
      if (target.checked && !progress.completedMilestones.includes(key)) progress.completedMilestones.push(key);
      if (!target.checked) progress.completedMilestones = progress.completedMilestones.filter((value) => value !== key);
    });
  }
  if (target.matches('[data-action="toggle-daily"]')) {
    const index = Number(target.dataset.index);
    updateProgress((progress) => {
      if (!progress.daily || progress.daily.date !== localDateKey()) progress.daily = { date: localDateKey(), done: [] };
      progress.daily.done = progress.daily.done || [];
      if (target.checked && !progress.daily.done.includes(index)) progress.daily.done.push(index);
      if (!target.checked) progress.daily.done = progress.daily.done.filter((value) => value !== index);
    });
  }
});

document.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  const control = event.target.closest("[data-action]");
  if (action === "logout") logout();
  if (action === "theme-toggle") {
    setTheme(state.theme === "dark" ? "light" : "dark");
    render();
  }
  if (action === "menu-toggle") {
    const nav = document.querySelector(".nav-links");
    const open = nav?.classList.toggle("show");
    control.setAttribute("aria-expanded", String(Boolean(open)));
  }
  if (action === "password-toggle") {
    const input = control.parentElement.querySelector("input");
    input.type = input.type === "password" ? "text" : "password";
    control.innerHTML = icon(input.type === "password" ? "eye" : "eye-off", 17);
    control.setAttribute("aria-label", input.type === "password" ? "Show password" : "Hide password");
    renderIcons();
  }
  if (action === "open-role") goToRole(control.dataset.roleId);
  if (action === "pace") {
    setPace(control.dataset.pace);
    render();
  }
  if (action === "role-tab") {
    activeRoleTab = control.dataset.tab;
    render();
  }
  if (action === "print-roadmap") window.print();
  if (action === "start-path") {
    const roleId = control.dataset.roleId;
    if (state.progress?.roleId && state.progress.roleId !== roleId && !window.confirm("Starting this path will replace your current journey. Continue?")) return;
    if (state.progress?.roleId === roleId) {
      updateProgress((progress) => {
        progress.pace = state.pace || "regular";
      });
      location.hash = "#/journey";
      return;
    }
    const startedAt = localDateKey();
    setProgress({
      roleId,
      pace: state.pace || "regular",
      startedAt,
      completedMilestones: [],
      daily: { date: startedAt, done: [] },
    });
    journeySyncStatus = "Syncing…";
    location.hash = "#/journey";
    await postJson("/api/user/progress", state.progress).then(() => {
      journeySyncStatus = "Saved";
      if (routeParts()[0] === "journey") render();
    }).catch(() => {
      journeySyncStatus = "Saved locally";
      if (routeParts()[0] === "journey") render();
    });
  }
  if (action === "journey-pace") {
    updateProgress((progress) => {
      progress.pace = control.dataset.pace;
      state.pace = control.dataset.pace;
      localStorage.setItem("careerpath.pace", control.dataset.pace);
    });
  }
  if (action === "journey-reset") {
    if (!state.progress?.roleId || window.confirm("Reset your saved path and all of its milestone progress?")) {
      clearTimeout(progressSaveTimer);
      setProgress({});
      journeySyncStatus = "Syncing…";
      render();
      try {
        await postJson("/api/user/progress", {});
        journeySyncStatus = "Saved";
      } catch {
        journeySyncStatus = "Saved locally";
      }
      render();
    }
  }
  if (action === "journey-change") location.hash = "#/sectors";
  if (action === "quiz-answer") {
    state.quiz.answers[state.quiz.index] = control.dataset.tag;
    render();
  }
  if (action === "quiz-back") {
    state.quiz.index = Math.max(0, state.quiz.index - 1);
    render();
  }
  if (action === "quiz-next") {
    if (!state.quiz.answers[state.quiz.index]) return;
    if (state.quiz.index < quizQuestions().length - 1) {
      state.quiz.index += 1;
      render();
    } else {
      state.quiz.result = matchingRoles();
      render();
    }
  }
  if (action === "quiz-restart") {
    state.quiz = { index: 0, answers: [], result: null };
    render();
  }
});

window.addEventListener("hashchange", () => {
  authError = "";
  if (!state.token && !["login", "register"].includes(routeParts()[0] || "")) location.hash = "#/login";
  else render();
});

async function start() {
  if (!location.hash) location.hash = "#/login";
  if (state.token) await verifyStoredToken();
  else {
    checkingSession = false;
    render();
  }
}

start();
