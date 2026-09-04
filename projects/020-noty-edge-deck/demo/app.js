const STORAGE_KEY = "edge-deck-notes-v3";
const THEME_KEY = "edge-deck-theme-v1";

const palette = ["#f1d97e", "#e99b81", "#91b3dc", "#9fc5a9", "#c6a8d5"];
const defaultNotes = [
  {
    id: "release-check",
    title: "发布检查",
    color: palette[0],
    body: "☐ 核对 390px 触屏路径\n☑ 保留背景工作场景\n☐ 检查键盘焦点与 Esc\n\n完成以后，把结论写回研究笔记。"
  },
  {
    id: "meeting-followup",
    title: "会议跟进",
    color: palette[1],
    body: "产品评审后的三个行动项：\n\n☑ 明确边缘入口的触发方式\n☐ 评估上下文便签\n☐ 约一次五人可用性测试"
  },
  {
    id: "prompt-draft",
    title: "AI 待处理",
    color: palette[2],
    body: "把零散输入变成上下文卡片：\n\n1. 捕获当前想法\n2. 自动识别任务和日期\n3. 在合适的应用旁重新出现"
  },
  {
    id: "design-rule",
    title: "设计原则",
    color: palette[3],
    body: "出现得及时，离开得干净。\n\n界面可以常驻，但注意力不应该被常驻占用。"
  }
];

const shell = document.querySelector(".app-shell");
if (new URLSearchParams(window.location.search).get("motion") === "reduce") {
  shell.dataset.motion = "reduce";
  document.documentElement.dataset.motion = "reduce";
}
const deck = document.querySelector("#edge-deck");
const pill = document.querySelector("#deck-pill");
const tabs = document.querySelector("#note-tabs");
const noteCount = document.querySelector("#note-count");
const panel = document.querySelector("#note-panel");
const noteNumber = document.querySelector("#note-number");
const titleInput = document.querySelector("#note-title");
const bodyInput = document.querySelector("#note-body");
const characterCount = document.querySelector("#character-count");
const saveStatus = document.querySelector("#save-status");
const closeNote = document.querySelector("#close-note");
const pinNote = document.querySelector("#pin-note");
const addNote = document.querySelector("#add-note");
const themeToggle = document.querySelector("#theme-toggle");
const themeLabel = document.querySelector(".theme-label");
const guideToggle = document.querySelector("#guide-toggle");
const guideCard = document.querySelector("#guide-card");
const mobileScrim = document.querySelector("#mobile-scrim");
const experienceDeck = document.querySelector("#experience-deck");
const mobileLayout = window.matchMedia("(max-width: 760px)");
const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)");

let notes = loadNotes();
let activeId = null;
let collapseTimer = null;
let saveTimer = null;
let pinnedOpen = false;
let lastTrigger = pill;
let lastTriggerNoteId = null;
let suppressOpenUntil = 0;

function loadNotes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return structuredClone(defaultNotes);
}

function storeNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function taskProgress(body) {
  const lines = body.split("\n");
  const total = lines.filter((line) => /^[☐☑]/.test(line.trim())).length;
  const done = lines.filter((line) => /^☑/.test(line.trim())).length;
  return total ? `${done}/${total}` : "TXT";
}

function displayTitle(note) {
  const title = note.title.trim();
  if (title) return title;
  return note.body.split("\n").find((line) => line.trim())?.trim().slice(0, 18) || "未命名便签";
}

function renderPill() {
  const dashes = notes.slice(0, 5)
    .map((note) => `<i style="background:${note.color}"></i>`)
    .join("");
  document.querySelector(".pill-dashes").innerHTML = dashes;
}

function renderTabs() {
  tabs.innerHTML = notes.slice(0, 5).map((note, index) => {
    const selected = note.id === activeId;
    return `
      <button
        class="note-tab"
        type="button"
        role="tab"
        aria-selected="${selected}"
        aria-controls="note-panel"
        data-note-id="${note.id}"
        style="--index:${index};--paper:${note.color};z-index:${index + 1}"
      >
        <span class="tab-title">${escapeHtml(displayTitle(note))}</span>
        <span class="tab-progress">${taskProgress(note.body)}</span>
      </button>
    `;
  }).join("");

  noteCount.textContent = String(notes.length);
  renderPill();
}

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  })[character]);
}

function setState(nextState, { restoreFocus = false } = {}) {
  window.clearTimeout(collapseTimer);
  if (nextState === "rest" && restoreFocus) suppressOpenUntil = performance.now() + 720;
  deck.dataset.state = nextState;
  pill.setAttribute("aria-expanded", String(nextState !== "rest"));
  document.querySelector("#note-fan").setAttribute("aria-hidden", String(nextState === "rest"));
  const isExpanded = nextState === "expanded";
  panel.setAttribute("aria-hidden", String(!isExpanded));
  panel.inert = !isExpanded;

  if (nextState !== "expanded") {
    panel.removeAttribute("aria-describedby");
    pinnedOpen = false;
    pinNote.setAttribute("aria-pressed", "false");
  }

  if (nextState === "rest") {
    activeId = null;
    renderTabs();
  }

  if (restoreFocus) {
    const restoredTab = nextState === "fan" && lastTriggerNoteId
      ? document.querySelector(`[data-note-id="${CSS.escape(lastTriggerNoteId)}"]`)
      : null;
    const focusTarget = restoredTab || pill;
    if (focusTarget instanceof HTMLElement) focusTarget.focus({ preventScroll: true });
  }
}

function openNote(id, trigger) {
  const note = notes.find((item) => item.id === id);
  if (!note) return;

  activeId = id;
  lastTrigger = trigger || pill;
  lastTriggerNoteId = id;
  noteNumber.textContent = `NOTE ${String(notes.indexOf(note) + 1).padStart(2, "0")}`;
  titleInput.value = note.title;
  bodyInput.value = note.body;
  panel.style.setProperty("--paper", note.color);
  updateCharacterCount();
  renderTabs();
  setState("expanded");
  window.requestAnimationFrame(() => titleInput.focus({ preventScroll: true }));
}

function scheduleSave() {
  const note = notes.find((item) => item.id === activeId);
  if (!note) return;

  note.title = titleInput.value;
  note.body = bodyInput.value;
  saveStatus.classList.add("is-saving");
  saveStatus.lastChild.textContent = " 保存中";
  updateCharacterCount();
  renderTabs();

  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    storeNotes();
    saveStatus.classList.remove("is-saving");
    saveStatus.lastChild.textContent = " 已保存";
  }, 320);
}

function updateCharacterCount() {
  characterCount.textContent = `${bodyInput.value.length} 字`;
}

function createNote() {
  const id = `note-${Date.now()}`;
  notes.unshift({ id, title: "", body: "", color: palette[notes.length % palette.length] });
  storeNotes();
  renderTabs();
  openNote(id, addNote);
}

function openFan() {
  if (performance.now() < suppressOpenUntil) return;
  if (deck.dataset.state === "rest") setState("fan");
}

function scheduleCollapse() {
  if (deck.dataset.state !== "fan") return;
  if (mobileLayout.matches || !hoverCapable.matches) return;
  collapseTimer = window.setTimeout(() => setState("rest"), 520);
}

function closeExpanded() {
  if (deck.dataset.state === "expanded") setState("fan", { restoreFocus: true });
}

function applyTheme(theme) {
  shell.dataset.theme = theme;
  const isDark = theme === "dark";
  themeToggle.setAttribute("aria-label", isDark ? "切换浅色主题" : "切换深色主题");
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeLabel.textContent = isDark ? "浅色" : "深色";
  localStorage.setItem(THEME_KEY, theme);
}

pill.addEventListener("pointerenter", () => {
  if (!mobileLayout.matches && hoverCapable.matches) openFan();
});
pill.addEventListener("click", () => {
  openFan();
});

experienceDeck.addEventListener("click", () => {
  openFan();
  window.requestAnimationFrame(() => {
    const firstTab = tabs.querySelector("[data-note-id]");
    if (firstTab instanceof HTMLElement) firstTab.focus({ preventScroll: true });
  });
});

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", () => {
    if (deck.dataset.state === "fan") setState("rest");
  });
});

deck.addEventListener("pointerenter", () => window.clearTimeout(collapseTimer));
deck.addEventListener("pointerleave", scheduleCollapse);

tabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-note-id]");
  if (!tab) return;
  openNote(tab.dataset.noteId, tab);
});

titleInput.addEventListener("input", scheduleSave);
bodyInput.addEventListener("input", scheduleSave);
closeNote.addEventListener("click", closeExpanded);
addNote.addEventListener("click", createNote);

pinNote.addEventListener("click", () => {
  pinnedOpen = !pinnedOpen;
  pinNote.setAttribute("aria-pressed", String(pinnedOpen));
  pinNote.title = pinnedOpen ? "取消保持展开" : "保持展开";
});

themeToggle.addEventListener("click", () => {
  applyTheme(shell.dataset.theme === "dark" ? "light" : "dark");
});

guideToggle.addEventListener("click", () => {
  const willOpen = guideCard.hidden;
  guideCard.hidden = !willOpen;
  guideToggle.setAttribute("aria-expanded", String(willOpen));
});

mobileScrim.addEventListener("click", closeExpanded);

document.addEventListener("pointerdown", (event) => {
  if (deck.dataset.state !== "expanded" || pinnedOpen) return;
  if (deck.contains(event.target) || guideCard.contains(event.target) || guideToggle.contains(event.target)) return;
  setState("rest");
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (!guideCard.hidden) {
    guideCard.hidden = true;
    guideToggle.setAttribute("aria-expanded", "false");
    guideToggle.focus();
    return;
  }

  if (deck.dataset.state === "expanded") {
    event.preventDefault();
    closeExpanded();
  } else if (deck.dataset.state === "fan") {
    event.preventDefault();
    setState("rest", { restoreFocus: true });
  }
});

const storedTheme = localStorage.getItem(THEME_KEY);
const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
applyTheme(storedTheme || preferredTheme);
renderTabs();
