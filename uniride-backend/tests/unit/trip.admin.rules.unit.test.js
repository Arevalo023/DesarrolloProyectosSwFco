/**
 * Pruebas unitarias de consulta de viajes y cancelación administrativa.
 * Issue #154: Pruebas de viajes y cancelación (BE) — HU-09.
 *
 * Complementa trip.admin.query.unit.test.js (#147) y trip.admin.cancel.unit.test.js (#149)
 * cubriendo los casos que esas suites no verifican.
 *
 * Criterios de aceptación cubiertos:
 *  1. Filtros (estado, fecha, conductor) y paginación del listado de viajes.
 *  2. Solo se cancelan viajes programados; los demás estados se rechazan sin modificar datos.
 *  3. El motivo de cancelación es obligatorio (también a nivel servicio).
 *  4. Solo se notifica a pasajeros con reservación aceptada, sin duplicados.
 */

jest.mock("../../config/db", () => require("../helpers/mockDb").module);

const request = require("supertest");
const jwt = require("jsonwebtoken");

const db = require("../helpers/mockDb");
const app = require("../../app");
const tripModel = require("../../models/tripModel");
const tripService = require("../../services/tripService");
const notificationService = require("../../services/notificationService");
const notificationModel = require("../../models/notificationModel");
const auditService = require("../../services/auditService");

const tokenFor = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "uniride_default_secret_key", {
    expiresIn: "1h",
  });

const adminToken = tokenFor({ id: 1, roles: ["Administrador"], rol: "Administrador" });

const programmedTrip = {
  id: 30,
  conductor_id: 5,
  origen: "Campus Arteaga",
  destino: "Rectoría",
  fecha_salida: new Date("2026-11-10T08:00:00Z"),
  estado: "programado",
};

const cancelledTripRow = {
  ...programmedTrip,
  vehiculo_id: 2,
  cupo_disponible: 3,
  costo_por_pasajero: 20,
  estado: "cancelado",
  motivo_cancelacion: "Contingencia climática",
};

/** Encola las 4 respuestas de una cancelación administrativa exitosa. */
const queueSuccessfulCancel = (acceptedReservations) => {
  db.queueResult({ recordset: [programmedTrip] }); // SELECT viaje
  db.queueResult({ recordset: acceptedReservations }); // SELECT aceptadas
  db.queueResult({ recordset: [cancelledTripRow] }); // UPDATE Viajes
  db.queueResult({ recordset: [], rowsAffected: [acceptedReservations.length] }); // UPDATE SolicitudesViaje
};

beforeEach(() => {
  db.reset();
  jest.restoreAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

/* ------------------------------------------------------------------ */
/* 1. Filtros y paginación del listado                                  */
/* ------------------------------------------------------------------ */

describe("Listado de viajes — filtros por estado (tripModel.findAllAdmin)", () => {
  const aliases = [
    ["activos", "LOWER(v.estado) IN ('programado', 'en_curso', 'activo')"],
    ["activo", "LOWER(v.estado) IN ('programado', 'en_curso', 'activo')"],
    ["cancelados", "LOWER(v.estado) = 'cancelado'"],
    ["cancelado", "LOWER(v.estado) = 'cancelado'"],
    ["completados", "LOWER(v.estado) = 'finalizado'"],
    ["finalizado", "LOWER(v.estado) = 'finalizado'"],
    ["historial", "LOWER(v.estado) IN ('cancelado', 'finalizado')"],
  ];

  test.each(aliases)("estado=%s se traduce a una condición fija sin parámetro", async (estado, clause) => {
    db.queueResult({ recordset: [{ total: 0 }] });

    await tripModel.findAllAdmin({ estado });

    const countReq = db.requests[0];
    expect(countReq.text).toContain(clause);
    expect(countReq.inputs).not.toHaveProperty("estadoFiltro");
  });

  test("el alias de estado no distingue mayúsculas ni espacios", async () => {
    db.queueResult({ recordset: [{ total: 0 }] });

    await tripModel.findAllAdmin({ estado: "  CANCELADOS " });

    expect(db.requests[0].text).toContain("LOWER(v.estado) = 'cancelado'");
  });

  test("un estado no reconocido se filtra con parámetro (sin interpolar en el SQL)", async () => {
    db.queueResult({ recordset: [{ total: 0 }] });

    await tripModel.findAllAdmin({ estado: "En_Curso" });

    const countReq = db.requests[0];
    expect(countReq.text).toContain("LOWER(v.estado) = LOWER(@estadoFiltro)");
    expect(countReq.text).not.toContain("en_curso'");
    expect(countReq.inputs.estadoFiltro.value).toBe("en_curso");
    expect(countReq.inputs.estadoFiltro.type).toEqual({ name: "VarChar", length: 50 });
  });
});

describe("Listado de viajes — filtros por fecha y conductor (tripModel.findAllAdmin)", () => {
  test("fecha filtra por el día de salida con tipo Date", async () => {
    db.queueResult({ recordset: [{ total: 0 }] });

    await tripModel.findAllAdmin({ fecha: "2026-11-10" });

    const countReq = db.requests[0];
    expect(countReq.text).toContain("CAST(v.fecha_salida AS DATE) = @fechaFiltro");
    expect(countReq.inputs.fechaFiltro).toEqual({ type: { name: "Date" }, value: "2026-11-10" });
  });

  test("conductor por texto busca por nombre, apellido, nombre completo y correo", async () => {
    db.queueResult({ recordset: [{ total: 0 }] });

    await tripModel.findAllAdmin({ conductor: "gomez" });

    const { text, inputs } = db.requests[0];
    expect(text).toContain("u.nombre LIKE @conductorFiltro");
    expect(text).toContain("u.apellido LIKE @conductorFiltro");
    expect(text).toContain("(u.nombre + ' ' + u.apellido) LIKE @conductorFiltro");
    expect(text).toContain("u.correo LIKE @conductorFiltro");
    expect(inputs.conductorFiltro.value).toBe("%gomez%");
    expect(inputs).not.toHaveProperty("conductorIdFiltro");
  });

  test("conductor escapa comodines de LIKE (%, _ y [)", async () => {
    db.queueResult({ recordset: [{ total: 0 }] });

    await tripModel.findAllAdmin({ conductor: "100%_a[b" });

    expect(db.requests[0].inputs.conductorFiltro.value).toBe("%100\\%\\_a\\[b%");
  });

  test("combina estado, fecha y conductor con AND", async () => {
    db.queueResult({ recordset: [{ total: 0 }] });

    await tripModel.findAllAdmin({ estado: "cancelados", fecha: "2026-11-10", conductor: "7" });

    const { text, inputs } = db.requests[0];
    expect(text).toMatch(
      /WHERE LOWER\(v\.estado\) = 'cancelado' AND CAST\(v\.fecha_salida AS DATE\) = @fechaFiltro AND v\.conductor_id = @conductorIdFiltro/
    );
    expect(inputs.conductorIdFiltro.value).toBe(7);
  });
});

describe("Listado de viajes — paginación (tripModel.findAllAdmin)", () => {
  test("la consulta de página usa OFFSET/FETCH con offset y limit como Int", async () => {
    db.queueResult({ recordset: [{ total: 60 }] });
    db.queueResult({ recordset: [] });

    const result = await tripModel.findAllAdmin({ limit: 20, offset: 40 });

    expect(result.total).toBe(60);
    const pageReq = db.requests[1];
    expect(pageReq.text).toContain("ORDER BY v.fecha_salida DESC, v.id DESC");
    expect(pageReq.text).toContain("OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY");
    expect(pageReq.inputs.offset).toEqual({ type: { name: "Int" }, value: 40 });
    expect(pageReq.inputs.limit).toEqual({ type: { name: "Int" }, value: 20 });
  });

  test("los mismos filtros se aplican al conteo y a la página", async () => {
    db.queueResult({ recordset: [{ total: 1 }] });
    db.queueResult({ recordset: [] });

    await tripModel.findAllAdmin({ estado: "en_curso", fecha: "2026-11-10", conductor: "ana", limit: 5, offset: 0 });

    const [countReq, pageReq] = db.requests;
    for (const name of ["estadoFiltro", "fechaFiltro", "conductorFiltro"]) {
      expect(pageReq.inputs[name]).toEqual(countReq.inputs[name]);
    }
    const whereOf = (text) => {
      const flat = text.replace(/\s+/g, " ");
      const start = flat.lastIndexOf("WHERE");
      const end = flat.indexOf("ORDER BY");
      return flat.slice(start, end === -1 ? undefined : end).trim();
    };
    expect(whereOf(pageReq.text)).toBe(whereOf(countReq.text));
  });

  test("si el conteo es 0 no consulta la página", async () => {
    db.queueResult({ recordset: [{ total: 0 }] });

    const result = await tripModel.findAllAdmin({ estado: "historial", limit: 20, offset: 0 });

    expect(result).toEqual({ trips: [], total: 0 });
    expect(db.requests).toHaveLength(1);
  });

  test("un viaje sin vehículo regresa vehiculo = null", async () => {
    db.queueResult({ recordset: [{ total: 1 }] });
    db.queueResult({
      recordset: [{ id: 1, conductor_id: 5, vehiculo_id: null, costo_por_pasajero: "15.50", total_reservaciones: null }],
    });

    const { trips } = await tripModel.findAllAdmin({});

    expect(trips[0].vehiculo).toBeNull();
    expect(trips[0].costo_por_pasajero).toBe(15.5);
    expect(trips[0].total_reservaciones).toBe(0);
  });
});

describe("Listado de viajes — paginación (tripService.listTripsAdmin)", () => {
  test("limita el tamaño de página a 50 aunque se pida más", async () => {
    const spy = jest.spyOn(tripModel, "findAllAdmin").mockResolvedValue({ trips: [], total: 0 });

    const result = await tripService.listTripsAdmin({ limit: "500" });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ limit: 50, offset: 0 }));
    expect(result.paginacion.limite).toBe(50);
  });

  test("redondea total_paginas hacia arriba", async () => {
    jest.spyOn(tripModel, "findAllAdmin").mockResolvedValue({ trips: [], total: 41 });

    const result = await tripService.listTripsAdmin({ limit: "20" });

    expect(result.paginacion.total_paginas).toBe(3);
  });

  test("una página posterior a la última devuelve lista vacía con el total real", async () => {
    const spy = jest.spyOn(tripModel, "findAllAdmin").mockResolvedValue({ trips: [], total: 45 });

    const result = await tripService.listTripsAdmin({ page: "9", limit: "10" });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ offset: 80 }));
    expect(result.viajes).toEqual([]);
    expect(result.paginacion).toEqual({ pagina: 9, limite: 10, total: 45, total_paginas: 5 });
  });

  test("recorta espacios de los filtros antes de llegar al modelo", async () => {
    const spy = jest.spyOn(tripModel, "findAllAdmin").mockResolvedValue({ trips: [], total: 0 });

    await tripService.listTripsAdmin({ estado: " programado ", fecha: " 2026-11-10 ", conductor: "  ana " });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ estado: "programado", fecha: "2026-11-10", conductor: "ana" })
    );
  });
});

describe("GET /api/trips/admin — los filtros llegan del query string al servicio", () => {
  test("pasa estado, fecha, conductor, page y limit", async () => {
    const spy = jest.spyOn(tripModel, "findAllAdmin").mockResolvedValue({ trips: [], total: 25 });

    const res = await request(app)
      .get("/api/trips/admin?estado=cancelados&fecha=2026-11-10&conductor=ana&page=2&limit=10")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith({
      estado: "cancelados",
      fecha: "2026-11-10",
      conductor: "ana",
      limit: 10,
      offset: 10,
    });
    expect(res.body.paginacion).toEqual({ pagina: 2, limite: 10, total: 25, total_paginas: 3 });
  });
});

/* ------------------------------------------------------------------ */
/* 2. Solo se cancelan viajes programados                               */
/* ------------------------------------------------------------------ */

describe("Cancelación — solo viajes programados (tripModel.cancelAdmin)", () => {
  const rejected = [
    ["en_curso", /en curso/],
    ["en curso", /en curso/],
    ["finalizado", /ha finalizado/],
    ["completado", /ha finalizado/],
    ["cancelado", /ya se encuentra cancelado/],
    ["Cancelado", /ya se encuentra cancelado/],
    ["activo", /Solo es posible cancelar viajes en estado 'programado'/],
    [null, /Solo es posible cancelar viajes en estado 'programado'/],
  ];

  test.each(rejected)("estado %p se rechaza con 400 sin ejecutar UPDATE", async (estado, message) => {
    db.queueResult({ recordset: [{ ...programmedTrip, estado }] });

    await expect(tripModel.cancelAdmin(30, "Motivo")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(message),
    });

    expect(db.requests).toHaveLength(1);
    expect(db.requests.some((r) => /UPDATE/i.test(r.text))).toBe(false);
    expect(db.lastTransaction).toMatchObject({ rolledBack: true, committed: false });
  });

  test("viaje inexistente → 404 sin modificar datos", async () => {
    db.queueResult({ recordset: [] });

    await expect(tripModel.cancelAdmin(999, "Motivo")).rejects.toMatchObject({ statusCode: 404 });
    expect(db.requests).toHaveLength(1);
    expect(db.lastTransaction.rolledBack).toBe(true);
  });

  test("'PROGRAMADO' con mayúsculas/espacios sí se cancela", async () => {
    db.queueResult({ recordset: [{ ...programmedTrip, estado: " PROGRAMADO " }] });
    db.queueResult({ recordset: [] });
    db.queueResult({ recordset: [cancelledTripRow] });
    db.queueResult({ recordset: [] });

    const result = await tripModel.cancelAdmin(30, "Motivo");

    expect(result.trip.estado).toBe("cancelado");
    expect(db.lastTransaction.committed).toBe(true);
  });

  test("programado: bloquea la fila, guarda el motivo y cancela pendientes y aceptadas", async () => {
    queueSuccessfulCancel([{ id: 1, viaje_id: 30, pasajero_id: 8, estado: "aceptada" }]);

    const result = await tripModel.cancelAdmin(30, "Contingencia climática");

    const [selectTrip, selectAccepted, updateTrip, updateReservations] = db.requests;
    expect(selectTrip.text).toMatch(/WITH \(UPDLOCK, ROWLOCK\)/);
    expect(selectAccepted.text).toMatch(/estado = 'aceptada'/);
    expect(updateTrip.text).toMatch(/SET estado = 'cancelado', motivo_cancelacion = @motivo_cancelacion/);
    expect(updateTrip.inputs.motivo_cancelacion).toEqual({
      type: { name: "VarChar", length: 250 },
      value: "Contingencia climática",
    });
    expect(updateReservations.text).toMatch(/estado IN \('pendiente', 'aceptada'\)/);
    expect(result.acceptedReservations).toHaveLength(1);
    expect(db.lastTransaction.committed).toBe(true);
  });

  test("un error de base de datos a media transacción hace rollback", async () => {
    db.queueResult({ recordset: [programmedTrip] });
    db.queueResult({ recordset: [] });
    db.queueResult(new Error("DEADLOCK"));

    await expect(tripModel.cancelAdmin(30, "Motivo")).rejects.toThrow("DEADLOCK");
    expect(db.lastTransaction).toMatchObject({ rolledBack: true, committed: false });
  });
});

describe("PATCH /api/trips/admin/:id/cancel — estados rechazados no notifican ni auditan", () => {
  test.each(["en_curso", "finalizado", "cancelado"])("estado %s → 400 sin notificación ni auditoría", async (estado) => {
    db.queueResult({ recordset: [{ ...programmedTrip, estado }] });
    const notifySpy = jest.spyOn(notificationService, "notifyTripCancelledByAdmin");
    const auditSpy = jest.spyOn(auditService, "logAction");

    const res = await request(app)
      .patch("/api/trips/admin/30/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: "Motivo válido" });

    expect(res.status).toBe(400);
    expect(notifySpy).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* 3. Motivo obligatorio                                                */
/* ------------------------------------------------------------------ */

describe("Cancelación — el motivo es obligatorio (tripService.cancelAdmin)", () => {
  test.each([undefined, null, "", "   ", 123])("motivo %p → 400 sin tocar la base de datos", async (motivo) => {
    const modelSpy = jest.spyOn(tripModel, "cancelAdmin");
    const notifySpy = jest.spyOn(notificationService, "notifyTripCancelledByAdmin");

    await expect(tripService.cancelAdmin(30, 1, motivo)).rejects.toMatchObject({
      statusCode: 400,
      message: "El motivo de cancelación es obligatorio.",
    });

    expect(modelSpy).not.toHaveBeenCalled();
    expect(notifySpy).not.toHaveBeenCalled();
  });

  test("recorta el motivo antes de guardarlo, notificarlo y auditarlo", async () => {
    const modelSpy = jest.spyOn(tripModel, "cancelAdmin").mockResolvedValue({
      trip: cancelledTripRow,
      acceptedReservations: [{ id: 1, viaje_id: 30, pasajero_id: 8, estado: "aceptada" }],
    });
    const notifySpy = jest.spyOn(notificationService, "notifyTripCancelledByAdmin").mockResolvedValue({});
    const auditSpy = jest.spyOn(auditService, "logAction");

    await tripService.cancelAdmin(30, 1, "  Lluvia  ");

    expect(modelSpy).toHaveBeenCalledWith(30, "Lluvia");
    expect(notifySpy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "Lluvia");
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ motivo: "Lluvia" }));
  });

  test("el motivo aparece en el mensaje de la notificación", async () => {
    const createSpy = jest.spyOn(notificationModel, "create").mockResolvedValue({ id: 1 });

    await notificationService.notifyTripCancelledByAdmin(
      { id: 1, viaje_id: 30, pasajero_id: 8 },
      programmedTrip,
      "Contingencia climática"
    );

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 8,
        tipo: "viaje_cancelado",
        mensaje: "La administración canceló el viaje de Campus Arteaga a Rectoría. Motivo: Contingencia climática",
      })
    );
  });
});

/* ------------------------------------------------------------------ */
/* 4. Notificación solo a aceptadas, sin duplicados                     */
/* ------------------------------------------------------------------ */

describe("Cancelación — notificaciones a pasajeros aceptados sin duplicados", () => {
  test("sin reservaciones aceptadas no se envía ninguna notificación", async () => {
    queueSuccessfulCancel([]);
    const notifySpy = jest.spyOn(notificationService, "notifyTripCancelledByAdmin");

    const res = await request(app)
      .patch("/api/trips/admin/30/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: "Sin pasajeros" });

    expect(res.status).toBe(200);
    expect(notifySpy).not.toHaveBeenCalled();
  });

  test("notifica una sola vez por pasajero aunque tenga varias reservaciones aceptadas", async () => {
    jest.spyOn(tripModel, "cancelAdmin").mockResolvedValue({
      trip: cancelledTripRow,
      acceptedReservations: [
        { id: 1, viaje_id: 30, pasajero_id: 8, estado: "aceptada" },
        { id: 2, viaje_id: 30, pasajero_id: 9, estado: "aceptada" },
        { id: 3, viaje_id: 30, pasajero_id: 8, estado: "aceptada" },
      ],
    });
    const notifySpy = jest.spyOn(notificationService, "notifyTripCancelledByAdmin").mockResolvedValue({});

    await tripService.cancelAdmin(30, 1, "Motivo");

    expect(notifySpy).toHaveBeenCalledTimes(2);
    const destinatarios = notifySpy.mock.calls.map(([reservation]) => reservation.pasajero_id);
    expect(destinatarios.sort()).toEqual([8, 9]);
  });

  test("ignora filas que no estén en estado aceptada si llegaran del modelo", async () => {
    jest.spyOn(tripModel, "cancelAdmin").mockResolvedValue({
      trip: cancelledTripRow,
      acceptedReservations: [
        { id: 1, viaje_id: 30, pasajero_id: 8, estado: "aceptada" },
        { id: 2, viaje_id: 30, pasajero_id: 9, estado: "pendiente" },
      ],
    });
    const notifySpy = jest.spyOn(notificationService, "notifyTripCancelledByAdmin").mockResolvedValue({});

    await tripService.cancelAdmin(30, 1, "Motivo");

    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy.mock.calls[0][0].pasajero_id).toBe(8);
  });

  test("repetir la cancelación no vuelve a notificar a los pasajeros", async () => {
    const notifySpy = jest.spyOn(notificationService, "notifyTripCancelledByAdmin").mockResolvedValue({});
    const accepted = [
      { id: 1, viaje_id: 30, pasajero_id: 8, estado: "aceptada" },
      { id: 2, viaje_id: 30, pasajero_id: 9, estado: "aceptada" },
    ];

    // Primera cancelación: viaje programado
    queueSuccessfulCancel(accepted);
    const first = await request(app)
      .patch("/api/trips/admin/30/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: "Contingencia climática" });

    // Segunda cancelación: el viaje ya está cancelado
    db.queueResult({ recordset: [{ ...programmedTrip, estado: "cancelado" }] });
    const second = await request(app)
      .patch("/api/trips/admin/30/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ motivo: "Contingencia climática" });

    expect(first.status).toBe(200);
    expect(second.status).toBe(400);
    expect(second.body.message).toBe("El viaje ya se encuentra cancelado.");
    expect(notifySpy).toHaveBeenCalledTimes(2);
  });
});
