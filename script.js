const characterCards = [
  {
    id: "mabel",
    name: "Mabel",
    role: "Pattern Seeker",
    ability: "Witness encounters reveal clearer notes in Case Notes.",
    signature: "Needlepoint Grid",
    stats: { logic: 4, charm: 3, nerve: 5 },
    color: "#d26a78",
    initials: "MB",
  },
  {
    id: "charles",
    name: "Charles",
    role: "Forensic Mind",
    ability: "Forensic clues expose confidence indicators.",
    signature: "Brazzos Recall",
    stats: { logic: 5, charm: 2, nerve: 4 },
    color: "#5f8abf",
    initials: "CH",
  },
  {
    id: "oliver",
    name: "Oliver",
    role: "Director",
    ability: "Group Text has a 30% chance to trigger twice.",
    signature: "Producer Instinct",
    stats: { logic: 2, charm: 5, nerve: 3 },
    color: "#ca9c3b",
    initials: "OL",
  },
];

const suspects = ["Bunny", "Jan", "Cinda", "Teddy", "Howard", "Poppy", "Donna", "Loretta"];
const objects = ["Bassoon Reed", "Poisoned Dip", "Podcast Mic", "Knit Needle", "Stage Light", "Key Fob", "Matchbook", "Broken Vase"];
const motives = ["Revenge", "Blackmail", "Jealousy", "Inheritance", "Cover-up", "Career Sabotage", "Obsession", "Debt"];
const victims = ["Lester", "Eva Kane", "Nina Lin", "Milo Graves", "Vera Bell", "Theo's Agent"];
const residents = [
  { id: "lester", name: "Lester", facets: ["apartment", "suspect"] },
  { id: "howard", name: "Howard", facets: ["suspect", "motive"] },
  { id: "uma", name: "Uma", facets: ["object", "suspect"] },
  { id: "theo", name: "Theo", facets: ["apartment", "object"] },
  { id: "bunny", name: "Bunny", facets: ["motive", "apartment"] },
  { id: "cinda", name: "Cinda", facets: ["suspect", "object"] },
  { id: "poppy", name: "Poppy", facets: ["motive", "object"] },
  { id: "jan", name: "Jan", facets: ["suspect", "motive"] },
];

const ringTiles = [
  "Lobby",
  "Podcast Studio",
  "Penthouse A",
  "Rooftop",
  "Penthouse B",
  "East Hall",
  "Freight Lift",
  "Theater Room",
  "Catacombs",
  "Laundry",
  "Kitchen",
  "Wine Cellar",
  "Security Office",
  "Storage",
  "West Hall",
  "Sting's Loft",
  "Courtyard",
  "Library",
  "Doorman Desk",
  "Boiler Room",
  "Art Studio",
  "Hidden Passage",
  "Mail Room",
  "Arcatacombs",
];

const roomDoodleType = {
  Lobby: "door",
  "Podcast Studio": "mic",
  "Penthouse A": "window",
  Rooftop: "antenna",
  "Penthouse B": "window",
  "East Hall": "map",
  "Freight Lift": "elevator",
  "Theater Room": "spotlight",
  Catacombs: "bone",
  Laundry: "hanger",
  Kitchen: "knife",
  "Wine Cellar": "bottle",
  "Security Office": "camera",
  Storage: "box",
  "West Hall": "map",
  "Sting's Loft": "note",
  Courtyard: "map",
  Library: "note",
  "Doorman Desk": "door",
  "Boiler Room": "box",
  "Art Studio": "spotlight",
  "Hidden Passage": "bone",
  "Mail Room": "box",
  Arcatacombs: "bone",
};

const apartments = [
  "Penthouse A",
  "Penthouse B",
  "Sting's Loft",
  "Theater Room",
  "Kitchen",
  "Wine Cellar",
  "Security Office",
  "Rooftop",
];

const boardGridSize = 7;
const ringLength = ringTiles.length;

function createRingCoords(size) {
  const coords = [];
  for (let col = 0; col < size; col += 1) coords.push([0, col]);
  for (let row = 1; row < size; row += 1) coords.push([row, size - 1]);
  for (let col = size - 2; col >= 0; col -= 1) coords.push([size - 1, col]);
  for (let row = size - 2; row >= 1; row -= 1) coords.push([row, 0]);
  return coords;
}

const ringCoords = createRingCoords(boardGridSize);
const clueDeckSize = 36;
const groupTextPos = 4;
const lobbyPos = Math.max(0, ringTiles.indexOf("Lobby"));
const residentEncounterChance = 0.36;

const difficultyConfig = {
  casual: { name: "Casual", minCluesForCall: 10, truthBias: 0.68, clueTokensAtStart: 7 },
  detective: { name: "Detective", minCluesForCall: 12, truthBias: 0.58, clueTokensAtStart: 6 },
  expert: { name: "Expert", minCluesForCall: 14, truthBias: 0.5, clueTokensAtStart: 5 },
};

const state = {
  turn: 1,
  dice: null,
  movedThisTurn: false,
  activePlayerIndex: 0,
  players: [],
  selectedCharacterIds: characterCards.map((card) => card.id),
  foundClues: 0,
  gameOver: false,
  difficulty: "detective",
  config: difficultyConfig.detective,
  solution: null,
  clueDeck: [],
  actionDeck: [],
  episodeDeck: [],
  discardPile: [],
  clueTokens: [],
  uniqueCluesFound: [],
  scores: { suspect: {}, object: {}, apartment: {}, motive: {} },
  guaranteedTruth: 0,
  guaranteedLie: 0,
  forceResidentEncounter: false,
  suppressResidentEncounters: 0,
  isRolling: false,
  isAnimatingMove: false,
  isStoryRevealActive: false,
  isEncounterModalActive: false,
  storyTypeTimer: null,
  storyTypeText: "",
  storyTypeIndex: 0,
  storyRevealQueue: [],
  shouldAdvanceAfterReveal: false,
  story: null,
};

const uniqueCluesRequired = 3;

const deckArt = {};
let audioCtx = null;

const els = {
  board: document.getElementById("board"),
  diceVisual: document.getElementById("diceVisual"),
  diceStatus: document.getElementById("diceStatus"),
  playersList: document.getElementById("playersList"),
  leadsList: document.getElementById("leadsList"),
  currentInvestigatorCard: document.getElementById("currentInvestigatorCard"),
  caseTitle: document.getElementById("caseTitle"),
  caseBrief: document.getElementById("caseBrief"),
  storyBeats: document.getElementById("storyBeats"),
  log: document.getElementById("log"),
  rollBtn: document.getElementById("rollBtn"),
  callBtn: document.getElementById("callBtn"),
  menuBtn: document.getElementById("menuBtn"),
  setupMenu: document.getElementById("setupMenu"),
  episodeDeckSlot: document.getElementById("episodeDeckSlot"),
  clueDeckSlot: document.getElementById("clueDeckSlot"),
  actionDeckSlot: document.getElementById("actionDeckSlot"),
  accusationModal: document.getElementById("accusationModal"),
  storyRevealModal: document.getElementById("storyRevealModal"),
  storyRevealTitle: document.getElementById("storyRevealTitle"),
  storyRevealText: document.getElementById("storyRevealText"),
  storyRevealBtn: document.getElementById("storyRevealBtn"),
  residentModal: document.getElementById("residentModal"),
  residentTitle: document.getElementById("residentTitle"),
  residentPortrait: document.getElementById("residentPortrait"),
  residentQuote: document.getElementById("residentQuote"),
  residentContinueBtn: document.getElementById("residentContinueBtn"),
  submitCallBtn: document.getElementById("submitCallBtn"),
  closeAccuseBtn: document.getElementById("closeAccuseBtn"),
  playerCountSelect: document.getElementById("playerCountSelect"),
  difficultySelect: document.getElementById("difficultySelect"),
  characterCards: document.getElementById("characterCards"),
  selectionHint: document.getElementById("selectionHint"),
  newGameBtn: document.getElementById("newGameBtn"),
  suspectCallSelect: document.getElementById("suspectCallSelect"),
  objectCallSelect: document.getElementById("objectCallSelect"),
  apartmentCallSelect: document.getElementById("apartmentCallSelect"),
  motiveCallSelect: document.getElementById("motiveCallSelect"),
};

const dieRotationMap = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(0deg) rotateY(-90deg)",
  3: "rotateX(-90deg) rotateY(0deg)",
  4: "rotateX(90deg) rotateY(0deg)",
  5: "rotateX(0deg) rotateY(90deg)",
  6: "rotateX(0deg) rotateY(180deg)",
};

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function ensureAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playMoveStepSound() {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(190, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  click.type = "square";
  click.frequency.setValueAtTime(720, now);
  click.frequency.exponentialRampToValueAtTime(300, now + 0.02);
  clickGain.gain.setValueAtTime(0.0001, now);
  clickGain.gain.exponentialRampToValueAtTime(0.035, now + 0.003);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.024);

  osc.connect(gain).connect(ctx.destination);
  click.connect(clickGain).connect(ctx.destination);
  osc.start(now);
  click.start(now);
  osc.stop(now + 0.09);
  click.stop(now + 0.03);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function svgDataUrl(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function makeDeckCardArt({ title, subtitle, paper, ink, panel }) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 260">
      <defs>
        <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${paper}"/>
          <stop offset="1" stop-color="${panel}"/>
        </linearGradient>
        <pattern id="grain" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="transparent"/>
          <circle cx="1" cy="2" r="0.35" fill="${ink}" opacity="0.14"/>
          <circle cx="4.8" cy="4.3" r="0.35" fill="${ink}" opacity="0.12"/>
        </pattern>
      </defs>
      <rect x="8" y="8" width="404" height="244" rx="20" fill="url(#paper)" stroke="${ink}" stroke-width="3"/>
      <rect x="16" y="16" width="388" height="228" rx="14" fill="url(#grain)" stroke="${ink}" stroke-width="1.6"/>
      <rect x="28" y="26" width="364" height="206" rx="10" fill="none" stroke="${ink}" stroke-width="2"/>

      <g stroke="${ink}" fill="none" opacity="0.9">
        <path d="M48 206h324M58 194h304M86 182h248" stroke-width="2"/>
        <rect x="130" y="88" width="160" height="94" stroke-width="2.2"/>
        <rect x="158" y="68" width="104" height="116" stroke-width="2"/>
        <path d="M142 88l68-40 68 40" stroke-width="2.6"/>
        <rect x="198" y="148" width="24" height="34" stroke-width="2"/>
        <rect x="144" y="100" width="10" height="12"/><rect x="166" y="100" width="10" height="12"/><rect x="188" y="100" width="10" height="12"/>
        <rect x="222" y="100" width="10" height="12"/><rect x="244" y="100" width="10" height="12"/><rect x="266" y="100" width="10" height="12"/>
        <rect x="144" y="120" width="10" height="12"/><rect x="166" y="120" width="10" height="12"/><rect x="188" y="120" width="10" height="12"/>
        <rect x="222" y="120" width="10" height="12"/><rect x="244" y="120" width="10" height="12"/><rect x="266" y="120" width="10" height="12"/>
      </g>

      <rect x="108" y="176" width="204" height="30" rx="4" fill="${ink}" opacity="0.95"/>
      <text x="210" y="56" text-anchor="middle" font-size="28" font-weight="700" fill="${ink}" font-family="Cinzel, serif">${title}</text>
      <text x="210" y="197" text-anchor="middle" font-size="20" font-weight="700" fill="${paper}" font-family="Cinzel, serif">ARCONIA</text>
      <text x="210" y="226" text-anchor="middle" font-size="17" font-weight="600" fill="${ink}" font-family="Cinzel, serif">${subtitle}</text>
    </svg>
  `;
  return svgDataUrl(svg);
}

function initDeckArt() {
  deckArt.episode = makeDeckCardArt({
    title: "CASE EVENT",
    subtitle: "Twist Deck",
    paper: "#dcc69a",
    ink: "#273242",
    panel: "#cab487",
  });
  deckArt.clue = makeDeckCardArt({
    title: "CLUE",
    subtitle: "Evidence Deck",
    paper: "#e0cca5",
    ink: "#2e3542",
    panel: "#cdb88f",
  });
  deckArt.action = makeDeckCardArt({
    title: "ACTION",
    subtitle: "Tactics Deck",
    paper: "#d6bd92",
    ink: "#3a2d2b",
    panel: "#bfa57a",
  });
  deckArt.discard = makeDeckCardArt({
    title: "DISCARD",
    subtitle: "Used Pile",
    paper: "#d3c3a2",
    ink: "#323843",
    panel: "#b7a687",
  });
}

function log(message) {
  const previousCurrent = els.log.querySelector(".current-note");
  if (previousCurrent) {
    previousCurrent.classList.remove("current-note");
  }

  const item = document.createElement("li");
  item.className = "current-note";
  item.textContent = message;
  els.log.prepend(item);
}

function clearStoryTypeTimer() {
  if (state.storyTypeTimer) {
    window.clearTimeout(state.storyTypeTimer);
    state.storyTypeTimer = null;
  }
}

function typeStoryText() {
  if (!state.isStoryRevealActive) return;

  if (state.storyTypeIndex >= state.storyTypeText.length) {
    clearStoryTypeTimer();
    els.storyRevealBtn.textContent = "Continue Investigation";
    return;
  }

  state.storyTypeIndex += 1;
  els.storyRevealText.textContent = state.storyTypeText.slice(0, state.storyTypeIndex);

  const nextDelay = 15 + Math.floor(Math.random() * 28);
  state.storyTypeTimer = window.setTimeout(typeStoryText, nextDelay);
}

function showStoryReveal(beat) {
  const revealText = beat.revealText || beat.text;
  state.isStoryRevealActive = true;
  state.storyTypeText = revealText;
  state.storyTypeIndex = 0;

  els.storyRevealTitle.textContent = beat.title || "Developing Story";
  els.storyRevealText.textContent = "";
  els.storyRevealBtn.textContent = "Skip";
  els.storyRevealModal.classList.remove("hidden");
  els.storyRevealModal.setAttribute("aria-hidden", "false");

  clearStoryTypeTimer();
  typeStoryText();
}

function runNextStoryReveal() {
  if (state.storyRevealQueue.length === 0) return;
  if (state.isEncounterModalActive) return;
  const nextBeat = state.storyRevealQueue.shift();
  showStoryReveal(nextBeat);
}

function getResidentPortraitSvg(residentId) {
  const themes = {
    lester: { paper: "#d7c7a8", ink: "#25313d", accent: "#6e5b3a", line1: "Door logs", line2: "Front desk witness" },
    howard: { paper: "#d8c8ab", ink: "#252d36", accent: "#73566b", line1: "Cat observation", line2: "Hallway timeline" },
    uma: { paper: "#d5c2a1", ink: "#2f3139", accent: "#7a4f46", line1: "Hard evidence", line2: "No nonsense read" },
    theo: { paper: "#d1bea0", ink: "#233442", accent: "#506a78", line1: "Silent witness", line2: "Motion pattern" },
    bunny: { paper: "#d6c19d", ink: "#2f3036", accent: "#7c5d3b", line1: "Board records", line2: "Building leverage" },
    cinda: { paper: "#d8c7aa", ink: "#253041", accent: "#664d6d", line1: "Media source", line2: "Narrative control" },
    poppy: { paper: "#d4bf9a", ink: "#2a3441", accent: "#607387", line1: "Draft notes", line2: "Loose thread" },
    jan: { paper: "#d3bfa0", ink: "#2a3040", accent: "#6b4b5a", line1: "Musical cue", line2: "Timing mismatch" },
  };
  const t = themes[residentId] || themes.lester;
  const hair = residentId === "howard" ? "#463f3d" : residentId === "jan" ? "#30272a" : "#2c2a2b";
  const accessory =
    residentId === "howard"
      ? `<path d="M85 62l8-10 8 10" fill="none" stroke="${t.ink}" stroke-width="2"/><circle cx="85" cy="67" r="2" fill="${t.ink}"/><circle cx="101" cy="67" r="2" fill="${t.ink}"/>`
      : residentId === "cinda"
        ? `<path d="M66 70h14M100 70h14M80 66h20" stroke="${t.ink}" stroke-width="2" stroke-linecap="round"/>`
        : residentId === "jan"
          ? `<path d="M118 44v18a7 7 0 1 1-4.5-6.5V44h4.5z" fill="none" stroke="${t.ink}" stroke-width="2"/>`
          : residentId === "theo"
            ? `<path d="M112 48l14 8-14 8" fill="none" stroke="${t.ink}" stroke-width="2"/>`
            : `<rect x="108" y="45" width="16" height="12" rx="2" fill="none" stroke="${t.ink}" stroke-width="2"/>`;

  return `
    <svg viewBox="0 0 210 160" class="resident-portrait-svg" aria-hidden="true">
      <rect width="210" height="160" fill="${t.paper}"/>
      <rect x="10" y="10" width="190" height="140" rx="10" fill="none" stroke="${t.ink}" stroke-width="1.8"/>
      <path d="M18 130h174M22 24h166" stroke="${t.ink}" stroke-width="1.1" opacity="0.35"/>
      <circle cx="84" cy="68" r="28" fill="#efc9b2" stroke="${t.ink}" stroke-width="1.4"/>
      <path d="M56 66c0-18 12-30 28-30s28 12 28 30c-10-7-18-10-28-10s-18 3-28 10z" fill="${hair}"/>
      <path d="M57 112c4-18 14-28 27-28s23 10 27 28" fill="${t.accent}" opacity="0.86"/>
      <circle cx="76" cy="70" r="2" fill="#16191c"/><circle cx="92" cy="70" r="2" fill="#16191c"/>
      <path d="M76 83c5 3 11 3 16 0" stroke="#8a5e4b" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${accessory}
      <text x="16" y="144" font-size="11" fill="${t.ink}" font-family="Work Sans, sans-serif">${t.line1}</text>
      <text x="194" y="144" font-size="11" text-anchor="end" fill="${t.ink}" font-family="Work Sans, sans-serif">${t.line2}</text>
    </svg>
  `;
}

function showResidentEncounterModal(encounter) {
  state.isEncounterModalActive = true;
  els.residentTitle.textContent = encounter.resident.name;
  els.residentPortrait.innerHTML = getResidentPortraitSvg(encounter.resident.id);
  els.residentQuote.textContent = encounter.quote;
  els.residentModal.classList.remove("hidden");
  els.residentModal.setAttribute("aria-hidden", "false");
}

function closeResidentEncounterModal() {
  if (!state.isEncounterModalActive) return;
  state.isEncounterModalActive = false;
  els.residentModal.classList.add("hidden");
  els.residentModal.setAttribute("aria-hidden", "true");

  if (state.storyRevealQueue.length > 0 && !state.isStoryRevealActive) {
    runNextStoryReveal();
    render();
    return;
  }

  if (state.shouldAdvanceAfterReveal && !state.gameOver && !state.isStoryRevealActive) {
    state.shouldAdvanceAfterReveal = false;
    advanceTurn();
  }
  render();
}

function closeStoryReveal() {
  if (!state.isStoryRevealActive) return;

  if (state.storyTypeIndex < state.storyTypeText.length) {
    clearStoryTypeTimer();
    state.storyTypeIndex = state.storyTypeText.length;
    els.storyRevealText.textContent = state.storyTypeText;
    els.storyRevealBtn.textContent = "Continue Investigation";
    return;
  }

  clearStoryTypeTimer();
  state.isStoryRevealActive = false;
  els.storyRevealModal.classList.add("hidden");
  els.storyRevealModal.setAttribute("aria-hidden", "true");

  if (state.storyRevealQueue.length > 0 && !state.isEncounterModalActive) {
    runNextStoryReveal();
    render();
    return;
  }

  if (state.shouldAdvanceAfterReveal && !state.gameOver && !state.isEncounterModalActive) {
    state.shouldAdvanceAfterReveal = false;
    advanceTurn();
  }
  render();
}

function setOptions(select, values) {
  select.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

const diePipMap = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

function initDie() {
  const faceMarkup = [1, 2, 3, 4, 5, 6]
    .map(
      (value) =>
        `<div class="die-face face-${value}" data-face="${value}">${renderDiePips(value)}</div>`
    )
    .join("");

  els.diceVisual.innerHTML = `<div id="dieCube" class="die-cube">${faceMarkup}</div>`;
  setDieFace(1);
}

function renderDiePips(value) {
  return Array.from({ length: 9 }, (_, index) => {
    const pos = index + 1;
    const on = diePipMap[value].includes(pos) ? "on" : "";
    return `<span class="pip ${on}" data-pos="${pos}"></span>`;
  }).join("");
}

function setDieFace(value) {
  const cube = document.getElementById("dieCube");
  if (!cube) return;
  cube.dataset.value = String(value);
  cube.style.transform = dieRotationMap[value];
}

function initScoreBoard() {
  state.scores = {
    suspect: Object.fromEntries(suspects.map((item) => [item, 0])),
    object: Object.fromEntries(objects.map((item) => [item, 0])),
    apartment: Object.fromEntries(apartments.map((item) => [item, 0])),
    motive: Object.fromEntries(motives.map((item) => [item, 0])),
  };
}

function getCurrentPlayer() {
  return state.players[state.activePlayerIndex];
}

function getRingPosFromGrid(row, col) {
  return ringCoords.findIndex(([r, c]) => r === row && c === col);
}

function getReachableTiles() {
  if (
    !state.dice ||
    state.gameOver ||
    state.movedThisTurn ||
    state.isAnimatingMove ||
    state.isStoryRevealActive ||
    state.isEncounterModalActive
  ) return [];

  const from = getCurrentPlayer().pos;
  const forcedTarget = (from + state.dice) % ringLength;
  return [forcedTarget];
}

function makeSolution() {
  return {
    suspect: randomItem(suspects),
    object: randomItem(objects),
    apartment: randomItem(apartments),
    motive: randomItem(motives),
  };
}

function makeStory(solution) {
  const victim = randomItem(victims);
  const openings = [
    `${victim} was found dead after the lights cut out near ${solution.apartment}.`,
    `A body was discovered beside ${solution.apartment} after an emergency alarm drill.`,
    `${victim} vanished during a party and reappeared in ${solution.apartment}.`,
  ];
  const stakes = [
    "Residents are deleting messages to hide their routines.",
    "The co-op board demands this case disappear before sunrise.",
    "A rival podcast is leaking fake timelines to mislead witnesses.",
  ];

  const objectThemes = {
    "Bassoon Reed": "a performance-related object with a precise sound signature",
    "Poisoned Dip": "a tampered food item prepared shortly before the incident",
    "Podcast Mic": "recording gear that captured more than intended",
    "Knit Needle": "a narrow pointed tool that leaves clean puncture traces",
    "Stage Light": "a heavy production fixture tied to a timed failure",
    "Key Fob": "an access device linked to restricted movement",
    Matchbook: "a small ignition-related item tied to smoke residue",
    "Broken Vase": "ceramic fragments from a staged disturbance",
  };
  const apartmentThemes = {
    "Penthouse A": "an upper-floor suite with private access",
    "Penthouse B": "a high-floor unit with irregular camera coverage",
    "Sting's Loft": "a private loft with selective visitor logs",
    "Theater Room": "a rehearsal-adjacent space with shared access",
    Kitchen: "a service-heavy area with constant traffic",
    "Wine Cellar": "a low-traffic storage zone with limited witnesses",
    "Security Office": "a controlled room where logs can be altered",
    Rooftop: "an exposed route used to bypass main corridors",
  };
  const motiveThemes = {
    Revenge: "personal retaliation escalating beyond warning signs",
    Blackmail: "sensitive leverage that became unsustainable",
    Jealousy: "a rivalry pattern that intensified before the incident",
    Inheritance: "financial succession pressure tied to timing",
    "Cover-up": "evidence suppression around an earlier secret",
    "Career Sabotage": "professional displacement with high stakes",
    Obsession: "fixation behavior and boundary collapse",
    Debt: "urgent financial pressure forcing extreme risk",
  };

  const beatTemplates = [
    "Chapter 1: Audio forensics narrow the weapon profile.",
    "Chapter 2: Movement reconstruction isolates a critical location window.",
    "Chapter 3: Financial and relationship pressure reveal motive structure.",
  ];
  const pendingBeatText = [
    `A damaged recording is being restored, and its missing seconds may reveal what weapon was used.`,
    `Camera pulls are still in progress, but someone was definitely near the crime route before the body was found.`,
    `A financial trail is forming, and it may explain why this murder happened in the first place.`,
  ];
  const twistTitles = [
    "Tape Restoration Complete",
    "Security Timeline Breakthrough",
    "Money Trail Twist",
  ];
  const revealTexts = [
    `The restored audio locks to ${objectThemes[solution.object]}. Twist: an earlier clue was planted to make investigators chase the wrong object class.`,
    `New camera sync isolates ${apartmentThemes[solution.apartment]}. Twist: a key section of corridor footage was deliberately delayed before upload.`,
    `Hidden transactions and messages align with ${motiveThemes[solution.motive]}. Twist: the timing suggests planning, not a spontaneous conflict.`,
  ];

  const revealAt = [
    Math.max(2, Math.floor(state.config.minCluesForCall * 0.25)),
    Math.max(4, Math.floor(state.config.minCluesForCall * 0.55)),
    Math.max(6, Math.floor(state.config.minCluesForCall * 0.8)),
  ];

  return {
    title: `Case: The ${solution.apartment} Silence`,
    brief: `${randomItem(openings)} ${randomItem(stakes)}`,
    beats: beatTemplates.map((text, index) => ({
      title: twistTitles[index],
      text,
      revealText: revealTexts[index],
      pendingText: pendingBeatText[index],
      unlockAtClues: revealAt[index],
      revealed: false,
    })),
  };
}

function getWrongValue(facet, solutionValue) {
  const pools = { suspect: suspects, object: objects, apartment: apartments, motive: motives };
  return randomItem(pools[facet].filter((value) => value !== solutionValue));
}

function createClueDeck() {
  const clueTypes = [
    { name: "Forensic", truthMod: 0.18, weight: 2, phrase: "Trace analysis links" },
    { name: "Interview", truthMod: 0.02, weight: 1, phrase: "A witness reports" },
    { name: "Rumor", truthMod: -0.2, weight: 1, phrase: "Building gossip claims" },
    { name: "Digital", truthMod: 0.1, weight: 2, phrase: "Phone metadata connects" },
  ];

  const facets = ["suspect", "object", "apartment", "motive"];
  const deck = [];

  for (let i = 0; i < clueDeckSize; i += 1) {
    const type = randomItem(clueTypes);
    const truthChance = clamp(state.config.truthBias + type.truthMod, 0.3, 0.92);
    const truthful = state.guaranteedTruth > 0 || Math.random() < truthChance;

    const firstFacet = randomItem(facets);
    const secondFacet = randomItem(facets.filter((facet) => facet !== firstFacet));

    const firstValue = truthful ? state.solution[firstFacet] : getWrongValue(firstFacet, state.solution[firstFacet]);
    const secondTruthful = truthful ? Math.random() > 0.2 : Math.random() > 0.55;
    const secondValue = secondTruthful
      ? state.solution[secondFacet]
      : getWrongValue(secondFacet, state.solution[secondFacet]);

    deck.push({
      type: type.name,
      weight: type.weight,
      claims: [
        { facet: firstFacet, value: firstValue, truthful },
        { facet: secondFacet, value: secondValue, truthful: secondTruthful },
      ],
      text: `${type.phrase} ${firstValue} with ${secondValue}.`,
    });
  }

  const signatureClues = [
    {
      id: "sig-object",
      uniqueTag: "object",
      type: "Signature",
      weight: 2,
      claims: [{ facet: "object", value: state.solution.object, truthful: true }],
      text: "Signature clue: the physical evidence profile narrows to one specific kind of object.",
    },
    {
      id: "sig-suspect",
      uniqueTag: "suspect",
      type: "Signature",
      weight: 2,
      claims: [{ facet: "suspect", value: state.solution.suspect, truthful: true }],
      text: "Signature clue: access records isolate a key resident pattern around the victim's timeline.",
    },
    {
      id: "sig-apartment",
      uniqueTag: "apartment",
      type: "Signature",
      weight: 2,
      claims: [{ facet: "apartment", value: state.solution.apartment, truthful: true }],
      text: "Signature clue: movement logs confirm a specific apartment zone in the final window.",
    },
    {
      id: "sig-motive",
      uniqueTag: "motive",
      type: "Signature",
      weight: 2,
      claims: [{ facet: "motive", value: state.solution.motive, truthful: true }],
      text: "Signature clue: pressure points reveal a consistent motive thread behind the case.",
    },
  ];

  deck.push(...signatureClues);

  return shuffle(deck);
}

function createActionDeck() {
  return shuffle([
    { name: "Fact Check", effect: "guaranteeTruth" },
    { name: "Fact Check", effect: "guaranteeTruth" },
    { name: "Forensic Rush", effect: "spawnClue" },
    { name: "Inside Tip", effect: "forceResidentEncounter" },
    { name: "Inside Tip", effect: "forceResidentEncounter" },
    { name: "Data Merge", effect: "shuffleClueDeck" },
    { name: "Case Thread", effect: "guaranteeTruthDouble" },
    { name: "Case Thread", effect: "spawnClue" },
  ]);
}

function createEpisodeDeck() {
  return shuffle([
    {
      name: "Neighborhood Panic",
      effect: "spawnClue",
      text: "A resident reports suspicious noise. A new lead surfaces somewhere in the building.",
    },
    {
      name: "Broken Timeline",
      effect: "shuffleClueDeck",
      text: "Witness timestamps are re-sorted. Shuffle the remaining clue deck.",
    },
    {
      name: "Recovered Audio",
      effect: "guaranteeTruth",
      text: "A cleaned recording confirms details. Your next clue card will be fully reliable.",
    },
    {
      name: "Building Lockdown",
      effect: "suppressResident",
      text: "Residents stay quiet under lockdown. The next landing does not trigger a resident encounter.",
    },
    {
      name: "Press Leak",
      effect: "guaranteeLie",
      text: "A false narrative spreads. Your next clue card is misleading.",
    },
    {
      name: "Witness Return",
      effect: "forceResidentEncounter",
      text: "A resident insists on talking. Your next landing guarantees a resident encounter.",
    },
    {
      name: "Phone Dump",
      effect: "guaranteeTruth",
      text: "Call records are recovered. Your next clue card will be fully reliable.",
    },
    {
      name: "Late Night Tip",
      effect: "spawnClue",
      text: "An anonymous caller drops a location. A new lead surfaces in the building.",
    },
    {
      name: "Security Sweep",
      effect: "spawnDoubleClue",
      text: "Maintenance checks every floor. Multiple leads surface across the building.",
    },
    {
      name: "Prop Inventory",
      effect: "guaranteeTruthDouble",
      text: "Inventory logs are verified. Your next 2 clues are fully reliable.",
    },
    {
      name: "Therapy Notes",
      effect: "guaranteeLie",
      text: "A planted diary page misleads the team. Your next clue card is misleading.",
    },
    {
      name: "Cross-Check",
      effect: "shuffleClueDeck",
      text: "Cross-checking files changes your order of evidence. Shuffle the remaining clue deck.",
    },
    {
      name: "Noise Surge",
      effect: "suppressResident",
      text: "Building chatter dies down. The next landing does not trigger a resident encounter.",
    },
    {
      name: "Pattern Lock",
      effect: "guaranteeTruthDouble",
      text: "Your timeline aligns. Your next 2 clue cards will be fully reliable.",
    },
    {
      name: "Closed-Circuit Review",
      effect: "forceResidentEncounter",
      text: "A resident appears on camera and asks to talk. Your next landing guarantees a resident encounter.",
    },
  ]);
}

function discardCard(type, card) {
  state.discardPile.push({ type, card });
}

function applyEvidence(clue, player) {
  clue.claims.forEach((claim) => {
    state.scores[claim.facet][claim.value] += clue.weight;
    if (claim.truthful) {
      const distractor = getWrongValue(claim.facet, claim.value);
      state.scores[claim.facet][distractor] -= 1;
    }
  });
}

function revealStoryBeatIfReady() {
  if (!state.story) return;

  const nextBeat = state.story.beats.find((beat) => !beat.revealed && state.foundClues >= beat.unlockAtClues);
  if (!nextBeat) return;

  nextBeat.revealed = true;
  state.storyRevealQueue.push(nextBeat);
  if (!state.isStoryRevealActive && !state.isEncounterModalActive) {
    runNextStoryReveal();
  }
}

function drawClue(player) {
  if (state.clueDeck.length === 0) {
    endGame(false, "No clues remain in the case file. The trail is dead.");
    return;
  }

  const clue = state.clueDeck.pop();
  discardCard("clue", clue);
  state.foundClues += 1;
  player.clues += 1;

  if (state.guaranteedTruth > 0) {
    clue.claims = clue.claims.map((claim) => ({ ...claim, truthful: true, value: state.solution[claim.facet] }));
    state.guaranteedTruth -= 1;
  } else if (state.guaranteedLie > 0) {
    clue.claims = clue.claims.map((claim) => ({
      ...claim,
      truthful: false,
      value: getWrongValue(claim.facet, state.solution[claim.facet]),
    }));
    state.guaranteedLie -= 1;
  }

  applyEvidence(clue, player);
  log(`Clue (${clue.type}): ${clue.text}`);
  if (clue.uniqueTag && !state.uniqueCluesFound.includes(clue.uniqueTag)) {
    state.uniqueCluesFound.push(clue.uniqueTag);
    log(`Unique clue found: ${clue.uniqueTag} signature logged.`);
  }
  revealStoryBeatIfReady();
}

function topCandidate(facet) {
  return Object.entries(state.scores[facet]).sort((a, b) => b[1] - a[1])[0];
}

function runActionCard(player) {
  if (state.actionDeck.length === 0) state.actionDeck = createActionDeck();
  const card = state.actionDeck.pop();
  discardCard("action", card);

  switch (card.effect) {
    case "guaranteeTruth":
      state.guaranteedTruth += 1;
      log(`${player.char.name} used ${card.name}: next clue guaranteed true.`);
      break;
    case "guaranteeTruthDouble":
      state.guaranteedTruth += 2;
      log(`${player.char.name} used ${card.name}: next 2 clues guaranteed true.`);
      break;
    case "spawnClue":
      spawnClueToken();
      log(`${player.char.name} used ${card.name}: a fresh lead surfaced in the building.`);
      break;
    case "forceResidentEncounter":
      state.forceResidentEncounter = true;
      log(`${player.char.name} used ${card.name}: next landing will trigger a resident encounter.`);
      break;
    case "shuffleClueDeck":
      state.clueDeck = shuffle(state.clueDeck);
      log(`${player.char.name} used ${card.name}: clue deck order was reshuffled.`);
      break;
    default:
      break;
  }
}

function buildResidentEncounter(tilePos) {
  const resident = randomItem(residents);
  const primaryFacet = randomItem(resident.facets);
  const remainingFacets = ["suspect", "object", "apartment", "motive"].filter((facet) => facet !== primaryFacet);
  const secondaryFacet = randomItem(remainingFacets);
  const includeSecondary = Math.random() < 0.45;

  const claims = [
    { facet: primaryFacet, value: state.solution[primaryFacet], truthful: true },
  ];
  if (includeSecondary) {
    claims.push({ facet: secondaryFacet, value: state.solution[secondaryFacet], truthful: true });
  }

  const primaryValue = state.solution[primaryFacet];
  const secondaryValue = state.solution[secondaryFacet];
  const room = ringTiles[tilePos];
  const quoteMap = {
    lester: `I saw something tied to "${primaryValue}" near ${room}. Check the service logs.`,
    howard: `My cat heard this all night: "${primaryValue}" matters in ${room}.`,
    uma: `Trust me, "${primaryValue}" is not random at ${room}. Someone is lying.`,
    theo: `I can confirm "${primaryValue}" in ${room}. Also watch ${secondaryValue}.`,
    bunny: `Co-op records around ${room} keep pointing to "${primaryValue}".`,
    cinda: `My source says "${primaryValue}" is the thread from ${room}.`,
    poppy: `I pulled notes from ${room}. "${primaryValue}" repeats everywhere.`,
    jan: `Listen closely: "${primaryValue}" harmonizes with what happened at ${room}.`,
  };
  const quote = quoteMap[resident.id] || `${resident.name} says "${primaryValue}" matters at ${room}.`;

  return {
    resident,
    quote,
    tilePos,
    clue: {
      type: "Witness",
      weight: 1,
      claims,
      text: `${resident.name} says ${primaryValue} matters in ${room}.`,
    },
  };
}

function maybeRunResidentEncounter(tilePos, player) {
  if (state.gameOver) return;
  if (state.suppressResidentEncounters > 0) {
    state.suppressResidentEncounters -= 1;
    return;
  }

  const shouldTrigger = state.forceResidentEncounter || Math.random() <= residentEncounterChance;
  state.forceResidentEncounter = false;
  if (!shouldTrigger) return;

  const encounter = buildResidentEncounter(tilePos);
  state.foundClues += 1;
  player.clues += 1;
  applyEvidence(encounter.clue, player);
  showResidentEncounterModal(encounter);
  log(`Resident encounter (${encounter.resident.name}): ${encounter.quote}`);
  if (player.char.id === "mabel") {
    log("Mabel note: encounter language pattern archived in case notes.");
  }
  if (player.char.id === "charles" && encounter.clue.type === "Witness") {
    log("Charles note: witness statement confidence marked medium.");
  }
  revealStoryBeatIfReady();
}

function maybeCollectTile(targetPos, player) {
  const clueIndex = state.clueTokens.indexOf(targetPos);
  let collectedTokenClue = false;
  if (clueIndex !== -1) {
    state.clueTokens.splice(clueIndex, 1);
    drawClue(player);
    collectedTokenClue = true;
  }

  if (targetPos === groupTextPos) {
    runActionCard(player);
    if (player.char.id === "oliver" && Math.random() < 0.3) {
      runActionCard(player);
      log("Oliver bonus: Group Text triggered a second card.");
    }
  }

  if (!collectedTokenClue) {
    maybeRunResidentEncounter(targetPos, player);
  }
}

function runEpisodeCard() {
  if (state.gameOver) return;
  if (state.episodeDeck.length === 0) state.episodeDeck = createEpisodeDeck();

  const card = state.episodeDeck.pop();
  discardCard("episode", card);
  log(`Case Event - ${card.name}: ${card.text}`);

  switch (card.effect) {
    case "spawnClue":
      spawnClueToken();
      break;
    case "spawnDoubleClue":
      spawnClueToken();
      spawnClueToken();
      break;
    case "shuffleClueDeck":
      state.clueDeck = shuffle(state.clueDeck);
      break;
    case "guaranteeTruth":
      state.guaranteedTruth += 1;
      break;
    case "guaranteeTruthDouble":
      state.guaranteedTruth += 2;
      break;
    case "guaranteeLie":
      state.guaranteedLie += 1;
      break;
    case "forceResidentEncounter":
      state.forceResidentEncounter = true;
      break;
    case "suppressResident":
      state.suppressResidentEncounters = Math.max(1, state.suppressResidentEncounters);
      break;
    default:
      break;
  }
}

function spawnClueToken() {
  if (state.gameOver) return;
  if (state.clueDeck.length === 0) return;

  const occupied = new Set(state.players.map((player) => player.pos));
  const openTiles = ringTiles
    .map((_, index) => index)
    .filter((index) => !occupied.has(index) && index !== groupTextPos && !state.clueTokens.includes(index));

  if (openTiles.length === 0) return;

  const newToken = randomItem(openTiles);
  state.clueTokens.push(newToken);
}

function advanceTurn() {
  state.dice = null;
  state.movedThisTurn = false;
  state.turn += 1;
  state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
  spawnClueToken();
  runEpisodeCard();
}

async function movePlayer(targetPos) {
  if (state.gameOver || !getReachableTiles().includes(targetPos)) return;

  const player = getCurrentPlayer();
  const startPos = player.pos;
  const steps = (targetPos - startPos + ringLength) % ringLength;
  if (steps <= 0) return;

  state.isAnimatingMove = true;
  for (let step = 1; step <= steps; step += 1) {
    player.pos = (startPos + step) % ringLength;
    playMoveStepSound();
    render();
    await sleep(320);
  }

  state.movedThisTurn = true;

  maybeCollectTile(player.pos, player);

  if (!state.gameOver) {
    if (state.isStoryRevealActive || state.isEncounterModalActive) {
      state.shouldAdvanceAfterReveal = true;
    } else {
      advanceTurn();
    }
  }

  state.isAnimatingMove = false;
  render();
}

function rollDie() {
  if (
    state.gameOver ||
    state.dice !== null ||
    state.isRolling ||
    state.isAnimatingMove ||
    state.isStoryRevealActive ||
    state.isEncounterModalActive
  ) return;

  state.isRolling = true;
  const cube = document.getElementById("dieCube");
  if (!cube) {
    state.isRolling = false;
    return;
  }
  cube.classList.add("rolling");
  els.diceStatus.textContent = "Rolling...";
  render();

  const result = Math.floor(Math.random() * 6) + 1;
  const spinX = 1080 + Math.floor(Math.random() * 360);
  const spinY = 900 + Math.floor(Math.random() * 360);
  cube.style.transform = `rotateX(${spinX}deg) rotateY(${spinY}deg)`;

  setTimeout(() => {
    cube.classList.remove("rolling");
    setDieFace(result);

    state.dice = result;
    state.movedThisTurn = false;
    state.isRolling = false;
    render();

    window.setTimeout(() => {
      if (state.gameOver || state.isStoryRevealActive || state.isEncounterModalActive) return;
      const currentPos = getCurrentPlayer().pos;
      const forcedTarget = (currentPos + result) % ringLength;
      movePlayer(forcedTarget);
    }, 220);
  }, 1100);
}

function makeFinalCall() {
  if (state.gameOver) return;

  if (state.foundClues < state.config.minCluesForCall) {
    log(`Need at least ${state.config.minCluesForCall} clues before final accusation.`);
    return;
  }
  if (state.uniqueCluesFound.length < uniqueCluesRequired) {
    log(`Need at least ${uniqueCluesRequired} unique signature clues before final accusation.`);
    return;
  }
  if (!state.story || state.story.beats.some((beat) => !beat.revealed)) {
    log("Complete all story chapters before final accusation.");
    return;
  }

  const guess = {
    suspect: els.suspectCallSelect.value,
    object: els.objectCallSelect.value,
    apartment: els.apartmentCallSelect.value,
    motive: els.motiveCallSelect.value,
  };

  const correct =
    guess.suspect === state.solution.suspect &&
    guess.object === state.solution.object &&
    guess.apartment === state.solution.apartment &&
    guess.motive === state.solution.motive;

  if (correct) {
    endGame(true, "Perfect final accusation. Case closed.");
  } else {
    const matched = Object.keys(guess).filter((key) => guess[key] === state.solution[key]).length;
    endGame(false, `Wrong accusation (${matched}/4 correct). The killer escaped.`);
  }
}

function openAccusationModal() {
  if (els.callBtn.disabled || state.isStoryRevealActive || state.isEncounterModalActive) return;
  els.accusationModal.classList.remove("hidden");
  els.accusationModal.setAttribute("aria-hidden", "false");
}

function closeAccusationModal() {
  els.accusationModal.classList.add("hidden");
  els.accusationModal.setAttribute("aria-hidden", "true");
}

function endGame(win, message) {
  state.gameOver = true;
  log(message);
  log(
    `Final truth: ${state.solution.suspect}, ${state.solution.object}, ${state.solution.apartment}, motive ${state.solution.motive}.`
  );

  els.rollBtn.disabled = true;
  els.callBtn.disabled = true;
  document.body.style.filter = win ? "saturate(1.12)" : "grayscale(0.3)";
  render();
}

function getPortraitSvg(card) {
  const themes = {
    mabel: { bg: "#d6c197", ink: "#232a35", accent: "#6b2f43" },
    oliver: { bg: "#d2bc90", ink: "#252a33", accent: "#7a2f2f" },
    charles: { bg: "#d7c499", ink: "#273141", accent: "#7f3338" },
    williams: { bg: "#cfba8d", ink: "#223036", accent: "#2d6152" },
  };
  const theme = themes[card.id] || themes.williams;

  const person =
    card.id === "mabel"
      ? `
        <path d="M53 43c0-14 9-22 22-22s22 8 22 22c-8-6-14-8-22-8s-14 2-22 8z" fill="#191b20"/>
        <circle cx="75" cy="48" r="16" fill="#efc6b2"/>
        <path d="M60 74c3-12 9-17 15-17s12 5 15 17" fill="${theme.accent}" opacity="0.9"/>
        <circle cx="69" cy="48" r="1.6" fill="#17181a"/><circle cx="81" cy="48" r="1.6" fill="#17181a"/>
        <path d="M70 57c3 2 7 2 10 0" stroke="#8f4356" stroke-width="1.9" fill="none" stroke-linecap="round"/>
        <path d="M106 28l13 13M98 34l14 13M104 58l17-17" stroke="${theme.ink}" stroke-width="1.8" stroke-linecap="round"/>
      `
      : card.id === "oliver"
        ? `
          <circle cx="75" cy="48" r="16" fill="#efc7a6"/>
          <path d="M53 42c2-10 9-18 22-18s20 8 22 18c-8-4-14-6-22-6s-14 2-22 6z" fill="#1f2228"/>
          <rect x="60" y="25" width="30" height="6" rx="2.5" fill="#2c2020"/>
          <path d="M65 21h20l7 4H58z" fill="#1d1f24"/>
          <circle cx="69" cy="48" r="4.7" fill="none" stroke="#1f252c" stroke-width="1.6"/>
          <circle cx="81" cy="48" r="4.7" fill="none" stroke="#1f252c" stroke-width="1.6"/>
          <path d="M73 48h4" stroke="#1f252c" stroke-width="1.4"/>
          <path d="M66 57c4 2 14 2 18 0" stroke="#8a5f42" stroke-width="1.8" fill="none"/>
          <path d="M61 60h28l-3 11H64z" fill="${theme.accent}" opacity="0.88"/>
        `
        : card.id === "charles"
          ? `
            <circle cx="75" cy="48" r="16" fill="#ecc3a3"/>
            <path d="M53 42c2-10 9-18 22-18s20 8 22 18c-8-4-14-6-22-6s-14 2-22 6z" fill="#2a2f36"/>
            <circle cx="69" cy="48" r="1.6" fill="#17181a"/><circle cx="81" cy="48" r="1.6" fill="#17181a"/>
            <path d="M67 57c4 1.7 12 1.7 16 0" stroke="#7f5640" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            <rect x="58" y="64" width="34" height="15" rx="6" fill="#766c60"/>
            <path d="M106 54l16-5 2 16-17 4z" fill="#efe5ce" stroke="${theme.ink}" stroke-width="1.2"/>
          `
          : `
            <circle cx="75" cy="48" r="16" fill="#ecc2a1"/>
            <path d="M53 42c2-10 9-18 22-18s20 8 22 18c-8-4-14-6-22-6s-14 2-22 6z" fill="#1f2328"/>
            <circle cx="69" cy="48" r="1.6" fill="#17181a"/><circle cx="81" cy="48" r="1.6" fill="#17181a"/>
            <path d="M67 57c4 1.7 12 1.7 16 0" stroke="#7f5640" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            <rect x="58" y="64" width="34" height="15" rx="6" fill="${theme.accent}" opacity="0.82"/>
          `;

  return `
    <svg viewBox="0 0 180 96" class="portrait-svg" aria-hidden="true">
      <rect width="180" height="96" fill="${theme.bg}"/>
      <rect x="6" y="6" width="168" height="84" rx="9" fill="none" stroke="${theme.ink}" stroke-width="1.4"/>
      <path d="M18 78h144M22 16h136" stroke="${theme.ink}" stroke-width="1.2" opacity="0.35"/>
      <path d="M27 24l18-10h60l18 10" fill="none" stroke="${theme.ink}" stroke-width="1.1" opacity="0.5"/>
      ${person}
    </svg>
  `;
}

function getRoomDoodleSvg(type) {
  const top = `<svg viewBox="0 0 24 24" class="doodle-svg" aria-hidden="true">`;
  const bottom = `</svg>`;

  switch (type) {
    case "door":
      return `${top}<rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/>${bottom}`;
    case "mic":
      return `${top}<rect x="9" y="4" width="6" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>${bottom}`;
    case "window":
      return `${top}<rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="1.8"/>${bottom}`;
    case "antenna":
      return `${top}<path d="M12 20V8M7 8l5-5 5 5M4 14h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>${bottom}`;
    case "map":
      return `${top}<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 4v14M15 6v14" stroke="currentColor" stroke-width="1.6"/>${bottom}`;
    case "elevator":
      return `${top}<rect x="5" y="4" width="14" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7l-2 2h4l-2-2zm0 10l2-2h-4l2 2z" fill="currentColor"/>${bottom}`;
    case "spotlight":
      return `${top}<path d="M6 8h8l4 4v4H6z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 8h2m-2 4h2m-2 4h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>${bottom}`;
    case "bone":
      return `${top}<path d="M6 9a2 2 0 1 1 2-2l8 8a2 2 0 1 1-2 2l-8-8A2 2 0 1 1 6 9zm12 6a2 2 0 1 1-2 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>${bottom}`;
    case "hanger":
      return `${top}<path d="M12 5a2 2 0 1 1 2 2v2l6 5H4l6-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>${bottom}`;
    case "knife":
      return `${top}<path d="M4 18l7-7 2 2-7 7H4zM13 6l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>${bottom}`;
    case "bottle":
      return `${top}<path d="M10 4h4v3l1 2v9H9V9l1-2V4z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 11h4" stroke="currentColor" stroke-width="1.8"/>${bottom}`;
    case "camera":
      return `${top}<rect x="4" y="7" width="16" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 7l2-2h6l2 2" fill="none" stroke="currentColor" stroke-width="1.8"/>${bottom}`;
    case "box":
      return `${top}<path d="M4 8l8-4 8 4-8 4-8-4zm0 4l8 4 8-4M12 12v8" fill="none" stroke="currentColor" stroke-width="1.6"/>${bottom}`;
    case "note":
      return `${top}<path d="M14 5v9a3 3 0 1 1-2-2.8V5h2zm4 0v7a3 3 0 1 1-2-2.8V5h2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>${bottom}`;
    default:
      return `${top}<circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/>${bottom}`;
  }
}

function getTokenSvg(cardId) {
  const palettes = {
    mabel: { paper: "#d6c197", line: "#1f2530", accent: "#6e2f44" },
    oliver: { paper: "#d1bc8f", line: "#232933", accent: "#7b3031" },
    charles: { paper: "#d7c59b", line: "#24303f", accent: "#733037" },
    williams: { paper: "#cfba8d", line: "#1f2e35", accent: "#2c6152" },
  };
  const p = palettes[cardId] || palettes.williams;

  const head =
    cardId === "mabel"
      ? `
        <path d="M19 31c0-10 6-16 13-16s13 6 13 16c-5-3-8-5-13-5s-8 2-13 5z" fill="#171a1f"/>
        <circle cx="32" cy="34" r="9.5" fill="#efc7b2"/>
        <path d="M23 49c2-7 5-10 9-10s7 3 9 10" fill="${p.accent}" opacity="0.9"/>
        <circle cx="29" cy="34" r="1.2" fill="#121417"/><circle cx="35" cy="34" r="1.2" fill="#121417"/>
        <path d="M29 39c2 1.2 4 1.2 6 0" stroke="#8d4255" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      `
      : cardId === "oliver"
        ? `
          <circle cx="32" cy="34" r="9.5" fill="#efc6a6"/>
          <path d="M19 30c1.8-8 6.5-13 13-13s11.2 5 13 13c-5-2.8-8-4-13-4s-8 1.2-13 4z" fill="#1f2228"/>
          <rect x="23" y="20" width="18" height="3.5" rx="1.2" fill="#231b1e"/>
          <path d="M26 17h12l4 3H22z" fill="#171a1f"/>
          <circle cx="29.2" cy="34" r="2.6" fill="none" stroke="#202833" stroke-width="1.1"/>
          <circle cx="34.8" cy="34" r="2.6" fill="none" stroke="#202833" stroke-width="1.1"/>
          <path d="M31.8 34h0.4" stroke="#202833" stroke-width="1.1"/>
          <path d="M28 39c1.7 1.3 6.3 1.3 8 0" stroke="#8a5f42" stroke-width="1.3" fill="none"/>
          <path d="M24 42h16l-2 6H26z" fill="${p.accent}" opacity="0.88"/>
        `
        : cardId === "charles"
          ? `
            <circle cx="32" cy="34" r="9.5" fill="#ecc3a3"/>
            <path d="M19 30c1.8-8 6.5-13 13-13s11.2 5 13 13c-5-2.8-8-4-13-4s-8 1.2-13 4z" fill="#2b3038"/>
            <circle cx="29" cy="34" r="1.2" fill="#121417"/><circle cx="35" cy="34" r="1.2" fill="#121417"/>
            <path d="M28.5 39c2 1.1 5 1.1 7 0" stroke="#7f5640" stroke-width="1.3" fill="none" stroke-linecap="round"/>
            <rect x="23" y="42" width="18" height="7.8" rx="3.1" fill="#71675e"/>
          `
          : `
            <circle cx="32" cy="34" r="9.5" fill="#ecc2a1"/>
            <path d="M19 30c1.8-8 6.5-13 13-13s11.2 5 13 13c-5-2.8-8-4-13-4s-8 1.2-13 4z" fill="#1f2328"/>
            <circle cx="29" cy="34" r="1.2" fill="#121417"/><circle cx="35" cy="34" r="1.2" fill="#121417"/>
            <path d="M28.5 39c2 1.1 5 1.1 7 0" stroke="#7f5640" stroke-width="1.3" fill="none" stroke-linecap="round"/>
            <rect x="23" y="42" width="18" height="7.8" rx="3.1" fill="${p.accent}" opacity="0.82"/>
          `;

  return `
    <svg viewBox="0 0 64 64" class="token-svg" aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#c8ad68"/>
      <circle cx="32" cy="32" r="27.8" fill="${p.paper}" stroke="${p.line}" stroke-width="1.4"/>
      <circle cx="32" cy="32" r="24.6" fill="none" stroke="${p.line}" stroke-width="1.1" opacity="0.55"/>
      <path d="M13 50h38M15 14h34" stroke="${p.line}" stroke-width="0.85" opacity="0.35"/>
      ${head}
      <circle cx="32" cy="32" r="30.2" fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="1.2"/>
    </svg>
  `;
}

function renderCharacterCards() {
  els.characterCards.innerHTML = "";
  characterCards.forEach((card) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "character-card";
    button.dataset.id = card.id;
    if (state.selectedCharacterIds.includes(card.id)) button.classList.add("active");

    const header = document.createElement("div");
    header.className = "character-card__header";

    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.style.background = card.color;
    avatar.textContent = card.initials;

    const titleWrap = document.createElement("div");
    titleWrap.className = "character-card__titles";

    const name = document.createElement("strong");
    name.textContent = card.name;

    const role = document.createElement("small");
    role.textContent = card.role;

    titleWrap.appendChild(name);
    titleWrap.appendChild(role);
    header.appendChild(avatar);
    header.appendChild(titleWrap);

    const portrait = document.createElement("div");
    portrait.className = "character-card__portrait";
    portrait.innerHTML = `${getPortraitSvg(card)}<span class="portrait-label">${card.signature}</span>`;

    const stats = document.createElement("div");
    stats.className = "character-card__stats";
    stats.innerHTML = `<span>L ${card.stats.logic}</span><span>C ${card.stats.charm}</span><span>N ${card.stats.nerve}</span>`;

    const ability = document.createElement("p");
    ability.className = "character-card__ability";
    ability.textContent = card.ability;

    const footer = document.createElement("div");
    footer.className = "character-card__footer";
    footer.textContent = `Signature: ${card.signature}`;

    button.appendChild(header);
    button.appendChild(portrait);
    button.appendChild(stats);
    button.appendChild(ability);
    button.appendChild(footer);

    button.addEventListener("click", () => {
      if (state.selectedCharacterIds.includes(card.id)) {
        state.selectedCharacterIds = state.selectedCharacterIds.filter((id) => id !== card.id);
      } else {
        state.selectedCharacterIds.push(card.id);
      }

      if (state.selectedCharacterIds.length === 0) {
        state.selectedCharacterIds = [card.id];
      }

      renderCharacterCards();
      updateSelectionHint();
    });

    els.characterCards.appendChild(button);
  });
}

function updateSelectionHint() {
  const requested = Number(els.playerCountSelect.value);
  const selected = state.selectedCharacterIds.length;
  els.selectionHint.textContent = `Choose ${requested} investigators. Currently selected: ${selected}.`;
}

function getChosenCharacters(playerCount) {
  const selectedCards = characterCards.filter((card) => state.selectedCharacterIds.includes(card.id));

  let chosen = selectedCards.slice(0, playerCount);
  if (chosen.length < playerCount) {
    const fill = characterCards.filter((card) => !chosen.some((entry) => entry.id === card.id));
    chosen = chosen.concat(fill.slice(0, playerCount - chosen.length));
    log("Not enough cards selected, remaining seats were auto-filled.");
  }

  if (selectedCards.length > playerCount) {
    log("More cards selected than players, extra cards were ignored.");
  }

  return chosen;
}

function renderPlayers() {
  els.playersList.innerHTML = "";

  state.players.forEach((player, index) => {
    const item = document.createElement("li");
    if (index === state.activePlayerIndex) item.classList.add("active");

    const left = document.createElement("span");
    left.className = "player-label";
    left.innerHTML = `<span class="token-mini">${getTokenSvg(player.char.id)}</span>${player.char.name}`;

    const right = document.createElement("span");
    right.textContent = `${player.clues} clue${player.clues === 1 ? "" : "s"} | ${ringTiles[player.pos]}`;

    item.appendChild(left);
    item.appendChild(right);
    els.playersList.appendChild(item);
  });
}

function renderCurrentInvestigator() {
  const current = getCurrentPlayer();
  els.currentInvestigatorCard.innerHTML = `
    <div class="current-investigator__token">${getTokenSvg(current.char.id)}</div>
    <div>
      <p class="current-investigator__name">${current.char.name}</p>
      <p class="current-investigator__meta">${current.clues} clue${current.clues === 1 ? "" : "s"} | ${current.char.role}<br>${current.char.ability}</p>
    </div>
  `;
}

function renderBoard() {
  const reachable = getReachableTiles();
  els.board.innerHTML = "";

  for (let row = 0; row < boardGridSize; row += 1) {
    for (let col = 0; col < boardGridSize; col += 1) {
      const ringPos = getRingPosFromGrid(row, col);

      if (ringPos === -1) {
        const innerSpace = document.createElement("div");
        innerSpace.className = "inner-space";
        els.board.appendChild(innerSpace);
        continue;
      }

      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";

      const isCorner = (row === 0 || row === boardGridSize - 1) && (col === 0 || col === boardGridSize - 1);
      if (isCorner) {
        tile.classList.add("corner");
      } else if (row === 0) {
        tile.classList.add("side-north");
      } else if (row === boardGridSize - 1) {
        tile.classList.add("side-south");
      } else if (col === 0) {
        tile.classList.add("side-west");
      } else if (col === boardGridSize - 1) {
        tile.classList.add("side-east");
      }
      if (row === 0) tile.classList.add("edge-top");
      if (row === boardGridSize - 1) tile.classList.add("edge-bottom");
      if (col === 0) tile.classList.add("edge-left");
      if (col === boardGridSize - 1) tile.classList.add("edge-right");

      const canMove = reachable.includes(ringPos);
      if (canMove) {
        tile.classList.add("reachable");
      }

      const title = document.createElement("strong");
      title.textContent = ringTiles[ringPos];

      const doodle = document.createElement("span");
      doodle.className = "room-doodle";
      doodle.innerHTML = getRoomDoodleSvg(roomDoodleType[ringTiles[ringPos]]);

      const tags = document.createElement("div");
      tags.className = "markers";
      if (ringPos === groupTextPos) {
        const groupTag = document.createElement("span");
        groupTag.className = "tag group";
        groupTag.textContent = "Group Text";
        tags.appendChild(groupTag);
      }

      const markers = document.createElement("div");
      markers.className = "markers";
      state.players.forEach((player) => {
        if (player.pos === ringPos) {
          const token = document.createElement("span");
          token.className = "token-board";
          token.title = player.char.name;
          token.innerHTML = getTokenSvg(player.char.id);
          markers.appendChild(token);
        }
      });
      if (ringPos === groupTextPos) {
        const groupDot = document.createElement("span");
        groupDot.className = "dot group";
        markers.appendChild(groupDot);
      }
      tile.appendChild(doodle);
      tile.appendChild(title);
      tile.appendChild(tags);
      tile.appendChild(markers);
      els.board.appendChild(tile);
    }
  }
}

function renderLeads() {
  els.leadsList.innerHTML = "";
  [
    ["suspect", "Suspects"],
    ["object", "Objects"],
    ["apartment", "Apartments"],
    ["motive", "Motives"],
  ].forEach(([facet, label]) => {
    const sorted = Object.entries(state.scores[facet]).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const maxScore = Math.max(1, ...sorted.map(([, score]) => Math.max(0, score)));

    const item = document.createElement("li");
    item.className = "evidence-card";

    const title = document.createElement("div");
    title.className = "evidence-card__title";
    title.textContent = label;

    const rows = document.createElement("div");
    rows.className = "evidence-card__rows";

    sorted.forEach(([name, score]) => {
      const row = document.createElement("div");
      row.className = "evidence-row";

      const head = document.createElement("div");
      head.className = "evidence-row__head";
      head.innerHTML = `<span>${name}</span><strong>${score}</strong>`;

      const track = document.createElement("div");
      track.className = "evidence-row__track";

      const fill = document.createElement("div");
      fill.className = "evidence-row__fill";
      const width = Math.max(0, Math.round((Math.max(0, score) / maxScore) * 100));
      fill.style.width = `${width}%`;

      track.appendChild(fill);
      row.appendChild(head);
      row.appendChild(track);
      rows.appendChild(row);
    });

    item.appendChild(title);
    item.appendChild(rows);
    els.leadsList.appendChild(item);
  });
}

function renderDeckSlots() {
  const renderDeckSlot = (slot, label, count, artKey) => {
    slot.innerHTML = `
      <div class="deck-slot__face" style="background-image: url('${deckArt[artKey]}')"></div>
      <div class="deck-slot__meta">
        <span class="deck-slot__name">${label}</span>
        <span class="deck-slot__count">${count}</span>
      </div>
    `;
  };

  renderDeckSlot(els.episodeDeckSlot, "Case Event", state.episodeDeck.length, "episode");
  renderDeckSlot(els.clueDeckSlot, "Clue", state.clueDeck.length, "clue");
  renderDeckSlot(els.actionDeckSlot, "Action", state.actionDeck.length, "action");
}

function renderStory() {
  if (!state.story) return;

  els.caseTitle.textContent = state.story.title;
  els.caseBrief.textContent = state.story.brief;
  els.storyBeats.innerHTML = "";

  let shownPending = false;
  state.story.beats.forEach((beat) => {
    if (!beat.revealed && shownPending) return;

    const item = document.createElement("li");
    if (beat.revealed) {
      item.textContent = beat.text;
    } else {
      item.textContent = beat.pendingText;
      shownPending = true;
    }
    els.storyBeats.appendChild(item);
  });
}

function updateStats() {
  if (state.isStoryRevealActive) {
    els.diceStatus.textContent = "Story reveal...";
  } else if (state.isEncounterModalActive) {
    els.diceStatus.textContent = "Resident encounter...";
  } else if (state.isRolling) {
    els.diceStatus.textContent = "Rolling...";
  } else if (state.dice === null) {
    els.diceStatus.textContent = "Ready";
  } else {
    els.diceStatus.textContent = "Move token";
  }
}

function syncButtons() {
  els.rollBtn.disabled =
    state.gameOver ||
    state.dice !== null ||
    state.isRolling ||
    state.isAnimatingMove ||
    state.isStoryRevealActive ||
    state.isEncounterModalActive;
  const allStoryRevealed = !!state.story && state.story.beats.every((beat) => beat.revealed);
  const enoughUniqueClues = state.uniqueCluesFound.length >= uniqueCluesRequired;
  els.callBtn.disabled =
    state.gameOver ||
    state.foundClues < state.config.minCluesForCall ||
    !allStoryRevealed ||
    !enoughUniqueClues ||
    state.isStoryRevealActive ||
    state.isEncounterModalActive;
}

function render() {
  updateStats();
  syncButtons();
  renderCurrentInvestigator();
  renderPlayers();
  renderBoard();
  renderLeads();
  renderDeckSlots();
  renderStory();
}

function resetGame(playerCount) {
  state.turn = 1;
  state.dice = null;
  state.movedThisTurn = false;
  state.activePlayerIndex = 0;
  state.foundClues = 0;
  state.uniqueCluesFound = [];
  state.gameOver = false;
  state.guaranteedTruth = 0;
  state.guaranteedLie = 0;
  state.forceResidentEncounter = false;
  state.suppressResidentEncounters = 0;
  state.isRolling = false;
  state.isAnimatingMove = false;
  state.isStoryRevealActive = false;
  state.isEncounterModalActive = false;
  state.storyRevealQueue = [];
  state.storyTypeText = "";
  state.storyTypeIndex = 0;
  state.shouldAdvanceAfterReveal = false;

  state.difficulty = els.difficultySelect.value;
  state.config = difficultyConfig[state.difficulty];

  initScoreBoard();
  state.solution = makeSolution();
  state.story = makeStory(state.solution);
  state.clueDeck = createClueDeck();
  state.actionDeck = createActionDeck();
  state.episodeDeck = createEpisodeDeck();
  state.discardPile = [];

  const chosen = getChosenCharacters(playerCount);
  state.players = chosen.map((char) => ({ char, pos: lobbyPos, clues: 0 }));

  const blocked = new Set([lobbyPos, groupTextPos]);
  const spawnable = shuffle(ringTiles.map((_, i) => i).filter((pos) => !blocked.has(pos)));
  state.clueTokens = spawnable.slice(0, state.config.clueTokensAtStart);

  els.log.innerHTML = "";
  document.body.style.filter = "none";
  els.diceVisual.classList.remove("rolling");
  clearStoryTypeTimer();
  els.storyRevealModal.classList.add("hidden");
  els.storyRevealModal.setAttribute("aria-hidden", "true");
  els.storyRevealText.textContent = "";
  els.residentModal.classList.add("hidden");
  els.residentModal.setAttribute("aria-hidden", "true");
  els.residentPortrait.innerHTML = "";
  els.residentQuote.textContent = "";
  setDieFace(1);

  log(`Case opens: ${state.story.brief}`);
  render();
}

function initSetupMenu() {
  els.menuBtn.addEventListener("click", () => {
    els.setupMenu.classList.toggle("open");
  });

  document.addEventListener("click", (event) => {
    const clickedInside = els.setupMenu.contains(event.target) || els.menuBtn.contains(event.target);
    if (!clickedInside) {
      els.setupMenu.classList.remove("open");
    }
  });
}

function init() {
  setOptions(els.suspectCallSelect, suspects);
  setOptions(els.objectCallSelect, objects);
  setOptions(els.apartmentCallSelect, apartments);
  setOptions(els.motiveCallSelect, motives);
  initDie();
  initDeckArt();

  renderCharacterCards();
  updateSelectionHint();
  initSetupMenu();

  els.playerCountSelect.addEventListener("change", updateSelectionHint);
  els.rollBtn.addEventListener("click", rollDie);
  els.callBtn.addEventListener("click", openAccusationModal);
  els.submitCallBtn.addEventListener("click", () => {
    makeFinalCall();
    closeAccusationModal();
  });
  els.closeAccuseBtn.addEventListener("click", closeAccusationModal);
  els.accusationModal.addEventListener("click", (event) => {
    if (event.target === els.accusationModal) {
      closeAccusationModal();
    }
  });
  els.storyRevealBtn.addEventListener("click", closeStoryReveal);
  els.storyRevealModal.addEventListener("click", (event) => {
    if (event.target === els.storyRevealModal) {
      closeStoryReveal();
    }
  });
  els.residentContinueBtn.addEventListener("click", closeResidentEncounterModal);
  els.residentModal.addEventListener("click", (event) => {
    if (event.target === els.residentModal) {
      closeResidentEncounterModal();
    }
  });
  els.newGameBtn.addEventListener("click", () => {
    resetGame(Number(els.playerCountSelect.value));
    els.setupMenu.classList.remove("open");
  });

  resetGame(3);
}

init();
