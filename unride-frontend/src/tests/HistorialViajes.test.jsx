import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { apiRequest } from "@/services/api";
import ViajesCancelados from "@/pages/ViajesCancelados";
import ViajesCompletados from "@/pages/ViajesCompletados";

vi.mock("@/services/api", () => ({ apiRequest: vi.fn() }));

const viajes = [
  { id: 1, origen: "Campus A", destino: "Centro", estado: "cancelado" },
  { id: 2, origen: "Campus B", destino: "Norte", estado: "finalizado" },
  { id: 3, origen: "Campus C", destino: "Sur", estado: "programado" },
];

describe("HU-03: pantallas de viajes cancelados y completados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockResolvedValue({ trips: viajes });
  });

  test("cancelados solo lista viajes cancelados y permite regresar", async () => {
    const onBack = vi.fn();
    render(<ViajesCancelados onBack={onBack} />);
    expect(await screen.findByText("Campus A → Centro")).toBeTruthy();
    expect(screen.queryByText("Campus B → Norte")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Regresar a Mis Viajes/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  test("completados solo lista viajes finalizados", async () => {
    render(<ViajesCompletados onBack={vi.fn()} />);
    expect(await screen.findByText("Campus B → Norte")).toBeTruthy();
    expect(screen.queryByText("Campus A → Centro")).toBeNull();
  });

  test("ambas páginas muestran su propio estado vacío", async () => {
    apiRequest.mockResolvedValue({ trips: [] });
    const primera = render(<ViajesCancelados onBack={vi.fn()} />);
    expect(await screen.findByText("No tienes viajes cancelados")).toBeTruthy();
    primera.unmount();
    render(<ViajesCompletados onBack={vi.fn()} />);
    expect(await screen.findByText("No tienes viajes completados")).toBeTruthy();
  });

  test("un fallo de API muestra error y permite reintentar", async () => {
    apiRequest.mockRejectedValueOnce(new Error("Error de conexión")).mockResolvedValueOnce({ trips: [] });
    render(<ViajesCancelados onBack={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Error de conexión");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("No tienes viajes cancelados")).toBeTruthy();
  });
});
