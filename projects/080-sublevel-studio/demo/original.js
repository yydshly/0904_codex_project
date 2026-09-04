const originalFrame = document.querySelector("#original-frame");
const originalOrigin = document.querySelector("#original-origin");
const originalLoading = document.querySelector("#frame-loading");
const localButton = document.querySelector("#local-original");
const officialButton = document.querySelector("#official-original");
const fullscreenLink = document.querySelector("#original-fullscreen");
const officialUrl = "https://mengto.github.io/sublevel-studio/";
const localUrl = "../source/";
let loadingTimer;
let sourceWasChosen = false;

function showSource(source) {
  const isLocal = source === "local";
  originalLoading.hidden = false;
  originalFrame.src = isLocal ? localUrl : officialUrl;
  originalOrigin.textContent = isLocal ? "LOCAL SNAPSHOT · 355a1581" : "OFFICIAL · mengto.github.io";
  fullscreenLink.href = isLocal ? localUrl : officialUrl;
  localButton.classList.toggle("is-active", isLocal);
  officialButton.classList.toggle("is-active", !isLocal);
  clearTimeout(loadingTimer);
  loadingTimer = setTimeout(() => {
    originalLoading.hidden = true;
  }, 8000);
}

originalFrame.addEventListener("load", () => {
  clearTimeout(loadingTimer);
  originalLoading.hidden = true;
});

localButton.addEventListener("click", () => {
  sourceWasChosen = true;
  showSource("local");
});
officialButton.addEventListener("click", () => {
  sourceWasChosen = true;
  showSource("official");
});

async function preferLocalSnapshot() {
  try {
    const response = await fetch(`${localUrl}index.html`, { method: "HEAD", cache: "no-store" });
    if (response.ok) {
      localButton.hidden = false;
      if (!sourceWasChosen) showSource("local");
      return;
    }
    if (!sourceWasChosen) showSource("official");
  } catch {
    // Published builds intentionally omit the unlicensed upstream source.
    if (!sourceWasChosen) showSource("official");
  }
}

preferLocalSnapshot();
