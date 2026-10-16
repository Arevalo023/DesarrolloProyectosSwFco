/**
 * Pruebas unitarias para la clasificación de viajes por estado y persistencia tras recargar.
 * Issue #105: Pruebas de clasificación por estado (HU-03).
 */

jest.mock("../../config/db", () => require("../helpers/mockDb").module);

const db = require("../helpers/mockDb");
const tripModel = require("../../models/tripModel");
const tripService = require("../../services/tripService");
const tripController = require("../../controllers/tripController");

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
});

describe("Clasificador de Viajes: tripService.classifyTripsByStatus", () => {
  test("clasifica correctamente viajes según su estado en activos, cancelados y completados", () => {
    const rawTrips = [
      { id: 1, origen: "Campus Arteaga", destino: "Centro", estado: "programado" },
      { id: 2, origen: "Campus Poniente", destino: "Norte", estado: "en_curso" },
      { id: 3, origen: "Rectoría", destino: "Arteaga", estado: "activo" },
      { id: 4, origen: "Zona Centro", destino: "Campus", estado: "en curso" },
      { id: 5, origen: "Campus", destino: "Plaza", estado: "cancelado" },
      { id: 6, origen: "Sur", destino: "Norte", estado: "cancelada" },
      { id: 7, origen: "Facultad", destino: "Centro", estado: "finalizado" },
      { id: 8, origen: "Centro", destino: "Facultad", estado: "completado" },
    ];

    const resultado = tripService.classifyTripsByStatus(rawTrips);

    // Activos: programado, en_curso, activo, en curso
    expect(resultado.activos).toHaveLength(4);
    expect(resultado.activos.map((t) => t.id)).toEqual([1, 2, 3, 4]);

    // Cancelados: cancelado, cancelada
    expect(resultado.cancelados).toHaveLength(2);
    expect(resultado.cancelados.map((t) => t.id)).toEqual([5, 6]);

    // Completados: finalizado, completado
    expect(resultado.completados).toHaveLength(2);
    expect(resultado.completados.map((t) => t.id)).toEqual([7, 8]);
  });

  test("es tolerante a mayúsculas y espacios en blanco al clasificar estados", () => {
    const rawTrips = [
      { id: 10, estado: " PROGRAMADO " },
      { id: 20, estado: "EN_CURSO" },
      { id: 30, estado: " CANCELADO " },
      { id: 40, estado: "FINALIZADO" },
    ];

    const resultado = tripService.classifyTripsByStatus(rawTrips);

    expect(resultado.activos.map((t) => t.id)).toEqual([10, 20]);
    expect(resultado.cancelados.map((t) => t.id)).toEqual([30]);
    expect(resultado.completados.map((t) => t.id)).toEqual([40]);
  });

  test("cubre los casos de categorías vacías sin errores ni valores nulos", () => {
    // Caso 1: Solo viajes activos (cancelados y completados vacíos)
    const soloActivos = [{ id: 1, estado: "programado" }];
    const resSoloActivos = tripService.classifyTripsByStatus(soloActivos);
    expect(resSoloActivos.activos).toHaveLength(1);
    expect(resSoloActivos.cancelados).toEqual([]);
    expect(resSoloActivos.completados).toEqual([]);

    // Caso 2: Solo viajes cancelados
    const soloCancelados = [{ id: 2, estado: "cancelado" }];
    const resSoloCancelados = tripService.classifyTripsByStatus(soloCancelados);
    expect(resSoloCancelados.activos).toEqual([]);
    expect(resSoloCancelados.cancelados).toHaveLength(1);
    expect(resSoloCancelados.completados).toEqual([]);

    // Caso 3: Solo viajes completados
    const soloCompletados = [{ id: 3, estado: "finalizado" }];
    const resSoloCompletados = tripService.classifyTripsByStatus(soloCompletados);
    expect(resSoloCompletados.activos).toEqual([]);
    expect(resSoloCompletados.cancelados).toEqual([]);
    expect(resSoloCompletados.completados).toHaveLength(1);

    // Caso 4: Sin ningún viaje (lista vacía)
    const resVacio = tripService.classifyTripsByStatus([]);
    expect(resVacio).toEqual({
      activos: [],
      cancelados: [],
      completados: [],
    });

    // Caso 5: Entrada nula o indefinida
    expect(tripService.classifyTripsByStatus(null)).toEqual({
      activos: [],
      cancelados: [],
      completados: [],
    });
    expect(tripService.classifyTripsByStatus(undefined)).toEqual({
      activos: [],
      cancelados: [],
      completados: [],
    });
  });
});

describe("Persistencia de la Clasificación tras Recargar (Ciclo de Vida)", () => {
  test("mantiene la clasificación persistente en la BD a través de transiciones y recargas consecutivas", async () => {
    const conductorId = 5;

    // Recarga 1: Conductor recién crea viaje #101 (estado 'programado')
    const viajeDbInicial = [
      { id: 101, conductor_id: conductorId, origen: "Arteaga", destino: "Centro", estado: "programado" },
    ];
    db.queueResult({ recordset: viajeDbInicial });

    let recarga1 = await tripService.listByDriver(conductorId, { classified: true });
    expect(recarga1.activos.map((t) => t.id)).toEqual([101]);
    expect(recarga1.cancelados).toEqual([]);
    expect(recarga1.completados).toEqual([]);

    // Recarga 2: Conductor inicia el viaje (estado 'en_curso') y vuelve a recargar
    const viajeDbIniciado = [
      { id: 101, conductor_id: conductorId, origen: "Arteaga", destino: "Centro", estado: "en_curso" },
    ];
    db.queueResult({ recordset: viajeDbIniciado });

    let recarga2 = await tripService.listByDriver(conductorId, { classified: true });
    expect(recarga2.activos.map((t) => t.id)).toEqual([101]);
    expect(recarga2.activos[0].estado).toBe("en_curso");
    expect(recarga2.cancelados).toEqual([]);
    expect(recarga2.completados).toEqual([]);

    // Recarga 3: Conductor finaliza el viaje (estado 'finalizado') y vuelve a recargar
    const viajeDbFinalizado = [
      { id: 101, conductor_id: conductorId, origen: "Arteaga", destino: "Centro", estado: "finalizado" },
    ];
    db.queueResult({ recordset: viajeDbFinalizado });

    let recarga3 = await tripService.listByDriver(conductorId, { classified: true });
    expect(recarga3.activos).toEqual([]);
    expect(recarga3.cancelados).toEqual([]);
    expect(recarga3.completados.map((t) => t.id)).toEqual([101]);

    // Recarga 4: Se agrega un nuevo viaje #102 que se cancela
    const viajesMixtos = [
      { id: 101, conductor_id: conductorId, origen: "Arteaga", destino: "Centro", estado: "finalizado" },
      { id: 102, conductor_id: conductorId, origen: "Poniente", destino: "Rectoría", estado: "cancelado" },
      { id: 103, conductor_id: conductorId, origen: "Centro", destino: "Campus", estado: "programado" },
    ];
    db.queueResult({ recordset: viajesMixtos });

    let recarga4 = await tripService.listByDriver(conductorId, { classified: true });
    expect(recarga4.activos.map((t) => t.id)).toEqual([103]);
    expect(recarga4.cancelados.map((t) => t.id)).toEqual([102]);
    expect(recarga4.completados.map((t) => t.id)).toEqual([101]);

    // Garantizar que ningún viaje se duplique entre categorías
    const todosLosIds = [
      ...recarga4.activos.map((t) => t.id),
      ...recarga4.cancelados.map((t) => t.id),
      ...recarga4.completados.map((t) => t.id),
    ];
    expect(new Set(todosLosIds).size).toBe(todosLosIds.length);
  });
});

describe("Controlador: GET /api/trips/driver con Clasificación y Filtros", () => {
  test("responde con objeto clasificado cuando se pasa ?classified=true", async () => {
    const mockClassified = {
      activos: [{ id: 1, estado: "programado" }],
      cancelados: [],
      completados: [{ id: 2, estado: "finalizado" }],
    };

    jest.spyOn(tripService, "listByDriver").mockResolvedValue(mockClassified);

    const res = createMockRes();
    await tripController.listByDriver(
      { user: { id: 7 }, query: { classified: "true" } },
      res
    );

    expect(tripService.listByDriver).toHaveBeenCalledWith(7, {
      estado: undefined,
      classified: true,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockClassified);
  });

  test("responde con lista plana { trips: [...] } por defecto sin parámetro classified", async () => {
    const mockTrips = [
      { id: 1, estado: "programado" },
      { id: 2, estado: "finalizado" },
    ];

    jest.spyOn(tripService, "listByDriver").mockResolvedValue(mockTrips);

    const res = createMockRes();
    await tripController.listByDriver(
      { user: { id: 7 }, query: {} },
      res
    );

    expect(tripService.listByDriver).toHaveBeenCalledWith(7, {
      estado: undefined,
      classified: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ trips: mockTrips });
  });

  test("permite filtrar por estado específico (?estado=programado)", async () => {
    const mockFiltered = [{ id: 1, estado: "programado" }];
    jest.spyOn(tripService, "listByDriver").mockResolvedValue(mockFiltered);

    const res = createMockRes();
    await tripController.listByDriver(
      { user: { id: 7 }, query: { estado: "programado" } },
      res
    );

    expect(tripService.listByDriver).toHaveBeenCalledWith(7, {
      estado: "programado",
      classified: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ trips: mockFiltered });
  });

  test("maneja errores del servicio devolviendo el statusCode correspondiente", async () => {
    const error500 = new Error("Fallo de conexión en base de datos");
    error500.statusCode = 500;
    jest.spyOn(tripService, "listByDriver").mockRejectedValue(error500);

    const res = createMockRes();
    await tripController.listByDriver({ user: { id: 7 }, query: {} }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Fallo de conexión en base de datos",
    });
  });
});

describe("Modelo: tripModel.findByDriver con Filtros de Estado", () => {
  test("aplica filtro de activos a nivel SQL cuando options.estado es 'activos'", async () => {
    db.queueResult({ recordset: [] });

    await tripModel.findByDriver(12, { estado: "activos" });

    expect(db.requests).toHaveLength(1);
    expect(db.requests[0].text).toMatch(/AND LOWER\(v\.estado\) IN \('programado', 'en_curso', 'activo'\)/);
  });

  test("aplica filtro de cancelados a nivel SQL cuando options.estado es 'cancelados'", async () => {
    db.queueResult({ recordset: [] });

    await tripModel.findByDriver(12, { estado: "cancelados" });

    expect(db.requests[0].text).toMatch(/AND LOWER\(v\.estado\) = 'cancelado'/);
  });

  test("aplica filtro de completados a nivel SQL cuando options.estado es 'completados'", async () => {
    db.queueResult({ recordset: [] });

    await tripModel.findByDriver(12, { estado: "completados" });

    expect(db.requests[0].text).toMatch(/AND LOWER\(v\.estado\) = 'finalizado'/);
  });

  test("sin options.estado no agrega condición WHERE adicional para estado", async () => {
    db.queueResult({ recordset: [] });

    await tripModel.findByDriver(12);

    expect(db.requests[0].text).not.toMatch(/LOWER\(v\.estado\)/);
  });
});
