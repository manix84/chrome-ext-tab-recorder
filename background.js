const OFFSCREEN_PATH = "offscreen.html";
const OFFSCREEN_URL = chrome.runtime.getURL(OFFSCREEN_PATH);
const DEFAULT_OPTIONS = {
  badgeMode: "timer",
  hideCursorFromRecordings: false,
};

let badgeTimerInterval = null;
let recordingStartedAt = null;
let activeBadgeMode = DEFAULT_OPTIONS.badgeMode;

async function getRecordingState() {
  const { isRecording = false } =
    await chrome.storage.session.get("isRecording");
  return isRecording;
}

async function getOptions() {
  const options = await chrome.storage.local.get(DEFAULT_OPTIONS);

  return {
    badgeMode: options.badgeMode === "rec" ? "rec" : "timer",
    hideCursorFromRecordings: Boolean(options.hideCursorFromRecordings),
  };
}

function formatBadgeElapsed(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 10) {
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 10) {
    return `${hours}h${String(remainingMinutes).padStart(2, "0")}`;
  }

  return `${hours}h`;
}

function formatTitleElapsed(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

async function updateRecordingBadge() {
  if (!recordingStartedAt) return;

  const elapsed = Date.now() - recordingStartedAt;

  await chrome.action.setBadgeText({
    text: activeBadgeMode === "rec" ? "REC" : formatBadgeElapsed(elapsed),
  });

  await chrome.action.setTitle({
    title: `Stop Recording (${formatTitleElapsed(elapsed)})`,
  });
}

async function startBadgeTimer(startedAt, badgeMode = DEFAULT_OPTIONS.badgeMode) {
  stopBadgeTimer();

  recordingStartedAt = startedAt;
  activeBadgeMode = badgeMode;

  await chrome.action.setBadgeBackgroundColor({ color: "#d93025" });
  await chrome.action.setBadgeTextColor({ color: "#ffffff" });
  await updateRecordingBadge();

  badgeTimerInterval = setInterval(async () => {
    try {
      await updateRecordingBadge();
    } catch (error) {
      console.error("Badge timer update failed:", error);
    }
  }, 1000);
}

function stopBadgeTimer() {
  if (badgeTimerInterval) {
    clearInterval(badgeTimerInterval);
    badgeTimerInterval = null;
  }

  recordingStartedAt = null;
  activeBadgeMode = DEFAULT_OPTIONS.badgeMode;
}

async function setRecordingState(isRecording, tabId = null) {
  const { recordingStartedAt: storedStartedAt = null } =
    await chrome.storage.session.get("recordingStartedAt");
  const nextStartedAt = isRecording ? storedStartedAt || Date.now() : null;
  const options = isRecording ? await getOptions() : DEFAULT_OPTIONS;
  const nextBadgeMode = isRecording ? options.badgeMode : null;

  await chrome.storage.session.set({
    isRecording,
    recordingTabId: tabId,
    recordingStartedAt: nextStartedAt,
    badgeMode: nextBadgeMode,
  });

  await chrome.action.setTitle({
    title: isRecording ? "Stop Recording" : "Start Recording",
  });

  if (isRecording) {
    await startBadgeTimer(nextStartedAt, nextBadgeMode);
  } else {
    stopBadgeTimer();
    await chrome.action.setBadgeText({ text: "" });
  }
}

async function ensureOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [OFFSCREEN_URL],
  });

  if (contexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ["USER_MEDIA", "BLOBS"],
    justification:
      "Record the current tab with MediaRecorder and save the result",
  });
}

async function closeOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [OFFSCREEN_URL],
  });

  if (contexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

function sanitizeFilenamePart(input) {
  return (
    String(input || "tab")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "tab"
  );
}

function buildFilename(tabTitle, extension) {
  const safeTitle = sanitizeFilenamePart(tabTitle);
  const now = new Date();

  const pad = (n) => String(n).padStart(2, "0");
  const stamp =
    [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join("-") +
    "_" +
    [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join(
      "-"
    );

  return `Tab Recording - ${safeTitle} - ${stamp}.${extension}`;
}

chrome.runtime.onStartup.addListener(async () => {
  await setRecordingState(false, null);
});

chrome.runtime.onInstalled.addListener(async () => {
  await setRecordingState(false, null);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.badgeMode || !recordingStartedAt) {
    return;
  }

  activeBadgeMode = changes.badgeMode.newValue === "rec" ? "rec" : "timer";

  chrome.storage.session.set({ badgeMode: activeBadgeMode }).catch((error) => {
    console.error("Badge option persistence failed:", error);
  });
  updateRecordingBadge().catch((error) => {
    console.error("Badge option update failed:", error);
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    const isRecording = await getRecordingState();

    if (isRecording) {
      await chrome.runtime.sendMessage({ type: "STOP_RECORDING" });
      return;
    }

    if (!tab?.id) {
      throw new Error("No active tab ID found.");
    }

    const options = await getOptions();

    await ensureOffscreenDocument();

    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id,
    });

    await chrome.runtime.sendMessage({
      type: "START_RECORDING",
      target: "offscreen",
      data: {
        streamId,
        tabId: tab.id,
        tabTitle: tab.title || "Current Tab",
        hideCursor: options.hideCursorFromRecordings,
      },
    });
  } catch (error) {
    console.error("Action click failed:", error);
    await setRecordingState(false, null);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "RECORDING_STARTED": {
        await setRecordingState(true, message.tabId ?? null);
        sendResponse({ ok: true });
        break;
      }

      case "RECORDING_STOPPED": {
        await setRecordingState(false, null);
        sendResponse({ ok: true });
        break;
      }

      case "SAVE_RECORDING": {
        const { objectUrl, mimeType, tabTitle } = message;

        const extension = mimeType?.includes("mp4") ? "mp4" : "webm";
        const filename = buildFilename(tabTitle, extension);

        const downloadId = await chrome.downloads.download({
          url: objectUrl,
          filename,
          saveAs: false,
        });

        sendResponse({ ok: true, downloadId, filename });
        break;
      }

      case "CLEANUP_AFTER_SAVE": {
        await closeOffscreenDocument();
        sendResponse({ ok: true });
        break;
      }

      case "RECORDING_ERROR": {
        console.error("Recording error:", message.error);
        await setRecordingState(false, null);
        await closeOffscreenDocument();
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ ok: false, error: "Unknown message type" });
        break;
    }
  })();

  return true;
});
