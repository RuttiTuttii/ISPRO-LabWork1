const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// скрипт одновременного запуска сервиса бэкенда и раздачи фронтенда

const projectRoot = __dirname;
const venvPython = path.join(projectRoot, "backend", ".venv", "bin", "python");
const venvUvicorn = path.join(projectRoot, "backend", ".venv", "bin", "uvicorn");

// выбираем бинарник питона
let pythonCmd = fs.existsSync(venvUvicorn) ? venvUvicorn : "uvicorn";

console.log("[инфо] запуск сервера приложения на http://localhost:8000");

// поднимаем процесс uvicorn
const serverProcess = spawn(
  pythonCmd,
  ["backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: { ...process.env, PYTHONPATH: projectRoot },
  }
);

// ловим сигналы завершения чтобы не оставлять зомби-процессы
function cleanup() {
  console.log("\n[инфо] остановка сервера...");
  serverProcess.kill("SIGINT");
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

serverProcess.on("close", (code) => {
  console.log(`[инфо] процесс завершился с кодом ${code}`);
  process.exit(code || 0);
});
