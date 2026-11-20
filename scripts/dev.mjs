import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const children = [];

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const convex = spawn("npx", ["convex", "dev"], {
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});
children.push(convex);

let ready = false;
let buffer = "";
function watch(stream) {
  stream.on("data", (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    buffer = (buffer + text).slice(-8000);
    if (buffer.includes("Convex functions ready")) ready = true;
  });
}
watch(convex.stdout);
watch(convex.stderr);
convex.on("exit", (code) => {
  if (!ready) {
    console.error(`convex dev exited early (${code ?? "null"})`);
    shutdown(code ?? 1);
  }
});

for (let i = 0; i < 300 && !ready; i += 1) {
  if (convex.exitCode != null) break;
  await delay(1000);
}
if (!ready) {
  console.error("Timed out waiting for Convex");
  shutdown(1);
}

let seeded = false;
for (let attempt = 1; attempt <= 8; attempt += 1) {
  const seed = spawn("npx", ["convex", "run", "seed:reset"], { stdio: "inherit", env: process.env });
  const code = await new Promise((resolve) => seed.on("exit", resolve));
  if (code === 0) {
    seeded = true;
    break;
  }
  await delay(1500);
}
if (!seeded) shutdown(1);

const vite = spawn("npx", ["vite", "--host", "0.0.0.0", "--port", "43127", "--strictPort"], {
  stdio: "inherit",
  env: process.env,
});
children.push(vite);
vite.on("exit", (code) => shutdown(code ?? 0));
