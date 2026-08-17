import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args, label) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${label}] exited with code ${code}`);
    }
  });
  return child;
}

console.log("🌹 Memorium POC\n");

// Seed demo data
const seed = spawn("npm", ["run", "cli", "--", "seed-demo", "--reset"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

seed.on("exit", (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  console.log("\nStarting API (http://127.0.0.1:3847) and Web UI (http://127.0.0.1:5173)…\n");

  run("npm", ["run", "dev:api"], "api");
  setTimeout(() => {
    run("npm", ["run", "dev:web"], "web");
  }, 1500);
});
