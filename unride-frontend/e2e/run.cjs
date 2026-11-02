const { spawnSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const path = require("node:path");

const frontendRoot = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(frontendRoot, "..");
const backendRoot = path.join(repositoryRoot, "uniride-backend");
const dotenv = require(path.join(backendRoot, "node_modules", "dotenv"));

dotenv.config({ path: path.join(backendRoot, ".env") });

const database = process.env.DB_NAME_TEST || "uniride_admin_e2e_test";
if (!/_test$/i.test(database)) {
  console.error("DB_NAME_TEST debe terminar en _test para proteger bases de datos no destinadas a pruebas.");
  process.exit(1);
}

const env = {
  ...process.env,
  DB_NAME: database,
  DB_NAME_TEST: database,
  E2E_RUN_ID: randomUUID(),
  JWT_SECRET: process.env.JWT_SECRET || "uniride_default_secret_key",
};

const initialize = spawnSync(
  process.execPath,
  ["scripts/db-init.js"],
  { cwd: backendRoot, env, stdio: "inherit" }
);
if (initialize.status !== 0) {
  process.exit(initialize.status === null ? 1 : initialize.status);
}

const playwrightCli = path.join(
  frontendRoot,
  "node_modules",
  "@playwright",
  "test",
  "cli.js"
);
const tests = spawnSync(
  process.execPath,
  [playwrightCli, "test"],
  { cwd: frontendRoot, env, stdio: "inherit" }
);
process.exit(tests.status === null ? 1 : tests.status);
