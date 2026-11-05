import { RoleCard, esc, icon } from "../components.js";

export function sectorPage(state, sectorId) {
  const sector = state.careers.sectors.find((item) => item.id === sectorId);
  if (!sector) return null;
  const roles = state.careers.careers.filter((role) => role.sector === sector.id);
  return `<section class="page-heading sector-page-heading"><a href="#/sectors" class="back-link">${icon("arrow-left", 16)} All sectors</a><div class="sector-title-line"><span class="sector-icon">${icon(sector.icon, 25)}</span><div><span class="eyebrow">${roles.length} CAREER PATHS</span><h1>${esc(sector.name)}</h1></div></div><p>${esc(sector.description)}</p></section><div class="role-grid">${roles.map((role) => RoleCard(role, sector)).join("")}</div>`;
}
