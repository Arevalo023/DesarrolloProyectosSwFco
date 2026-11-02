const { spawnSync } = require("node:child_process");
const path = require("node:path");

const database = process.env.DB_NAME_TEST || "uniride_admin_e2e_test";
if (!/_test$/i.test(database)) {
  console.error("DB_NAME_TEST debe terminar en _test para proteger bases de datos no destinadas a pruebas.");
  process.exit(1);
}

const backendRoot = path.resolve(__dirname, "../..");
const env = {
  ...process.env,
  DB_NAME: database,
  DB_NAME_TEST: database,
};

const initialize = spawnSync(
  process.execPath,
  ["scripts/db-init.js"],
  { cwd: backendRoot, env, stdio: "inherit" }
);
if (initialize.status !== 0) {
  process.exit(initialize.status === null ? 1 : initialize.status);
}

const tests = spawnSync(
  process.execPath,
  ["node_modules/jest/bin/jest.js", "tests/e2e", "--runInBand"],
  { cwd: backendRoot, env, stdio: "inherit" }
);
process.exit(tests.status === null ? 1 : tests.status);
