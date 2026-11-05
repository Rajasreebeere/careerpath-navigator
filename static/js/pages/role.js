import { Badge, DailyPlanTable, PhaseTimeline, TimeToGoalCard, esc, icon } from "../components.js";

const tabs = [
  ["overview", "Overview", "layout-dashboard"],
  ["requirements", "Requirements", "clipboard-check"],
  ["skills", "Skills", "sparkles"],
  ["tools", "Languages & Tools", "wrench"],
  ["timeline", "Timeline", "git-branch"],
  ["daily", "Daily Plan", "calendar-days"],
  ["resources", "Resources", "book-open"],
  ["growth", "Career Growth", "trending-up"],
];

const list = (items = []) => `<ul class="detail-list">${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
const tags = (items = []) => `<div class="tag-list">${items.map((item) => `<span class="skill-tag">${esc(item)}</span>`).join("")}</div>`;
const paceMonths = (role) => `<div class="pace-comparison">${["intensive", "regular", "relaxed"].map((pace) => `<div class="pace-comparison-card ${pace}"><span>${pace[0].toUpperCase() + pace.slice(1)}</span><strong>${esc(role.timeToGoal[pace].totalTime)}</strong><small>${role.timeToGoal[pace].hoursPerDay} hours / day</small></div>`).join("")}</div>`;

function timelinePanel(role) {
  return `<div class="panel-intro"><span class="eyebrow">A PHASE-BY-PHASE VIEW</span><h2>Your roadmap at a glance</h2><p>Study hours change with your chosen pace. Formal course, internship, and recruitment timelines may still be fixed by the relevant institution.</p></div>${paceMonths(role)}${PhaseTimeline(role.phases)}`;
}

function dailyPanel(role, selectedPhase) {
  const index = Math.min(Math.max(Number(selectedPhase) || 0, 0), role.phases.length - 1);
  const phasePlans = role.phases.map((phase, i) => `<div class="phase-daily-content ${i === index ? "active" : ""}" data-plan-phase="${i}"><h3 class="daily-phase-title">${esc(phase.title)}</h3><div class="plan-columns">${DailyPlanTable(phase.dailyPlan, "Weekday plan", "calendar-days", true)}${DailyPlanTable(phase.weekendPlan, "Weekend plan", "sun")}</div><section class="weekly-goals"><div class="section-subheading">${icon("target", 18)}<h3>Weekly goals</h3></div><div class="weekly-goal-list">${phase.weeklyGoals.map((goal, j) => `<div><span>${String(j + 1).padStart(2, "0")}</span>${esc(goal)}</div>`).join("")}</div></section></div>`).join("");
  return `<div class="panel-intro"><span class="eyebrow">MAKE PROGRESS, ONE DAY AT A TIME</span><h2>A study plan for your phase</h2><p>Use this as a starting routine and adjust the hours to your school, work, and responsibilities.</p></div><label class="phase-select-label">Choose a phase<select id="daily-phase-select">${role.phases.map((item, i) => `<option value="${i}" ${index === i ? "selected" : ""}>${esc(item.title)}</option>`).join("")}</select></label>${phasePlans}<section class="life-card"><div class="life-heading"><span class="section-icon">${icon("briefcase-business", 20)}</span><div><span class="eyebrow">AFTER YOU REACH YOUR GOAL</span><h3>A day in the life of a ${esc(role.name)}</h3></div></div><p>Every workplace is different. This sample helps you picture the work beyond the qualification path.</p>${DailyPlanTable(role.dayInTheLife, "A working day", "sun")}</section>`;
}

function panel(role, key, phase) {
  if (key === "overview") return `<div class="overview-grid"><article class="info-panel"><span class="eyebrow">THE ROLE</span><h2>What does a ${esc(role.name)} do?</h2><p>${esc(role.overview)}</p><div class="overview-chips">${Badge(`Demand: ${role.demand}`, "green")}<span class="salary-chip">${icon("indian-rupee", 16)} ${esc(role.salaryRange)}</span></div></article><article class="info-panel"><span class="eyebrow">A PLACE TO START</span><h3>Where you could work</h3>${list(role.whereItWorks)}<div class="goal-definition">${icon("flag", 17)}<p>${esc(role.goalDefinition)}</p></div></article></div>`;
  if (key === "requirements") return `<div class="details-grid">${[["Education", role.requirements.education, "graduation-cap"], ["Exams & certifications", role.requirements.exams, "file-check-2"], ["Eligibility notes", role.requirements.eligibility, "badge-check"]].map(([title, items, ico]) => `<article class="info-panel"><span class="section-icon">${icon(ico, 19)}</span><h3>${title}</h3>${list(items)}</article>`).join("")}</div>`;
  if (key === "skills") return `<div class="details-grid"><article class="info-panel"><span class="section-icon">${icon("cpu", 19)}</span><span class="eyebrow">PRACTICAL KNOW-HOW</span><h3>Technical skills</h3>${tags(role.skills.technical)}</article><article class="info-panel"><span class="section-icon">${icon("users-round", 19)}</span><span class="eyebrow">HOW YOU WORK</span><h3>Soft skills</h3>${tags(role.skills.soft)}</article></div>`;
  if (key === "tools") return `<div class="panel-intro"><span class="eyebrow">TOOLS YOU MAY USE</span><h2>Start with the essentials</h2><p>Requirements differ across employers and institutions. Treat this list as a guide, then check current job or course requirements.</p></div><div class="tool-grid">${role.languagesAndTools.map((tool) => `<article class="tool-card"><span class="tool-check">${icon(tool.priority === "Must-have" ? "check" : "plus", 17)}</span><div><h3>${esc(tool.name)}</h3><span class="tool-priority ${tool.priority === "Must-have" ? "must" : ""}">${esc(tool.priority)}</span></div></article>`).join("")}</div>`;
  if (key === "timeline") return timelinePanel(role);
  if (key === "daily") return dailyPanel(role, phase);
  if (key === "resources") return `<div class="panel-intro"><span class="eyebrow">KEEP LEARNING</span><h2>Resources to help you build momentum</h2><p>Use official course and exam notices for current dates, eligibility, fees, and registration requirements.</p></div><div class="resource-grid">${role.resources.map((resource) => `<a href="${esc(resource.link)}" target="_blank" rel="noopener noreferrer" class="resource-card"><span class="resource-icon">${icon(resource.type === "Course" ? "graduation-cap" : resource.type === "Book" ? "book-open" : resource.type === "YouTube" ? "play-circle" : "globe-2", 19)}</span><div><span class="resource-type">${esc(resource.type)}</span><h3>${esc(resource.title)}</h3><span class="resource-url">${esc(new URL(resource.link).hostname)} ${icon("arrow-up-right", 13)}</span></div></a>`).join("")}</div>`;
  if (key === "growth") {
    const related = role.relatedRoles.map((id) => stateCareer(id)).filter(Boolean);
    return `<div class="growth-grid"><section class="info-panel"><span class="eyebrow">WHERE EXPERIENCE CAN LEAD</span><h2>Career growth</h2><ol class="growth-ladder">${role.careerGrowth.map((title, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(title)}</strong></li>`).join("")}</ol></section><section class="info-panel"><span class="eyebrow">NEARBY POSSIBILITIES</span><h2>Related paths</h2><div class="related-list">${related.map((item) => `<a href="#/role/${encodeURIComponent(item.id)}"><span>${icon(item.icon, 17)}${esc(item.name)}</span>${icon("arrow-up-right", 16)}</a>`).join("")}</div></section></div>`;
  }
  return "";
}

let activeCareers = [];
function stateCareer(id) {
  return activeCareers.find((item) => item.id === id);
}

export function rolePage(state, role, activeTab = "overview", phaseIndex = 0) {
  activeCareers = state.careers.careers;
  const tab = tabs.some(([key]) => key === activeTab) ? activeTab : "overview";
  const pace = state.pace || "regular";
  const roleSector = state.careers.sectors.find((sector) => sector.id === role.sector);
  return `<div class="role-page"><a href="#/sector/${encodeURIComponent(role.sector)}" class="back-link">${icon("arrow-left", 16)} ${esc(roleSector?.name || "All sectors")}</a><section class="role-heading"><div class="role-heading-main"><span class="role-icon role-icon-large">${icon(role.icon, 26)}</span><div><span class="eyebrow">${esc(roleSector?.name || "")}</span><h1>${esc(role.name)}</h1><p>${esc(role.shortDescription)}</p></div></div><div class="role-heading-badges">${Badge(role.difficulty, role.difficulty.toLowerCase())}${Badge(`Demand: ${role.demand}`, "green")}</div></section>${TimeToGoalCard(role, pace)}<div class="role-action-bar"><button class="button button-primary" data-action="start-path" data-role-id="${esc(role.id)}">${icon("route", 17)} ${state.progress?.roleId === role.id ? "Open this path in My Journey" : "Start this path"}</button><button class="button button-outline" data-action="print-roadmap">${icon("printer", 17)} Print / Download roadmap</button></div><div class="role-tabs-wrap"><div class="role-tabs" role="tablist" aria-label="Career roadmap sections">${tabs.map(([key, label, ico]) => `<button id="tab-${key}" role="tab" aria-selected="${tab === key}" aria-controls="panel-${key}" class="role-tab ${tab === key ? "active" : ""}" data-action="role-tab" data-tab="${key}">${icon(ico, 16)}${label}</button>`).join("")}</div></div><div class="role-panels">${tabs.map(([key]) => `<section id="panel-${key}" role="tabpanel" aria-labelledby="tab-${key}" class="role-panel ${tab === key ? "active" : ""}">${panel(role, key, phaseIndex)}</section>`).join("")}</div></div>`;
}
