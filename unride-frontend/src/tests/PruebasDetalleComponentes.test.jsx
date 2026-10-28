import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TablaPaginada from "@/components/admin/TablaPaginada";
import BarraBusquedaFiltros from "@/components/admin/BarraBusquedaFiltros";
import ModalConfirmacion from "@/components/admin/ModalConfirmacion";

afterEach(() => cleanup());

describe("Issue #157 / HU-09 — Pruebas de componentes del panel", () => {
  it("tabla paginada muestra carga y bloquea cambiar de página", () => {
    const cambiarPagina = vi.fn();
    render(
      <TablaPaginada
        columnas={[{ key: "nombre", titulo: "Nombre" }]}
        datos={[]}
        total={40}
        pagina={1}
        porPagina={20}
        cargando
        onPaginaChange={cambiarPagina}
      />
    );
    expect(screen.getByRole("status").textContent).toContain("Cargando datos");
    expect(screen.getByRole("button", { name: "Página siguiente" }).disabled).toBe(true);
    expect(cambiarPagina).not.toHaveBeenCalled();
  });

  it("tabla muestra error del servidor y permite reintentar", () => {
    const reintentar = vi.fn();
    render(
      <TablaPaginada
        columnas={[{ key: "nombre", titulo: "Nombre" }]}
        datos={[]}
        error="Error 500: servidor no disponible"
        onReintentar={reintentar}
      />
    );
    expect(screen.getByRole("alert").textContent).toContain("Error 500");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(reintentar).toHaveBeenCalledOnce();
  });

  it("barra envía búsqueda y filtro y el botón Limpiar restaura los parámetros", () => {
    const consultar = vi.fn();
    render(
      <BarraBusquedaFiltros
        campoBusqueda="q"
        onConsultar={consultar}
        filtros={[{
          key: "rol",
          titulo: "Rol",
          opciones: [{ valor: "Administrador", etiqueta: "Administrador" }],
        }]}
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Buscar..."), {
      target: { value: "  Jorge  " },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Rol" }), {
      target: { value: "Administrador" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(consultar).toHaveBeenLastCalledWith({ q: "Jorge", rol: "Administrador" });
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(consultar).toHaveBeenLastCalledWith({});
    expect(screen.getByPlaceholderText("Buscar...").value).toBe("");
    expect(screen.getByRole("combobox", { name: "Rol" }).value).toBe("");
  });

  it("modal requiere motivo, confirma texto sin espacios externos y permite cancelar", () => {
    const confirmar = vi.fn();
    const cerrar = vi.fn();
    render(
      <ModalConfirmacion
        abierto
        requiereMotivo
        onConfirmar={confirmar}
        onCerrar={cerrar}
      />
    );
    const botonConfirmar = screen.getByRole("button", { name: "Confirmar" });
    expect(botonConfirmar.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Escribe el motivo de esta acción"), {
      target: { value: "   " },
    });
    expect(botonConfirmar.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Escribe el motivo de esta acción"), {
      target: { value: "  Revisar reporte  " },
    });
    fireEvent.click(botonConfirmar);
    expect(confirmar).toHaveBeenCalledWith("Revisar reporte");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(cerrar).toHaveBeenCalledOnce();
  });

  it("modal deshabilita las acciones cuando está cargando", () => {
    const confirmar = vi.fn();
    const cerrar = vi.fn();
    render(
      <ModalConfirmacion
        abierto
        cargando
        onConfirmar={confirmar}
        onCerrar={cerrar}
      />
    );
    expect(screen.getByRole("button", { name: "Confirmar" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Cancelar" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Cerrar modal" }).disabled).toBe(true);
    expect(confirmar).not.toHaveBeenCalled();
    expect(cerrar).not.toHaveBeenCalled();
  });
});
