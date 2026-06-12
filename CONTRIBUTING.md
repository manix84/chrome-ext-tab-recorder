# 🛠️ Contributing

Thanks for helping improve One-Click Tab Recorder.

## 🧭 Project Goals

- 🎯 Keep recording one-click simple.
- 🔒 Preserve local-only privacy.
- 🧩 Avoid accounts, analytics, cloud uploads, and heavy UI.
- 🧹 Keep the extension easy to review and maintain.

## 🧪 Local Checks

Run the syntax checks before opening a pull request:

```sh
npm test
```

## 🪝 Git Hooks

Install the repository hook path with:

```sh
npm run prepare
```

The pre-commit hook bumps `manifest.json` and `package.json` together.

- 🔧 Default: patch bump
- 🧱 Minor bump: `VERSION_BUMP=minor git commit`
- 🚧 Major bump: `ALLOW_MAJOR_VERSION_BUMP=1 VERSION_BUMP=major git commit`

Major bumps are intentionally guarded because this project should almost never need them.

## 📦 Pull Requests

- Keep changes focused.
- Include a short explanation of the user-visible behaviour.
- Update `PRIVACY.md` if permissions, data handling, or recording behaviour changes.
- Update `WHATSNEW.md` for notable user-facing changes.
