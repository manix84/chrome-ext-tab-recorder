const OFFSCREEN_PATH = 'offscreen.html';
const OFFSCREEN_URL = chrome.runtime.getURL(OFFSCREEN_PATH);

let badgeBlinkInterval = null;
let badgeVisible = true;

async function getRecordingState() {
  const { isRecording = false } = await chrome.storage.session.get('isRecording');
  return isRecording;
}

async function startBadgeBlink() {
  stopBadgeBlink();

  badgeVisible = true;

  await chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
  await chrome.action.setBadgeTextColor({ color: '#ffffff' });
  await chrome.action.setBadgeText({ text: 'REC' });

  badgeBlinkInterval = setInterval(async () => {
    try {
      badgeVisible = !badgeVisible;

      await chrome.action.setBadgeText({
        text: badgeVisible ? 'REC' : ''
      });
    } catch (error) {
      console.error('Badge blink failed:', error);
    }
  }, 700);
}

function stopBadgeBlink() {
  if (badgeBlinkInterval) {
    clearInterval(badgeBlinkInterval);
    badgeBlinkInterval = null;
  }

  badgeVisible = true;
}

async function setRecordingState(isRecording, tabId = null) {
  await chrome.storage.session.set({ isRecording, recordingTabId: tabId });

  await chrome.action.setTitle({
    title: isRecording ? 'Stop Recording' : 'Start Recording'
  });

  if (isRecording) {
    await startBadgeBlink();
  } else {
    stopBadgeBlink();
    await chrome.action.setBadgeText({ text: '' });
  }
}

async function ensureOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [OFFSCREEN_URL]
  });

  if (contexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['USER_MEDIA', 'BLOBS'],
    justification: 'Record the current tab with MediaRecorder and save the result'
  });
}

async function closeOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [OFFSCREEN_URL]
  });

  if (contexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

function sanitizeFilenamePart(input) {
  return String(input || 'tab')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'tab';
}

function buildFilename(tabTitle, extension) {
  const safeTitle = sanitizeFilenamePart(tabTitle);
  const now = new Date();

  const pad = (n) => String(n).padStart(2, '0');
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join('-') + '_' + [
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('-');

  return `Tab Recording - ${safeTitle} - ${stamp}.${extension}`;
}

chrome.runtime.onStartup.addListener(async () => {
  await setRecordingState(false, null);
});

chrome.runtime.onInstalled.addListener(async () => {
  await setRecordingState(false, null);
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    const isRecording = await getRecordingState();

    if (isRecording) {
      await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
      return;
    }

    if (!tab?.id) {
      throw new Error('No active tab ID found.');
    }

    await ensureOffscreenDocument();

    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    });

    await chrome.runtime.sendMessage({
      type: 'START_RECORDING',
      target: 'offscreen',
      data: {
        streamId,
        tabId: tab.id,
        tabTitle: tab.title || 'Current Tab'
      }
    });
  } catch (error) {
    console.error('Action click failed:', error);
    await setRecordingState(false, null);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case 'RECORDING_STARTED': {
        await setRecordingState(true, message.tabId ?? null);
        sendResponse({ ok: true });
        break;
      }

      case 'RECORDING_STOPPED': {
        await setRecordingState(false, null);
        sendResponse({ ok: true });
        break;
      }

      case 'SAVE_RECORDING': {
        const { objectUrl, mimeType, tabTitle } = message;

        const extension = mimeType?.includes('mp4') ? 'mp4' : 'webm';
        const filename = buildFilename(tabTitle, extension);

        const downloadId = await chrome.downloads.download({
          url: objectUrl,
          filename,
          saveAs: false
        });

        sendResponse({ ok: true, downloadId, filename });
        break;
      }

      case 'CLEANUP_AFTER_SAVE': {
        if (message.objectUrl) {
          URL.revokeObjectURL(message.objectUrl);
        }

        await closeOffscreenDocument();
        sendResponse({ ok: true });
        break;
      }

      case 'RECORDING_ERROR': {
        console.error('Recording error:', message.error);
        await setRecordingState(false, null);
        await closeOffscreenDocument();
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ ok: false, error: 'Unknown message type' });
        break;
    }
  })();

  return true;
});
