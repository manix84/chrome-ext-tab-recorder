# Privacy Policy

## Overview

Current Tab Recorder is designed with privacy as a core principle. The extension operates entirely within the user's browser and does not collect, store, or transmit any personal data.

---

## Data Collection

This extension does **not collect any personal or sensitive user data**.

Specifically:
- No personally identifiable information (PII) is collected
- No browsing history is stored or transmitted
- No recorded content is uploaded or shared externally

---

## How the Extension Works

The extension records the **currently active browser tab** only when the user explicitly initiates recording by clicking the extension icon.

The recording:
- Captures video and audio from the active tab
- Is processed locally within the browser
- Is saved directly to the user's device using the browser's download functionality

At no point is recorded data sent to any external server.

---

## Permissions Justification

### tabCapture
Used to capture video and audio from the active browser tab when the user starts recording.

### offscreen
Used to create an offscreen document required to access media recording APIs (e.g., MediaRecorder) that are not available in service workers.

### downloads
Used to save the recorded video file to the user's local device after recording is complete.

### storage
Used to store minimal internal state (e.g., whether recording is active) to manage extension behaviour and UI.

---

## Remote Code

This extension does **not use remote code**. All scripts and functionality are bundled within the extension package.

---

## Data Sharing

No data is shared with third parties.

---

## Data Security

All processing occurs locally within the user's browser environment. Since no data leaves the device, there is no risk of external interception or storage.

---

## User Control

- Recording only begins when the user clicks the extension icon
- Recording can be stopped at any time by clicking the icon again
- All recordings are saved locally and remain under the user's control

---

## Changes to This Policy

This privacy policy may be updated in future versions of the extension. Any changes will be reflected in this document.

---

## Contact

If you have any questions about this privacy policy, please contact:

Rob Taylor  
manix84@gmail.com
