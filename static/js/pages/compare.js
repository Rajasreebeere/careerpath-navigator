import { Badge, esc, icon } from "../components.js";

const dimensions = [
  ["Time to goal", (role) => `<div class="compare-times">${["intensive", "regular", "relaxed"].map((pace) => `<span><b>${pace[0].toUpperCase() + pace.slice(1)}:</b> ${esc(role.timeToGoal[pace].totalTime)}</span>`).join("")}</div>`],
  ["Study hours / day", (role) => ["intensive", "regular", "relaxed"].map((pace) => `<span>${pace[0].toUpperCase() + pace.slice(1)}: ${role.timeToGoal[pace].hoursPerDay} hrs</span>`).join("<br>")],
  ["Difficulty", (role) => Badge(role.difficulty, role.difficulty.toLowerCase())],
  ["Salary range", (role) => esc(role.salaryRange)],
  ["Demand", (role) => esc(role.demand)],
  ["Key technical skills", (role) => role.skills.technical.slice(0, 5).map((skill) => `<span class="compare-chip">${esc(skill)}</span>`).join("")],
  ["Must-have tools", (role) => role.languagesAndTools.filter((tool) => tool.priority === "Must-have").map((tool) => `<span class="compare-chip">${esc(tool.name)}</span>`).join("")],
  ["Exams / certifications", (role) => role.requirements.exams.map((exam) => `<span class="compare-chip">${esc(exam)}</span>`).join("")],
];

export function comparePage(state) {
  const selected = state.selectedCompare.map((id) => state.careers.careers.find((role) => role.id === id)).filter(Boolean);
  const choices = state.careers.careers.map((role) => `<label class="compare-option"><input type="checkbox" data-action="compare-select" value="${esc(role.id)}" ${state.selectedCompare.includes(role.id) ? "checked" : ""} ${!state.selectedCompare.includes(role.id) && state.selectedCompare.length >= 3 ? "disabled" : ""} /><span>${esc(role.name)}</span><small>${esc(state.careers.sectors.find((sector) => sector.id === role.sector)?.name || "")}</small></label>`).join("");
  const desktop = selected.length ? `<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>Compare</th>${selected.map((role) => `<th><span class="compare-role-icon">${icon(role.icon, 19)}</span><strong>${esc(role.name)}</strong></th>`).join("")}</tr></thead><tbody>${dimensions.map(([label, render]) => `<tr><th>${esc(label)}</th>${selected.map((role) => `<td>${render(role)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "";
  const mobile = selected.length ? `<div class="compare-mobile-cards">${selected.map((role) => `<article class="compare-mobile-card"><header><span class="compare-role-icon">${icon(role.icon, 20)}</span><div><h2>${esc(role.name)}</h2>${Badge(role.difficulty, role.difficulty.toLowerCase())}</div></header>${dimensions.map(([label, render]) => `<section><strong>${esc(label)}</strong><div>${render(role)}</div></section>`).join("")}</article>`).join("")}</div>` : "";
  return `<section class="page-heading"><span class="eyebrow">SIDE-BY-SIDE VIEW</span><h1>Compare career paths.</h1><p>Look at the time, daily study commitment, skills, and requirements before you choose.</p></section><section class="compare-picker"><div class="section-subheading">${icon("columns-3", 19)}<h2>Choose 2–3 careers</h2></div><label class="compare-search">${icon("search", 17)}<input id="compare-search" type="search" placeholder="Search career paths" aria-label="Search career paths to compare" /></label><div class="compare-options" id="compare-options">${choices}</div><p class="compare-count">${selected.length} of 3 selected · Choose at least 2 to compare.</p></section>${selected.length >= 2 ? desktop + mobile : `<div class="empty-compare"><span>${icon("move-horizontal", 22)}</span><p>Select at least two paths to see how they compare.</p></div>`}`;
}
