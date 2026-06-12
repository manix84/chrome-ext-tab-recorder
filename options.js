const DEFAULT_OPTIONS = {
  badgeMode: "timer",
  hideCursorFromRecordings: false,
};

const hideCursorInput = document.querySelector("#hide-cursor");
const badgeModeInputs = document.querySelectorAll('input[name="badge-mode"]');
const saveStatus = document.querySelector("#save-status");

let saveStatusTimeout = null;

function showSavedStatus() {
  saveStatus.textContent = "✅ Saved";

  clearTimeout(saveStatusTimeout);
  saveStatusTimeout = setTimeout(() => {
    saveStatus.textContent = "";
  }, 1400);
}

async function loadOptions() {
  const options = await chrome.storage.local.get(DEFAULT_OPTIONS);

  hideCursorInput.checked = Boolean(options.hideCursorFromRecordings);

  for (const input of badgeModeInputs) {
    input.checked = input.value === options.badgeMode;
  }
}

async function saveOptions() {
  const badgeMode =
    document.querySelector('input[name="badge-mode"]:checked')?.value || "timer";

  await chrome.storage.local.set({
    badgeMode: badgeMode === "rec" ? "rec" : "timer",
    hideCursorFromRecordings: hideCursorInput.checked,
  });

  showSavedStatus();
}

hideCursorInput.addEventListener("change", saveOptions);

for (const input of badgeModeInputs) {
  input.addEventListener("change", saveOptions);
}

loadOptions().catch((error) => {
  console.error("Failed to load options:", error);
  saveStatus.textContent = "Could not load options.";
});
