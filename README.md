# 🎥 One-Click Tab Recorder

[![Release Chrome Extension](https://github.com/manix84/chrome-ext-tab-recorder/actions/workflows/release-extension.yml/badge.svg)](https://github.com/manix84/chrome-ext-tab-recorder/actions/workflows/release-extension.yml)

A simple Chrome tab recording extension. Press the icon, it starts recording. Press it again, it stops recording and saves to your default downloads directory.

## 🧭 What is this?

One-Click Tab Recorder is a no-nonsense screen recording extension for Google Chrome. It does one thing: records what you are showing in the current tab, then saves the recording. Nothing more, nothing less.

This extension was built out of frustration with other recording extensions that come bundled with:

- 🧱 Unnecessary options and bloated UIs
- 🔐 Mandatory account sign-ups and logins
- 🕵️ Spyware and invasive data collection

If you just want to hit record, capture what is on screen, and get a saved file without friction or unwanted extras, this is the extension for you.

## ▶️ How to use

1. Click the extension icon to **start recording** the current tab.
2. Click the icon again to **stop recording**.
3. The recording is automatically saved to your default downloads directory.

## 🔒 Privacy

- 🙅 No accounts
- 🙅 No analytics
- 🙅 No cloud uploads
- 🙅 No remote code

Read the full policy in [PRIVACY.md](PRIVACY.md).

## 🛠️ Development

Install the Git hook path:

```sh
npm run prepare
```

Run local syntax checks:

```sh
npm test
```

The pre-commit hook bumps `manifest.json` and `package.json` together.

## 📚 Project Docs

- ✨ [What's New](WHATSNEW.md)
- 🛠️ [Contributing](CONTRIBUTING.md)
- 🛡️ [Security](SECURITY.md)
- 🧰 [Support](SUPPORT.md)
- 🤝 [Code of Conduct](CODE_OF_CONDUCT.md)
