import { expect, test } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const fixtures = JSON.parse(fs.readFileSync(
  path.join(os.tmpdir(), `uniride-frontend-e2e-${process.env.E2E_RUN_ID}.json`),
  "utf8"
));

async function signInAsAdmin(page) {
  await page.goto("/");
  await page.getByLabel("CORREO INSTITUCIONAL").fill(fixtures.adminEmail);
  await page.locator("#password").fill(fixtures.adminPassword);
  await page.getByRole("button", { name: "Iniciar Sesión" }).click();
  await expect(page.getByRole("heading", { name: "Administración" })).toBeVisible();
}

test("inicia sesión y muestra el resumen administrativo obtenido del API", async ({ page }) => {
  await signInAsAdmin(page);

  await expect(page.getByText("Usuarios registrados")).toBeVisible();
  await expect(page.getByText("Viajes registrados")).toBeVisible();
  await expect(page.getByText("Reservaciones", { exact: true })).toBeVisible();
  await expect(page.getByText(/^\d+$/).first()).toBeVisible();
});

test("busca y abre el detalle de un usuario persistido", async ({ page }) => {
  await signInAsAdmin(page);
  await page.locator("aside").getByRole("button", { name: "Usuarios" }).click();
  await expect(page.getByRole("heading", { name: "Usuarios" })).toBeVisible();

  await page.getByLabel("Buscar").fill(fixtures.userEmail);
  await page.getByRole("button", { name: "Consultar" }).click();
  await expect(page.getByRole("cell", { name: fixtures.userEmail })).toBeVisible();

  await page.getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.getByRole("heading", { name: "Usuario Frontend E2E" })).toBeVisible();
  await expect(page.getByText(fixtures.userEmail, { exact: true })).toBeVisible();
  await expect(page.getByText(/viajes publicados/i)).toBeVisible();
});

test("consulta en el panel el viaje persistido asociado al conductor de prueba", async ({ page }) => {
  await signInAsAdmin(page);
  await page.locator("aside").getByRole("button", { name: "Viajes" }).click();
  await expect(page.getByRole("heading", { name: "Viajes" })).toBeVisible();
  await expect(page.getByRole("cell", { name: fixtures.tripOrigin })).toBeVisible();
});

test("presenta un error en pantalla cuando el login administrativo falla", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("CORREO INSTITUCIONAL").fill(fixtures.adminEmail);
  await page.locator("#password").fill("Contraseña incorrecta E2E");
  await page.getByRole("button", { name: "Iniciar Sesión" }).click();

  await expect(page.getByRole("alert")).toContainText("Credenciales incorrectas");
  await expect(page.getByRole("heading", { name: "Administración" })).toHaveCount(0);
});
