import { access, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const templatePath = path.join(repoRoot, "store-assets", "screenshot-template.html");
const outputDir = path.join(repoRoot, "store-assets", "screenshots");

const shots = [
  {
    id: "01-recording-timer",
    title: "Recording Timer",
  },
  {
    id: "02-local-download",
    title: "Local Download",
  },
  {
    id: "03-options",
    title: "Options",
  },
];

const chromeCandidates = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

async function commandExists(command) {
  return new Promise((resolve) => {
    const child = spawn(command, ["--version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

async function findChrome() {
  for (const candidate of chromeCandidates) {
    if (await commandExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Could not find Chrome. Set CHROME_BIN to a Chrome or Chromium executable."
  );
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function runChrome(chromePath, args, outputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(chromePath, args, { stdio: "inherit" });
    let settled = false;
    let timeout;

    const finish = (error) => {
      if (settled) return;

      settled = true;
      clearTimeout(timeout);

      if (error) {
        reject(error);
        return;
      }

      resolve();
    };

    timeout = setTimeout(async () => {
      if (await fileExists(outputPath)) {
        child.kill("SIGTERM");
        finish();
        return;
      }

      child.kill("SIGTERM");
      finish(new Error(`Chrome did not create ${outputPath}`));
    }, 15000);

    child.on("error", finish);
    child.on("exit", (code) => {
      if (code === 0) {
        finish();
        return;
      }

      if (settled) return;

      finish(new Error(`Chrome exited with code ${code}`));
    });
  });
}

await mkdir(outputDir, { recursive: true });

const chromePath = await findChrome();
const templateUrl = pathToFileURL(templatePath).href;

for (const shot of shots) {
  const outputPath = path.join(outputDir, `${shot.id}.png`);
  const profileDir = await mkdtemp(path.join(tmpdir(), `tab-recorder-${shot.id}-`));

  console.log(`Capturing ${shot.title} -> ${path.relative(repoRoot, outputPath)}`);

  await runChrome(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-sync",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profileDir}`,
    "--window-size=1280,800",
    `--screenshot=${outputPath}`,
    `${templateUrl}?shot=${shot.id}`,
  ], outputPath);
}

console.log("Chrome Web Store screenshots generated.");
