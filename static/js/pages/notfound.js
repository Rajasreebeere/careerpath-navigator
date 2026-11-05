import { icon } from "../components.js";

export function notFoundPage() {
  return `<section class="not-found"><span class="not-found-icon">${icon("map", 27)}</span><span class="eyebrow">THIS PATH DOESN'T EXIST</span><h1>Let's find your way back.</h1><p>That page isn't part of this roadmap yet.</p><a href="#/" class="button button-primary">Go to home ${icon("arrow-right", 16)}</a></section>`;
}
