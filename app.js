const difficultyConfig = {
  easy: { label: "Ușor", maxTier: 1 },
  medium: { label: "Mediu", maxTier: 2 },
  hard: { label: "Greu", maxTier: 3 },
  expert: { label: "Foarte greu", maxTier: 4 }
};

const regionNames = new Intl.DisplayNames(["ro"], { type: "region" });

function getCountryName(country) {
  if (country.code.includes("-")) return country.name;
  const localizedName = regionNames.of(country.code);
  return localizedName && localizedName !== country.code ? localizedName : country.name;
}

function formatCapitals(capitals) {
  if (capitals.length <= 1) return capitals[0] ?? "";
  if (capitals.length === 2) return capitals.join(" și ");
  return `${capitals.slice(0, -1).join(", ")} și ${capitals.at(-1)}`;
}

const countryData = (window.COUNTRIES ?? []).map((country) => ({
  ...country,
  displayName: getCountryName(country),
  answer: formatCapitals(country.capitals)
}));

const screens = {
  intro: document.querySelector("#intro-screen"),
  quiz: document.querySelector("#quiz-screen"),
  result: document.querySelector("#result-screen")
};

const elements = {
  difficultyButtons: [...document.querySelectorAll(".difficulty-option")],
  countButtons: [...document.querySelectorAll(".count-option")],
  startButton: document.querySelector("#start-button"),
  restartButton: document.querySelector("#restart-button"),
  nextButton: document.querySelector("#next-button"),
  nextLabel: document.querySelector("#next-button span:first-child"),
  questionCount: document.querySelector("#question-count"),
  scoreLabel: document.querySelector("#score-label"),
  progressTrack: document.querySelector(".progress-track"),
  progressValue: document.querySelector("#progress-value"),
  countryFlag: document.querySelector("#country-flag"),
  countryName: document.querySelector("#country-name"),
  questionTitle: document.querySelector("#question-title"),
  answers: document.querySelector("#answers"),
  feedback: document.querySelector("#feedback"),
  resultEyebrow: document.querySelector("#result-eyebrow"),
  resultScore: document.querySelector("#result-score"),
  resultMessage: document.querySelector("#result-message")
};

let selectedDifficulty = "easy";
let selectedQuestionCount = "10";
let activePool = [];
let questions = [];
let questionTotal = 10;
let currentIndex = 0;
let score = 0;
let answered = false;

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function getAvailablePool() {
  const maxTier = difficultyConfig[selectedDifficulty].maxTier;
  return countryData.filter((country) => country.capitals.length > 0 && country.difficulty <= maxTier);
}

function updateGroupSelection(buttons, selectedButton) {
  buttons.forEach((button) => {
    const isSelected = button === selectedButton;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function selectDifficulty(button) {
  selectedDifficulty = button.dataset.difficulty;
  updateGroupSelection(elements.difficultyButtons, button);
  updateAllCountLabel();
}

function selectQuestionCount(button) {
  selectedQuestionCount = button.dataset.count;
  updateGroupSelection(elements.countButtons, button);
}

function updateAllCountLabel() {
  const availableCount = getAvailablePool().length;
  const allButton = elements.countButtons.find((button) => button.dataset.count === "all");
  allButton.setAttribute("aria-label", `Toate cele ${availableCount} de întrebări disponibile la acest nivel`);
}

function changeScreen(target) {
  const current = Object.values(screens).find((screen) => !screen.hidden);

  if (current === target) return;

  if (current) {
    current.classList.remove("is-active");
    window.setTimeout(() => {
      current.hidden = true;
      target.hidden = false;
      requestAnimationFrame(() => target.classList.add("is-active"));
    }, 180);
  } else {
    target.hidden = false;
    requestAnimationFrame(() => target.classList.add("is-active"));
  }
}

function startQuiz() {
  activePool = getAvailablePool();
  questionTotal = selectedQuestionCount === "all"
    ? activePool.length
    : Math.min(Number(selectedQuestionCount), activePool.length);
  questions = shuffle(activePool).slice(0, questionTotal);
  currentIndex = 0;
  score = 0;
  answered = false;
  elements.progressTrack.setAttribute("aria-valuemax", String(questionTotal));
  renderQuestion();
  changeScreen(screens.quiz);
  window.setTimeout(() => elements.questionTitle.focus({ preventScroll: true }), 260);
}

function updateScoreLabel() {
  const scoreText = `${score} ${score === 1 ? "corect" : "corecte"}`;
  const difficultyLabel = difficultyConfig[selectedDifficulty].label;
  elements.scoreLabel.textContent = `${scoreText} · ${difficultyLabel}`;
  elements.scoreLabel.setAttribute("aria-label", `Scor curent: ${score}. Nivel ${difficultyLabel}`);
}

function buildOptions(question) {
  const usedAnswers = new Set([question.answer]);
  const distractors = [];

  for (const candidate of shuffle(activePool)) {
    if (!candidate.answer || usedAnswers.has(candidate.answer)) continue;
    usedAnswers.add(candidate.answer);
    distractors.push(candidate.answer);
    if (distractors.length === 3) break;
  }

  return shuffle([question.answer, ...distractors]);
}

function createAnswerButton(option, index) {
  const button = document.createElement("button");
  const letter = String.fromCharCode(65 + index);
  button.type = "button";
  button.className = "answer";
  button.dataset.value = option;
  button.setAttribute("aria-label", `${letter}. ${option}`);

  const letterElement = document.createElement("span");
  letterElement.className = "answer-letter";
  letterElement.setAttribute("aria-hidden", "true");
  letterElement.textContent = letter;

  const textElement = document.createElement("span");
  textElement.className = "answer-text";
  textElement.textContent = option;

  const statusElement = document.createElement("span");
  statusElement.className = "answer-status";
  statusElement.setAttribute("aria-hidden", "true");

  button.append(letterElement, textElement, statusElement);
  button.addEventListener("click", (event) => selectAnswer(button, option, event));
  return button;
}

function renderQuestion() {
  const question = questions[currentIndex];
  const options = buildOptions(question);
  const questionNumber = currentIndex + 1;

  answered = false;
  elements.questionCount.textContent = `Întrebarea ${questionNumber} din ${questionTotal}`;
  updateScoreLabel();
  elements.progressValue.style.width = `${(questionNumber / questionTotal) * 100}%`;
  elements.progressTrack.setAttribute("aria-valuenow", String(questionNumber));
  elements.countryFlag.src = question.flag;
  elements.countryFlag.alt = `Steagul pentru ${question.displayName}`;
  elements.countryName.textContent = question.displayName;
  elements.questionTitle.textContent = question.capitals.length > 1
    ? `Ce capitale are ${question.displayName}?`
    : `Ce capitală are ${question.displayName}?`;
  elements.feedback.textContent = "";
  elements.feedback.className = "feedback";
  elements.nextButton.classList.remove("is-visible");
  elements.nextButton.tabIndex = -1;
  elements.nextButton.setAttribute("aria-hidden", "true");
  elements.nextLabel.textContent = currentIndex === questionTotal - 1 ? "Vezi rezultatul" : "Întrebarea următoare";
  elements.answers.replaceChildren(...options.map(createAnswerButton));
}

function showFeedback(isCorrect, correctAnswer) {
  const strong = document.createElement("strong");
  strong.textContent = isCorrect ? "Corect!" : "Aproape!";
  const message = document.createTextNode(
    isCorrect ? " Ai găsit capitala." : ` Răspunsul corect este ${correctAnswer}.`
  );
  elements.feedback.replaceChildren(strong, message);
  elements.feedback.classList.toggle("is-success", isCorrect);
}

function selectAnswer(selectedButton, selectedValue, activationEvent) {
  if (answered) return;
  answered = true;

  const question = questions[currentIndex];
  const isCorrect = selectedValue === question.answer;
  const answerButtons = [...elements.answers.querySelectorAll(".answer")];

  answerButtons.forEach((button) => {
    button.disabled = true;
    const status = button.querySelector(".answer-status");
    if (button.dataset.value === question.answer) {
      button.classList.add("is-correct");
      status.textContent = "✓";
    }
  });

  if (isCorrect) {
    score += 1;
    updateScoreLabel();
  } else {
    selectedButton.classList.add("is-wrong");
    selectedButton.querySelector(".answer-status").textContent = "×";
  }

  showFeedback(isCorrect, question.answer);
  elements.nextButton.classList.add("is-visible");
  elements.nextButton.tabIndex = 0;
  elements.nextButton.setAttribute("aria-hidden", "false");
  if (activationEvent.detail === 0) {
    elements.nextButton.focus({ preventScroll: true });
  }
}

function nextQuestion() {
  if (!answered) return;

  if (currentIndex < questionTotal - 1) {
    currentIndex += 1;
    renderQuestion();
    elements.questionTitle.focus({ preventScroll: true });
    return;
  }

  showResult();
}

function showResult() {
  const successRate = score / questionTotal;
  elements.resultEyebrow.textContent = `Nivel ${difficultyConfig[selectedDifficulty].label} · Turul lumii s-a încheiat`;
  elements.resultScore.textContent = `Ai răspuns corect la ${score} din ${questionTotal} întrebări.`;

  if (successRate >= 0.8) {
    elements.resultMessage.textContent = "Excelent! Cunoști foarte bine harta lumii.";
  } else if (successRate >= 0.5) {
    elements.resultMessage.textContent = "Foarte bine! Mai ai doar câteva capitale de descoperit.";
  } else {
    elements.resultMessage.textContent = "Un început bun. Fiecare rundă te ajută să înveți.";
  }

  changeScreen(screens.result);
  window.setTimeout(() => document.querySelector("#result-title").focus({ preventScroll: true }), 260);
}

function returnToDifficultyPicker() {
  changeScreen(screens.intro);
  const selectedButton = elements.difficultyButtons.find((button) => button.classList.contains("is-selected"));
  window.setTimeout(() => selectedButton.focus({ preventScroll: true }), 260);
}

elements.questionTitle.tabIndex = -1;
document.querySelector("#result-title").tabIndex = -1;
elements.difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => selectDifficulty(button));
});
elements.countButtons.forEach((button) => {
  button.addEventListener("click", () => selectQuestionCount(button));
});
elements.startButton.addEventListener("click", startQuiz);
elements.restartButton.addEventListener("click", returnToDifficultyPicker);
elements.nextButton.addEventListener("click", nextQuestion);
updateAllCountLabel();
