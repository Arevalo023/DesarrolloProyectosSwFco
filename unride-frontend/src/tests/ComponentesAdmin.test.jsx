import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TablaPaginada from "@/components/admin/TablaPaginada";
import BarraBusquedaFiltros from "@/components/admin/BarraBusquedaFiltros";
import ModalConfirmacion from "@/components/admin/ModalConfirmacion";

describe("Componentes compartidos de administración", () => {
  test("tabla recibe columnas y datos y emite el cambio de página", () => {
    const onPaginaChange = vi.fn();
    render(<TablaPaginada columnas={[{ key: "nombre", titulo: "Nombre" }]} datos={[{ id: 1, nombre: "Ana" }]} total={25} pagina={1} porPagina={20} onPaginaChange={onPaginaChange} />);
    expect(screen.getByText("Ana")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(onPaginaChange).toHaveBeenCalledWith(2);
  });

  test("tabla muestra vacío y error", () => {
    const { rerender } = render(<TablaPaginada columnas={[{ key: "id", titulo: "ID" }]} datos={[]} />);
    expect(screen.getByText("No hay resultados.")).toBeTruthy();
    rerender(<TablaPaginada columnas={[{ key: "id", titulo: "ID" }]} datos={[]} error="No disponible" />);
    expect(screen.getByRole("alert").textContent).toContain("No disponible");
  });

  test("búsqueda y filtros emite parámetros", () => {
    const onConsultar = vi.fn();
    render(<BarraBusquedaFiltros filtros={[{ key: "rol", titulo: "Rol", opciones: [{ valor: "Conductor", etiqueta: "Conductor" }] }]} onConsultar={onConsultar} />);
    fireEvent.change(screen.getByPlaceholderText("Buscar..."), { target: { value: "Ana" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Rol" }), { target: { value: "Conductor" } });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(onConsultar).toHaveBeenCalledWith({ q: "Ana", rol: "Conductor" });
  });

  test("modal exige motivo antes de confirmar", () => {
    const onConfirmar = vi.fn();
    render(<ModalConfirmacion abierto requiereMotivo onConfirmar={onConfirmar} onCerrar={vi.fn()} />);
    const boton = screen.getByRole("button", { name: "Confirmar" });
    expect(boton.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Escribe el motivo de esta acción"), { target: { value: "Revisar reporte" } });
    fireEvent.click(boton);
    expect(onConfirmar).toHaveBeenCalledWith("Revisar reporte");
  });
});
