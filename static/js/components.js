export const esc = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

export const icon = (name, size = 18) => `<i data-lucide="${esc(name)}" width="${size}" height="${size}" aria-hidden="true"></i>`;

export function Spinner({ label = "Loading your workspace" } = {}) {
  return `<div class="spinner-screen" role="status"><span class="spinner"></span><span>${esc(label)}</span></div>`;
}

export function Badge(text, tone = "blue") {
  return `<span class="badge badge-${esc(tone)}">${esc(text)}</span>`;
}

export function Navbar(user) {
  const links = [
    ["Home", "#/", "house"],
    ["Sectors", "#/sectors", "blocks"],
    ["Compare", "#/compare", "columns-3"],
    ["Quiz", "#/quiz", "sparkles"],
    ["My Journey", "#/journey", "route"],
  ];
  return `<header class="topbar"><a class="brand" href="#/" aria-label="CareerPath Navigator home"><span class="brand-mark">${icon("compass", 19)}</span><span>CareerPath <b>Navigator</b></span></a><button class="menu-toggle icon-button" data-action="menu-toggle" aria-label="Open navigation" aria-expanded="false">${icon("menu")}</button><nav class="nav-links" aria-label="Main navigation">${links.map(([label, href, ico]) => `<a href="${href}" class="${location.hash === href ? "active" : ""}">${icon(ico, 16)}<span>${label}</span></a>`).join("")}</nav><div class="user-controls"><button class="icon-button theme-toggle" data-action="theme-toggle" aria-label="Toggle color theme">${icon(document.documentElement.classList.contains("dark") ? "sun" : "moon", 17)}</button><span class="user-greeting">${esc(user?.name || "Student")}</span><button class="logout-button" data-action="logout">${icon("log-out", 16)}<span>Log out</span></button></div></header>`;
}

export function Footer() {
  return `<footer class="site-footer"><span>CareerPath Navigator</span><span>Timelines are estimates and vary by individual.</span></footer>`;
}

export function RoleCard(role, sector) {
  return `<a class="role-card" href="#/role/${encodeURIComponent(role.id)}"><div class="role-card-top"><span class="role-icon">${icon(role.icon, 20)}</span>${Badge(role.difficulty, role.difficulty.toLowerCase())}</div><h3>${esc(role.name)}</h3><p>${esc(role.shortDescription)}</p><div class="role-card-meta"><span>${icon("clock-3", 15)}${esc(role.totalTime)}</span><span>${esc(sector?.name || "")}</span></div></a>`;
}

export function SectorCard(sector, count) {
  return `<a class="sector-card" href="#/sector/${encodeURIComponent(sector.id)}"><span class="sector-icon">${icon(sector.icon, 22)}</span><span class="sector-count">${count} ${count === 1 ? "path" : "paths"}</span><h3>${esc(sector.name)}</h3><p>${esc(sector.description)}</p><span class="sector-link">Explore paths ${icon("arrow-right", 16)}</span></a>`;
}

export function SearchBar() {
  return `<div class="search-wrap"><label class="search-box">${icon("search", 19)}<input id="role-search" type="search" autocomplete="off" placeholder="Search roles, skills, or interests" aria-label="Search career roles" aria-controls="search-suggestions" aria-expanded="false" /><span class="search-hint">Press enter</span></label><div id="search-suggestions" class="search-suggestions" role="listbox" hidden></div></div>`;
}

export function PaceSelector(selected) {
  return `<div class="pace-selector" role="group" aria-label="Choose study pace">${[
    ["intensive", "Intensive"],
    ["regular", "Regular"],
    ["relaxed", "Relaxed"],
  ].map(([value, label]) => `<button data-action="pace" data-pace="${value}" class="${selected === value ? "selected" : ""}" aria-pressed="${selected === value}">${label}</button>`).join("")}</div>`;
}

export function TimeToGoalCard(role, pace, startedAt = new Date()) {
  const time = role.timeToGoal[pace] || role.timeToGoal.regular;
  const finish = new Date(startedAt);
  finish.setDate(finish.getDate() + time.totalWeeks * 7);
  const finishLabel = finish.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `<div class="time-goal-card"><div class="time-goal-copy"><span class="eyebrow">${icon("clock-3", 16)} TIME TO GOAL</span><strong>${esc(time.totalTime)}</strong><span class="time-goal-note">${time.hoursPerDay} focused study hours per day · estimated finish ${esc(finishLabel)}</span></div><div class="pace-picker">${PaceSelector(pace)}</div></div>`;
}

export function PhaseTimeline(phases) {
  let cumulative = 0;
  return `<ol class="phase-timeline">${phases.map((phase, index) => {
    const start = cumulative + 1;
    cumulative += phase.durationWeeks;
    return `<li class="phase-point"><span class="phase-number">${String(index + 1).padStart(2, "0")}</span><div class="phase-content"><div class="phase-heading"><h3>${esc(phase.title)}</h3><span>${esc(phase.duration)} · ${phase.durationWeeks} weeks</span></div><p>Weeks ${start}–${cumulative} · ends at week ${cumulative}</p><ul>${phase.goals.map((goal) => `<li>${esc(goal)}</li>`).join("")}</ul></div></li>`;
  }).join("")}</ol>`;
}

function blockHours(time) {
  const parts = String(time).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!parts) return 0;
  const minutes = (hourText, minuteText, meridiem) => {
    let hour = Number(hourText);
    if (meridiem?.toUpperCase() === "PM" && hour !== 12) hour += 12;
    if (meridiem?.toUpperCase() === "AM" && hour === 12) hour = 0;
    return hour * 60 + Number(minuteText);
  };
  const endMeridiem = (parts[6] || parts[3] || "AM").toUpperCase();
  const startMeridiem = (parts[3] || endMeridiem).toUpperCase();
  const start = minutes(parts[1], parts[2], startMeridiem);
  let end = minutes(parts[4], parts[5], endMeridiem);
  if (end < start) end += 720;
  return Math.max(0, (end - start) / 60);
}

export function DailyPlanTable(rows, title, iconName = "calendar-days", showTotal = false) {
  const hours = showTotal ? rows.reduce((sum, row) => sum + blockHours(row.time), 0) : 0;
  return `<section class="plan-table-card"><div class="plan-table-title">${icon(iconName, 17)}<h3>${esc(title)}</h3></div><div class="table-scroll"><table><thead><tr><th>Time</th><th>Activity</th></tr></thead><tbody>${rows.map((row) => `<tr><td class="plan-time">${esc(row.time)}</td><td>${esc(row.activity)}</td></tr>`).join("")}</tbody></table></div>${showTotal ? `<div class="total-hours-line"><span>${icon("clock-3", 14)} Total planned study time</span><strong>${Number.isInteger(hours) ? hours : hours.toFixed(1)} hours</strong></div>` : ""}</section>`;
}

export function layout(content, user) {
  return `${Navbar(user)}<main class="page-shell">${content}</main>${Footer()}`;
}
