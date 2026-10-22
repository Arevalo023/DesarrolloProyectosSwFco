import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/services/api", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/services/api";
import MisViajes from "@/pages/MisViajes";

const viaje = {
  id: 12,
  origen: "Campus",
  destino: "Centro",
  fecha_salida: "2027-01-10T15:00:00.000Z",
  estado: "programado",
  cupo_disponible: 2,
};

const solicitud = {
  id: 34,
  viaje_id: 12,
  pasajero_id: 7,
  pasajero_nombre: "Pasajero de prueba",
  estado: "pendiente",
};

const prepararRespuestaInicial = () => {
  apiRequest.mockImplementation((endpoint) => {
    if (endpoint === "/api/trips/driver") {
      return Promise.resolve({ trips: [viaje] });
    }
    if (endpoint === "/api/trips/driver/requests") {
      return Promise.resolve({ requests: [solicitud] });
    }
    return Promise.resolve({});
  });
};

describe("MisViajes: respuesta a solicitudes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prepararRespuestaInicial();
  });

  test.each([
    ["Aceptar", "aceptada", "Aceptada"],
    ["Rechazar", "rechazada", "Rechazada"],
  ])("%s envía el estado al backend y actualiza la solicitud", async (accion, estado, etiqueta) => {
    render(<MisViajes />);

    fireEvent.click(await screen.findByRole("button", { name: accion }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("/api/reservations/34", {
        method: "PATCH",
        body: { estado },
      });
    });
    expect(await screen.findByText(etiqueta)).toBeTruthy();
  });

  test("muestra el error del backend y conserva la solicitud pendiente", async () => {
    apiRequest.mockImplementation((endpoint) => {
      if (endpoint === "/api/trips/driver") {
        return Promise.resolve({ trips: [viaje] });
      }
      if (endpoint === "/api/trips/driver/requests") {
        return Promise.resolve({ requests: [solicitud] });
      }
      return Promise.reject(new Error("No hay cupo disponible en este viaje."));
    });

    render(<MisViajes />);
    fireEvent.click(await screen.findByRole("button", { name: "Aceptar" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("No hay cupo disponible en este viaje.")).toBeTruthy();
    expect(screen.getByText("Pendiente")).toBeTruthy();
  });

  test("muestra en un emergente la razón que devuelve el backend al cancelar con error 400", async () => {
    const reason = "El viaje ya salió y no se puede cancelar.";
    apiRequest.mockImplementation((endpoint) => {
      if (endpoint === "/api/trips/driver") {
        return Promise.resolve({ trips: [viaje] });
      }
      if (endpoint === "/api/trips/driver/requests") {
        return Promise.resolve({ requests: [] });
      }
      return Promise.reject(Object.assign(new Error(reason), { status: 400 }));
    });

    render(<MisViajes />);
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar viaje" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, cancelar viaje" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(reason);
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
});
