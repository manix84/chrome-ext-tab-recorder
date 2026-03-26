let mediaRecorder = null;
let mediaStream = null;
let audioContext = null;
let audioSource = null;
let recordedChunks = [];
let currentTabTitle = 'Current Tab';

function pickSupportedMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm'
  ];

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
}

async function startRecording({ streamId, tabTitle }) {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    throw new Error('A recording is already in progress.');
  }

  currentTabTitle = tabTitle || 'Current Tab';
  recordedChunks = [];

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    },
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    }
  });

  audioContext = new AudioContext();
  audioSource = audioContext.createMediaStreamSource(mediaStream);
  audioSource.connect(audioContext.destination);

  const mimeType = pickSupportedMimeType();
  mediaRecorder = mimeType
    ? new MediaRecorder(mediaStream, { mimeType })
    : new MediaRecorder(mediaStream);

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onerror = async (event) => {
    await chrome.runtime.sendMessage({
      type: 'RECORDING_ERROR',
      error: event?.error?.message || 'Unknown MediaRecorder error'
    });

    await cleanupMedia();
  };

  mediaRecorder.onstop = async () => {
    try {
      const actualMimeType = mediaRecorder.mimeType || 'video/webm';
      const blob = new Blob(recordedChunks, { type: actualMimeType });
      const objectUrl = URL.createObjectURL(blob);

      await chrome.runtime.sendMessage({
        type: 'SAVE_RECORDING',
        objectUrl,
        mimeType: actualMimeType,
        tabTitle: currentTabTitle
      });

      await chrome.runtime.sendMessage({
        type: 'RECORDING_STOPPED'
      });

      await chrome.runtime.sendMessage({
        type: 'CLEANUP_AFTER_SAVE',
        objectUrl
      });
    } catch (error) {
      await chrome.runtime.sendMessage({
        type: 'RECORDING_ERROR',
        error: error?.message || String(error)
      });
    } finally {
      await cleanupMedia();
    }
  };

  mediaRecorder.start(1000);

  await chrome.runtime.sendMessage({
    type: 'RECORDING_STARTED'
  });
}

async function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    return;
  }

  mediaRecorder.stop();
}

async function cleanupMedia() {
  if (audioSource) {
    try {
      audioSource.disconnect();
    } catch {}
    audioSource = null;
  }

  if (audioContext) {
    try {
      await audioContext.close();
    } catch {}
    audioContext = null;
  }

  if (mediaStream) {
    for (const track of mediaStream.getTracks()) {
      track.stop();
    }
    mediaStream = null;
  }

  mediaRecorder = null;
  recordedChunks = [];
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === 'START_RECORDING' && message?.target === 'offscreen') {
        await startRecording(message.data);
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === 'STOP_RECORDING') {
        await stopRecording();
        sendResponse({ ok: true });
        return;
      }

      sendResponse({ ok: false, error: 'Unknown message type' });
    } catch (error) {
      await chrome.runtime.sendMessage({
        type: 'RECORDING_ERROR',
        error: error?.message || String(error)
      });

      sendResponse({ ok: false, error: error?.message || String(error) });
    }
  })();

  return true;
});
