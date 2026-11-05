import { SectorCard } from "../components.js";

export function sectorsPage(state) {
  return `<section class="page-heading"><span class="eyebrow">EXPLORE CAREER AREAS</span><h1>Find an area that interests you.</h1><p>Start broad. You can compare individual paths and their timelines once you find a sector to explore.</p></section><div class="sector-grid sector-grid-large">${state.careers.sectors.map((sector) => SectorCard(sector, state.careers.careers.filter((role) => role.sector === sector.id).length)).join("")}</div><section class="note-strip">${`<span>${`Browse ${state.careers.careers.length} career paths across ${state.careers.sectors.length} sectors.`}</span>`}<span>Each roadmap includes a time estimate and a practical study plan.</span></section>`;
}
