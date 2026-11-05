import { Badge, esc, icon } from "../components.js";

const questions = [
  { prompt: "Which kind of problem would you enjoy working on?", options: [["logic", "Untangling a complex challenge"], ["creative", "Finding a fresh way to express an idea"], ["helping", "Making someone's day or health better"], ["building", "Making a useful thing work"]] },
  { prompt: "What would you be most curious to learn?", options: [["science", "How the natural or digital world works"], ["numbers", "What numbers can tell us"], ["communication", "How people share and understand ideas"], ["leading", "How to guide a team toward a goal"]] },
  { prompt: "Pick a project you'd most like to try.", options: [["building", "Make an app, device, or prototype"], ["creative", "Create a visual or media story"], ["helping", "Plan a community support activity"], ["numbers", "Study a real-world dataset"]] },
  { prompt: "When plans change, what do you usually do?", options: [["logic", "Look for the cause and adjust the plan"], ["communication", "Talk it through with the people involved"], ["creative", "Try a different approach"], ["leading", "Help the group decide what to do next"]] },
  { prompt: "Which school activity feels most rewarding?", options: [["science", "A practical experiment or investigation"], ["numbers", "A puzzle with a clear answer"], ["communication", "A presentation or discussion"], ["creative", "A design, performance, or story"]] },
  { prompt: "How would you like your work to help others?", options: [["helping", "Provide care, guidance, or education"], ["building", "Make tools or systems people can rely on"], ["communication", "Share useful information clearly"], ["leading", "Organize people and resources around a need"]] },
  { prompt: "Which kind of progress motivates you?", options: [["numbers", "Seeing measurable improvement"], ["creative", "Making something original and polished"], ["science", "Understanding why a result happened"], ["leading", "Helping a team reach a shared outcome"]] },
  { prompt: "Choose a workday that sounds interesting.", options: [["communication", "Interview, explain, and write"], ["logic", "Investigate, test, and solve"], ["helping", "Listen, support, and teach"], ["building", "Design, make, and improve"]] },
];

export function quizPage(state) {
  const answers = state.quiz.answers || [];
  if (state.quiz.result) {
    const picks = state.quiz.result;
    return `<section class="quiz-shell"><div class="quiz-result-top"><span class="quiz-result-icon">${icon("sparkles", 26)}</span><span class="eyebrow">YOUR MATCHES</span><h1>Here are a few paths to explore.</h1><p>Your answers are a starting point—not a test or a fixed decision. Compare these roadmaps and see what feels right.</p></div><div class="quiz-results">${picks.map(({ role, match }, index) => `<article class="quiz-result-card"><div class="quiz-result-rank">0${index + 1}</div><div class="quiz-result-main"><span class="eyebrow">${esc(state.careers.sectors.find((sector) => sector.id === role.sector)?.name || "")}</span><h2>${esc(role.name)}</h2><p>${esc(role.shortDescription)}</p><div class="quiz-result-meta">${Badge(`${match}% match`, "purple")}<span>${icon("clock-3", 15)} ${esc(role.timeToGoal.regular.totalTime)} to goal</span></div></div><a class="button button-primary" href="#/role/${encodeURIComponent(role.id)}">View roadmap ${icon("arrow-right", 16)}</a></article>`).join("")}</div><button class="button button-outline" data-action="quiz-restart">${icon("rotate-ccw", 16)} Retake quiz</button></section>`;
  }
  const index = Math.min(state.quiz.index, questions.length - 1);
  const question = questions[index];
  const selected = answers[index];
  const percent = Math.round((index / questions.length) * 100);
  return `<section class="quiz-shell"><a class="back-link" href="#/">${icon("arrow-left", 16)} Back home</a><div class="quiz-card"><div class="quiz-topline"><div><span class="eyebrow">CAREER INTEREST CHECK-IN</span><h1>A few questions about you.</h1></div><span class="quiz-count">${index + 1} <small>of ${questions.length}</small></span></div><div class="quiz-progress"><span style="width:${percent}%"></span></div><p class="quiz-question-number">QUESTION ${String(index + 1).padStart(2, "0")}</p><h2 class="quiz-question">${esc(question.prompt)}</h2><div class="quiz-options">${question.options.map(([tag, text]) => `<button class="quiz-option ${selected === tag ? "selected" : ""}" data-action="quiz-answer" data-tag="${tag}" aria-pressed="${selected === tag}"><span class="quiz-radio">${selected === tag ? icon("check", 14) : ""}</span><span>${esc(text)}</span></button>`).join("")}</div><div class="quiz-navigation">${index > 0 ? `<button class="button button-outline" data-action="quiz-back">${icon("arrow-left", 16)} Back</button>` : `<span></span>`}<button class="button button-primary" data-action="quiz-next" ${!selected ? "disabled" : ""}>${index === questions.length - 1 ? "See my matches" : "Next question"} ${icon("arrow-right", 16)}</button></div></div><p class="quiz-disclaimer">There are no right or wrong answers. Your interests can grow and change.</p></section>`;
}

export function quizQuestions() {
  return questions;
}
