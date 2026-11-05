import { DailyPlanTable, esc, icon } from "../components.js";

const formatDate = (date) => date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addDays = (date, days) => {
  const copy = new Date(`${date}T12:00:00`);
  copy.setDate(copy.getDate() + days);
  return copy;
};
const toDate = (dateString) => new Date(`${dateString}T12:00:00`);

function durationHours(time) {
  const parse = (value, meridiem) => {
    const match = value.match(/(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    let hour = Number(match[1]);
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return hour * 60 + Number(match[2]);
  };
  const parts = time.match(/(\d{1,2}:\d{2})\s*(AM|PM)?\s*[–-]\s*(\d{1,2}:\d{2})\s*(AM|PM)?/i);
  if (!parts) return 0.5;
  const endMeridiem = (parts[4] || parts[2] || "AM").toUpperCase();
  const startMeridiem = (parts[2] || endMeridiem).toUpperCase();
  let start = parse(parts[1], startMeridiem);
  let end = parse(parts[3], endMeridiem);
  if (end < start) end += 12 * 60;
  return Math.max(0, (end - start) / 60);
}

export function journeyPage(state, syncStatus = "Saved") {
  const progress = state.progress || {};
  const role = state.careers.careers.find((item) => item.id === progress.roleId);
  if (!role) return `<section class="journey-empty"><span class="empty-journey-icon">${icon("route", 28)}</span><span class="eyebrow">YOUR JOURNEY STARTS HERE</span><h1>Choose a path to begin.</h1><p>Pick a career that interests you and we'll help you plan your time, set milestones, and make a doable daily schedule.</p><a class="button button-primary" href="#/sectors">Browse career sectors ${icon("arrow-right", 16)}</a><button class="button button-text" data-action="journey-reset">${icon("rotate-ccw", 15)} Reset journey</button></section>`;

  const pace = role.timeToGoal[progress.pace || "regular"] ? progress.pace || "regular" : "regular";
  const timeline = role.timeToGoal[pace];
  const startedAt = progress.startedAt || new Date().toISOString().slice(0, 10);
  const startDate = toDate(startedAt);
  const finishDate = addDays(startedAt, timeline.totalWeeks * 7);
  const today = new Date();
  const todayKey = localDateKey(today);
  const daysRemaining = Math.max(0, Math.ceil((finishDate.getTime() - today.getTime()) / 86400000));
  const weeksCompleted = Math.min(timeline.totalWeeks, Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (7 * 86400000))));
  const milestones = progress.completedMilestones || [];
  const totalMilestones = role.phases.reduce((count, phase) => count + phase.goals.length, 0);
  const completedCount = milestones.length;
  const percent = totalMilestones ? Math.round((completedCount / totalMilestones) * 100) : 0;
  const firstOpenPhase = role.phases.findIndex((phase, index) => phase.goals.some((_, goalIndex) => !milestones.includes(`${index}-${goalIndex}`)));
  const currentIndex = firstOpenPhase >= 0 ? firstOpenPhase : role.phases.length - 1;
  const currentPhase = role.phases[currentIndex];
  const isWeekend = [0, 6].includes(today.getDay());
  const schedule = (isWeekend ? currentPhase.weekendPlan : currentPhase.dailyPlan) || [];
  const daily = progress.daily?.date === todayKey ? progress.daily : { date: todayKey, done: [] };
  const checkedHours = daily.done.reduce((total, index) => total + durationHours(schedule[index]?.time || ""), 0);
  const finishWeeks = Math.ceil((today.getTime() - startDate.getTime()) / (7 * 86400000));
  let phaseEnd = 0;
  const phaseCards = role.phases.map((phase, index) => {
    const phaseStart = phaseEnd;
    phaseEnd += phase.durationWeeks * timeline.totalWeeks / role.timeToGoal.regular.totalWeeks;
    const start = addDays(startedAt, Math.round(phaseStart * 7));
    const end = addDays(startedAt, Math.round(phaseEnd * 7));
    const isComplete = phase.goals.every((_, goalIndex) => milestones.includes(`${index}-${goalIndex}`));
    return `<article class="journey-phase ${isComplete ? "complete" : ""} ${currentIndex === index ? "current" : ""}"><div class="journey-phase-header"><span class="phase-number">${String(index + 1).padStart(2, "0")}</span><div><span class="eyebrow">${isComplete ? "COMPLETED" : currentIndex === index ? "CURRENT PHASE" : `PHASE ${index + 1}`}</span><h3>${esc(phase.title.replace(/^Phase \d+:\s*/, ""))}</h3><p>${formatDate(start)} – ${formatDate(end)} · ${Math.round(phaseEnd - phaseStart)} weeks</p></div><span class="journey-phase-state">${icon(isComplete ? "circle-check" : currentIndex === index ? "circle-dot" : "circle", 19)}</span></div><div class="milestone-list">${phase.goals.map((goal, goalIndex) => { const id = `${index}-${goalIndex}`; const done = milestones.includes(id); return `<label class="milestone ${done ? "done" : ""}"><input type="checkbox" data-action="toggle-milestone" data-milestone="${id}" ${done ? "checked" : ""} /><span class="custom-check">${icon("check", 13)}</span><span>${esc(goal)}</span></label>`; }).join("")}</div></article>`;
  }).join("");
  const scheduleRows = schedule.map((item, index) => `<tr><td><label class="schedule-check"><input type="checkbox" data-action="toggle-daily" data-index="${index}" ${daily.done.includes(index) ? "checked" : ""} /><span class="custom-check">${icon("check", 12)}</span></label></td><td class="plan-time">${esc(item.time)}</td><td>${esc(item.activity)}</td></tr>`).join("");
  const paceOptions = ["intensive", "regular", "relaxed"].map((value) => `<button data-action="journey-pace" data-pace="${value}" class="${pace === value ? "selected" : ""}" aria-pressed="${pace === value}">${value[0].toUpperCase() + value.slice(1)}</button>`).join("");

  return `<section class="journey-header"><div><a href="#/sectors" class="back-link">${icon("arrow-left", 16)} Explore careers</a><span class="eyebrow">YOUR PERSONAL ROADMAP</span><h1>${esc(role.name)}</h1><p>Keep showing up for the next step. Your pace can change as life does.</p></div><div class="journey-actions"><span class="sync-indicator ${syncStatus === "Syncing…" ? "syncing" : ""}"><span></span>${esc(syncStatus)}</span><button class="button button-outline" data-action="journey-change">${icon("repeat-2", 16)} Change path</button></div></section><section class="journey-summary"><article class="journey-summary-main"><span class="journey-summary-icon">${icon("clock-3", 22)}</span><div><span class="eyebrow">TIME TO GOAL · ${pace.toUpperCase()}</span><h2>${esc(timeline.totalTime)}</h2><p>${timeline.hoursPerDay} focused study hours per day</p></div><div class="journey-pace-controls" role="group" aria-label="Change your study pace">${paceOptions}</div></article><div class="journey-stats"><div><span>${icon("calendar-days", 16)} Started on</span><strong>${formatDate(startDate)}</strong></div><div><span>${icon("flag", 16)} Finish by</span><strong>${formatDate(finishDate)}</strong></div><div><span>${icon("hourglass", 16)} Days remaining</span><strong>${daysRemaining}</strong></div><div><span>${icon("trending-up", 16)} Weeks completed</span><strong>${weeksCompleted} <small>/ ${timeline.totalWeeks}</small></strong></div></div><div class="journey-progress-row"><div><span>Milestones complete</span><strong>${completedCount} / ${totalMilestones}</strong></div><div class="progress-track"><span style="width:${percent}%"></span></div><strong class="progress-percent">${percent}%</strong></div></section><section class="today-card"><div class="today-heading"><div><span class="eyebrow">${today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()} · ${isWeekend ? "WEEKEND PLAN" : "WEEKDAY PLAN"}</span><h2>Today's schedule</h2><p>${esc(currentPhase.title.replace(/^Phase \d+:\s*/, ""))} · ${currentIndex === role.phases.length - 1 ? "You're in the final phase" : "Your current phase"}</p></div><div class="hours-done"><strong>${checkedHours.toFixed(1)}<small> hrs</small></strong><span>hours done today</span></div></div><div class="table-scroll"><table class="today-table"><thead><tr><th aria-label="Complete"></th><th>Time</th><th>Activity</th></tr></thead><tbody>${scheduleRows}</tbody></table></div>${schedule.length ? "" : `<p class="empty-inline">No schedule items are available for today.</p>`}</section><section class="journey-roadmap-heading"><div><span class="eyebrow">YOUR MILESTONES</span><h2>Small steps add up.</h2><p>Target dates adjust automatically when you change your pace.</p></div><button class="text-link danger-link" data-action="journey-reset">${icon("rotate-ccw", 15)} Reset journey</button></section><div class="journey-phases">${phaseCards}</div><p class="journey-fineprint">${icon("info", 14)} Timelines are estimates and vary by individual. Formal admissions, internships, exams, and hiring schedules may affect your finish date.</p>`;
}
