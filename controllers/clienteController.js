// Controlador para cliente
const db = require("../config/dbConfig")

// Dashboard de cliente
exports.dashboard = async (req, res) => {
  try {
    const clienteID = await obtenerClienteID(req.session.usuario.id)

    if (!clienteID) {
      req.flash("error", "No se encontró el perfil de cliente")
      return res.redirect("/")
    }

    // Obtener reservas recientes
    const queryReservas = `
      SELECT TOP 5 r.ReservaID, r.EstadoReserva, r.TotalEstadia, s.NombreSucursal,
             MIN(hr.FechaInicio) AS FechaInicio, MAX(hr.FechaFin) AS FechaFin
      FROM Reservas r
      INNER JOIN HabitacionesReservas hr ON r.ReservaID = hr.ReservaID
      INNER JOIN Sucursales s ON r.SucursalID = s.SucursalID
      WHERE r.ClienteID = @param0
      GROUP BY r.ReservaID, r.EstadoReserva, r.TotalEstadia, s.NombreSucursal
      ORDER BY MIN(hr.FechaInicio) DESC
    `

    const resultReservas = await db.ejecutarQuery(queryReservas, [{ valor: clienteID }])

    // Obtener habitaciones disponibles para mostrar algunas opciones
    const queryHabitaciones = `
      SELECT TOP 4 h.HabitacionID, h.NumeroHabitacion, s.NombreSucursal, 
             t.NombreTipo, t.Capacidad, t.PrecioPorNoche, t.Descripcion
      FROM Habitaciones h
      INNER JOIN Sucursales s ON h.SucursalID = s.SucursalID
      INNER JOIN TipoHabitaciones t ON h.TipoHabitacionID = t.TipoHabitacionID
      WHERE h.Estado = 'Disponible'
      ORDER BY NEWID()
    `

    const resultHabitaciones = await db.ejecutarQuery(queryHabitaciones)

    res.render("cliente/dashboard", {
      titulo: "Mi Panel",
      reservas: resultReservas.recordset,
      habitaciones: resultHabitaciones.recordset,
    })
  } catch (error) {
    console.error("Error en dashboard cliente:", error)
    req.flash("error", "Error al cargar el dashboard")
    res.redirect("/")
  }
}

// Buscar habitaciones disponibles
exports.buscarHabitaciones = async (req, res) => {
  const { sucursal, fechaInicio, fechaFin, capacidad } = req.query

  try {
    // Obtener sucursales para el formulario de búsqueda
    const querySucursales = `SELECT SucursalID, NombreSucursal FROM Sucursales`
    const resultSucursales = await db.ejecutarQuery(querySucursales)

    // Si no hay parámetros de búsqueda, mostrar solo el formulario
    if (!fechaInicio || !fechaFin) {
      return res.render("cliente/buscar-habitaciones", {
        titulo: "Buscar Habitaciones",
        sucursales: resultSucursales.recordset,
        habitaciones: [],
        filtros: {},
      })
    }

    // Consulta para buscar habitaciones disponibles
    let queryHabitaciones = `
      SELECT h.HabitacionID, h.NumeroHabitacion, s.NombreSucursal, s.SucursalID,
             t.NombreTipo, t.Capacidad, t.PrecioPorNoche, t.Descripcion
      FROM Habitaciones h
      INNER JOIN Sucursales s ON h.SucursalID = s.SucursalID
      INNER JOIN TipoHabitaciones t ON h.TipoHabitacionID = t.TipoHabitacionID
      WHERE h.Estado = 'Disponible'
      AND h.HabitacionID NOT IN (
        SELECT hr.HabitacionID
        FROM HabitacionesReservas hr
        WHERE (hr.FechaInicio <= @param1 AND hr.FechaFin >= @param0)
      )
    `

    const params = [{ valor: fechaInicio }, { valor: fechaFin }]

    if (sucursal) {
      queryHabitaciones += ` AND s.SucursalID = @param${params.length}`
      params.push({ valor: sucursal })
    }

    if (capacidad) {
      queryHabitaciones += ` AND t.Capacidad >= @param${params.length}`
      params.push({ valor: capacidad })
    }

    queryHabitaciones += ` ORDER BY t.PrecioPorNoche`

    const resultHabitaciones = await db.ejecutarQuery(queryHabitaciones, params)

    // Calcular número de noches para mostrar precio total
    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    const numNoches = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24))

    res.render("cliente/buscar-habitaciones", {
      titulo: "Buscar Habitaciones",
      sucursales: resultSucursales.recordset,
      habitaciones: resultHabitaciones.recordset,
      numNoches: numNoches,
      filtros: {
        sucursal,
        fechaInicio,
        fechaFin,
        capacidad,
      },
    })
  } catch (error) {
    console.error("Error al buscar habitaciones:", error)
    req.flash("error", "Error al buscar habitaciones")
    res.redirect("/cliente/dashboard")
  }
}

// Mostrar formulario para crear reserva
exports.mostrarFormularioReserva = async (req, res) => {
  const { habitacionID, fechaInicio, fechaFin } = req.query

  if (!habitacionID || !fechaInicio || !fechaFin) {
    req.flash("error", "Datos incompletos para la reserva")
    return res.redirect("/cliente/buscar-habitaciones")
  }

  try {
    // Obtener información de la habitación
    const queryHabitacion = `
      SELECT h.HabitacionID, h.NumeroHabitacion, s.SucursalID, s.NombreSucursal,
             t.NombreTipo, t.Capacidad, t.PrecioPorNoche, t.Descripcion
      FROM Habitaciones h
      INNER JOIN Sucursales s ON h.SucursalID = s.SucursalID
      INNER JOIN TipoHabitaciones t ON h.TipoHabitacionID = t.TipoHabitacionID
      WHERE h.HabitacionID = @param0
    `

    const resultHabitacion = await db.ejecutarQuery(queryHabitacion, [{ valor: habitacionID }])

    if (resultHabitacion.recordset.length === 0) {
      req.flash("error", "Habitación no encontrada")
      return res.redirect("/cliente/buscar-habitaciones")
    }

    const habitacion = resultHabitacion.recordset[0]

    // Obtener servicios adicionales disponibles
    const queryServicios = `
      SELECT sa.ServicioID, sa.NombreServicio, sa.Precio
      FROM ServiciosAdicionales sa
      INNER JOIN ServiciosPorDepartamento spd ON sa.ServicioID = spd.ServicioID
      INNER JOIN DepartamentosServicios ds ON spd.DepartamentoID = ds.DepartamentoID
      WHERE ds.SucursalID = @param0
      ORDER BY sa.NombreServicio
    `

    const resultServicios = await db.ejecutarQuery(queryServicios, [{ valor: habitacion.SucursalID }])

    // Calcular número de noches y precio total de la estancia
    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    const numNoches = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24))
    const precioTotal = numNoches * habitacion.PrecioPorNoche

    res.render("cliente/crear-reserva", {
      titulo: "Crear Reserva",
      habitacion: habitacion,
      servicios: resultServicios.recordset,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      numNoches: numNoches,
      precioTotal: precioTotal,
    })
  } catch (error) {
    console.error("Error al mostrar formulario de reserva:", error)
    req.flash("error", "Error al cargar el formulario de reserva")
    res.redirect("/cliente/buscar-habitaciones")
  }
}

// Crear reserva
exports.crearReserva = async (req, res) => {
  const {
    habitacionID,
    sucursalID,
    fechaInicio,
    fechaFin,
    horaInicio,
    horaFin,
    precioTotal,
    servicios, // Array de IDs de servicios seleccionados
  } = req.body

  try {
    const clienteID = await obtenerClienteID(req.session.usuario.id)

    if (!clienteID) {
      req.flash("error", "No se encontró el perfil de cliente")
      return res.redirect("/cliente/dashboard")
    }

    // Iniciar transacción
    const pool = await db.conectar()
    const transaction = new db.sql.Transaction(pool)
    await transaction.begin()

    try {
      // 1. Crear la reserva
      const queryReserva = `
        INSERT INTO Reservas (ClienteID, SucursalID, EstadoReserva, TotalEstadia)
        OUTPUT INSERTED.ReservaID
        VALUES (@param0, @param1, 'Pendiente', @param2)
      `

      const requestReserva = new db.sql.Request(transaction)
      requestReserva.input("param0", clienteID)
      requestReserva.input("param1", sucursalID)
      requestReserva.input("param2", precioTotal)

      const resultReserva = await requestReserva.query(queryReserva)
      const reservaID = resultReserva.recordset[0].ReservaID

      // 2. Asignar habitación a la reserva
      const queryHabitacionReserva = `
        INSERT INTO HabitacionesReservas (HabitacionID, ReservaID, FechaInicio, FechaFin, HoraInicio, HoraFin)
        VALUES (@param0, @param1, @param2, @param3, @param4, @param5)
      `

      const requestHabitacionReserva = new db.sql.Request(transaction)
      requestHabitacionReserva.input("param0", habitacionID)
      requestHabitacionReserva.input("param1", reservaID)
      requestHabitacionReserva.input("param2", fechaInicio)
      requestHabitacionReserva.input("param3", fechaFin)
      requestHabitacionReserva.input("param4", horaInicio)
      requestHabitacionReserva.input("param5", horaFin)

      await requestHabitacionReserva.query(queryHabitacionReserva)

      // 3. Agregar servicios adicionales si se seleccionaron
      if (servicios && servicios.length > 0) {
        for (const servicioID of servicios) {
          const queryConsumoServicio = `
            INSERT INTO ConsumoServicios (ReservaID, ServicioID, FechaConsumo, Cantidad)
            VALUES (@param0, @param1, GETDATE(), 1)
          `

          const requestConsumoServicio = new db.sql.Request(transaction)
          requestConsumoServicio.input("param0", reservaID)
          requestConsumoServicio.input("param1", servicioID)

          await requestConsumoServicio.query(queryConsumoServicio)
        }
      }

      // Confirmar transacción
      await transaction.commit()

      req.flash("exito", "Reserva creada exitosamente")
      res.redirect(`/cliente/mis-reservas`)
    } catch (error) {
      // Revertir transacción en caso de error
      await transaction.rollback()
      console.error("Error en creación de reserva:", error)
      req.flash("error", "Error al crear la reserva")
      res.redirect("/cliente/buscar-habitaciones")
    }
  } catch (error) {
    console.error("Error en creación de reserva:", error)
    req.flash("error", "Error al crear la reserva")
    res.redirect("/cliente/buscar-habitaciones")
  }
}

// Listar reservas del cliente
exports.listarReservas = async (req, res) => {
  try {
    const clienteID = await obtenerClienteID(req.session.usuario.id)

    if (!clienteID) {
      req.flash("error", "No se encontró el perfil de cliente")
      return res.redirect("/cliente/dashboard")
    }

    const query = `
      SELECT r.ReservaID, r.EstadoReserva, r.TotalEstadia, s.NombreSucursal,
             MIN(hr.FechaInicio) AS FechaInicio, MAX(hr.FechaFin) AS FechaFin
      FROM Reservas r
      INNER JOIN HabitacionesReservas hr ON r.ReservaID = hr.ReservaID
      INNER JOIN Sucursales s ON r.SucursalID = s.SucursalID
      WHERE r.ClienteID = @param0
      GROUP BY r.ReservaID, r.EstadoReserva, r.TotalEstadia, s.NombreSucursal
      ORDER BY MIN(hr.FechaInicio) DESC
    `

    const result = await db.ejecutarQuery(query, [{ valor: clienteID }])

    res.render("cliente/mis-reservas", {
      titulo: "Mis Reservas",
      reservas: result.recordset,
    })
  } catch (error) {
    console.error("Error al listar reservas:", error)
    req.flash("error", "Error al cargar las reservas")
    res.redirect("/cliente/dashboard")
  }
}

// Ver detalle de reserva
exports.verReserva = async (req, res) => {
  const { id } = req.params

  try {
    const clienteID = await obtenerClienteID(req.session.usuario.id)

    if (!clienteID) {
      req.flash("error", "No se encontró el perfil de cliente")
      return res.redirect("/cliente/dashboard")
    }

    // Verificar que la reserva pertenezca al cliente
    const queryVerificar = `
      SELECT ReservaID
      FROM Reservas
      WHERE ReservaID = @param0 AND ClienteID = @param1
    `

    const resultVerificar = await db.ejecutarQuery(queryVerificar, [{ valor: id }, { valor: clienteID }])

    if (resultVerificar.recordset.length === 0) {
      req.flash("error", "Reserva no encontrada")
      return res.redirect("/cliente/mis-reservas")
    }

    // Obtener detalles de la reserva
    const queryReserva = `
      SELECT r.ReservaID, r.EstadoReserva, r.TotalEstadia, s.NombreSucursal,
             c.RTN, p.PrimerNombre, p.PrimerApellido, p.Correo
      FROM Reservas r
      INNER JOIN Sucursales s ON r.SucursalID = s.SucursalID
      INNER JOIN Clientes c ON r.ClienteID = c.ClienteID
      INNER JOIN Personas p ON c.PersonaID = p.PersonaID
      WHERE r.ReservaID = @param0
    `

    const resultReserva = await db.ejecutarQuery(queryReserva, [{ valor: id }])

    if (resultReserva.recordset.length === 0) {
      req.flash("error", "Reserva no encontrada")
      return res.redirect("/cliente/mis-reservas")
    }

    const reserva = resultReserva.recordset[0]

    // Obtener habitaciones de la reserva
    const queryHabitaciones = `
      SELECT h.NumeroHabitacion, t.NombreTipo, t.Capacidad, t.PrecioPorNoche,
             hr.FechaInicio, hr.FechaFin, hr.HoraInicio, hr.HoraFin
      FROM HabitacionesReservas hr
      INNER JOIN Habitaciones h ON hr.HabitacionID = h.HabitacionID
      INNER JOIN TipoHabitaciones t ON h.TipoHabitacionID = t.TipoHabitacionID
      WHERE hr.ReservaID = @param0
    `

    const resultHabitaciones = await db.ejecutarQuery(queryHabitaciones, [{ valor: id }])

    // Obtener servicios adicionales
    const queryServicios = `
      SELECT sa.NombreServicio, sa.Precio, cs.Cantidad
      FROM ConsumoServicios cs
      INNER JOIN ServiciosAdicionales sa ON cs.ServicioID = sa.ServicioID
      WHERE cs.ReservaID = @param0
    `

    const resultServicios = await db.ejecutarQuery(queryServicios, [{ valor: id }])

    // Obtener factura si existe
    const queryFactura = `
      SELECT f.FacturaID, f.NumeroFactura, f.FechaEmision, f.SubTotal, f.ISV, f.Total
      FROM Facturas f
      WHERE f.ReservaID = @param0
    `

    const resultFactura = await db.ejecutarQuery(queryFactura, [{ valor: id }])

    res.render("cliente/detalle-reserva", {
      titulo: "Detalle de Reserva",
      reserva: reserva,
      habitaciones: resultHabitaciones.recordset,
      servicios: resultServicios.recordset,
      factura: resultFactura.recordset.length > 0 ? resultFactura.recordset[0] : null,
    })
  } catch (error) {
    console.error("Error al ver detalle de reserva:", error)
    req.flash("error", "Error al cargar los detalles de la reserva")
    res.redirect("/cliente/mis-reservas")
  }
}

// Cancelar reserva
exports.cancelarReserva = async (req, res) => {
  const { id } = req.params

  try {
    const clienteID = await obtenerClienteID(req.session.usuario.id)

    if (!clienteID) {
      req.flash("error", "No se encontró el perfil de cliente")
      return res.redirect("/cliente/dashboard")
    }

    // Verificar que la reserva pertenezca al cliente y esté en estado Pendiente
    const queryVerificar = `
      SELECT ReservaID
      FROM Reservas
      WHERE ReservaID = @param0 AND ClienteID = @param1 AND EstadoReserva = 'Pendiente'
    `

    const resultVerificar = await db.ejecutarQuery(queryVerificar, [{ valor: id }, { valor: clienteID }])

    if (resultVerificar.recordset.length === 0) {
      req.flash("error", "No se puede cancelar esta reserva")
      return res.redirect("/cliente/mis-reservas")
    }

    // Actualizar estado de la reserva
    const query = `
      UPDATE Reservas
      SET EstadoReserva = 'Cancelada'
      WHERE ReservaID = @param0
    `

    await db.ejecutarQuery(query, [{ valor: id }])

    req.flash("exito", "Reserva cancelada exitosamente")
    res.redirect("/cliente/mis-reservas")
  } catch (error) {
    console.error("Error al cancelar reserva:", error)
    req.flash("error", "Error al cancelar la reserva")
    res.redirect("/cliente/mis-reservas")
  }
}

// Listar facturas del cliente
exports.listarFacturas = async (req, res) => {
  try {
    const clienteID = await obtenerClienteID(req.session.usuario.id)

    if (!clienteID) {
      req.flash("error", "No se encontró el perfil de cliente")
      return res.redirect("/cliente/dashboard")
    }

    const query = `
      SELECT f.FacturaID, f.NumeroFactura, f.FechaEmision, f.SubTotal, f.ISV, f.Total,
             s.NombreSucursal, r.ReservaID
      FROM Facturas f
      INNER JOIN Reservas r ON f.ReservaID = r.ReservaID
      INNER JOIN Sucursales s ON f.SucursalID = s.SucursalID
      WHERE r.ClienteID = @param0
      ORDER BY f.FechaEmision DESC
    `

    const result = await db.ejecutarQuery(query, [{ valor: clienteID }])

    res.render("cliente/facturas", {
      titulo: "Mis Facturas",
      facturas: result.recordset,
    })
  } catch (error) {
    console.error("Error al listar facturas:", error)
    req.flash("error", "Error al cargar las facturas")
    res.redirect("/cliente/dashboard")
  }
}

// Ver factura
exports.verFactura = async (req, res) => {
  const { id } = req.params

  try {
    const clienteID = await obtenerClienteID(req.session.usuario.id)

    if (!clienteID) {
      req.flash("error", "No se encontró el perfil de cliente")
      return res.redirect("/cliente/dashboard")
    }

    // Verificar que la factura pertenezca al cliente
    const queryVerificar = `
      SELECT f.FacturaID
      FROM Facturas f
      INNER JOIN Reservas r ON f.ReservaID = r.ReservaID
      WHERE f.FacturaID = @param0 AND r.ClienteID = @param1
    `

    const resultVerificar = await db.ejecutarQuery(queryVerificar, [{ valor: id }, { valor: clienteID }])

    if (resultVerificar.recordset.length === 0) {
      req.flash("error", "Factura no encontrada")
      return res.redirect("/cliente/facturas")
    }

    // Obtener detalles de la factura
    const queryFactura = `
      SELECT f.FacturaID, f.NumeroFactura, f.FechaEmision, f.SubTotal, f.ISV, f.Total,
             s.NombreSucursal, s.Direccion AS DireccionSucursal, s.Telefono AS TelefonoSucursal,
             c.RTN, p.PrimerNombre, p.PrimerApellido, p.Correo,
             cai.CAICode
      FROM Facturas f
      INNER JOIN Reservas r ON f.ReservaID = r.ReservaID
      INNER JOIN Sucursales s ON f.SucursalID = s.SucursalID
      INNER JOIN Clientes c ON r.ClienteID = c.ClienteID
      INNER JOIN Personas p ON c.PersonaID = p.PersonaID
      INNER JOIN CAIControl cai ON f.CAIID = cai.CAIID
      WHERE f.FacturaID = @param0
    `

    const resultFactura = await db.ejecutarQuery(queryFactura, [{ valor: id }])

    if (resultFactura.recordset.length === 0) {
      req.flash("error", "Factura no encontrada")
      return res.redirect("/cliente/facturas")
    }

    const factura = resultFactura.recordset[0]

    // Obtener detalles de la reserva (habitaciones)
    const queryHabitaciones = `
      SELECT h.NumeroHabitacion, t.NombreTipo, t.PrecioPorNoche,
             DATEDIFF(DAY, hr.FechaInicio, hr.FechaFin) AS NumNoches,
             t.PrecioPorNoche * DATEDIFF(DAY, hr.FechaInicio, hr.FechaFin) AS Subtotal
      FROM HabitacionesReservas hr
      INNER JOIN Habitaciones h ON hr.HabitacionID = h.HabitacionID
      INNER JOIN TipoHabitaciones t ON h.TipoHabitacionID = t.TipoHabitacionID
      INNER JOIN Reservas r ON hr.ReservaID = r.ReservaID
      INNER JOIN Facturas f ON r.ReservaID = f.ReservaID
      WHERE f.FacturaID = @param0
    `

    const resultHabitaciones = await db.ejecutarQuery(queryHabitaciones, [{ valor: id }])

    // Obtener servicios adicionales
    const queryServicios = `
      SELECT sa.NombreServicio, sa.Precio, cs.Cantidad, sa.Precio * cs.Cantidad AS Subtotal
      FROM ConsumoServicios cs
      INNER JOIN ServiciosAdicionales sa ON cs.ServicioID = sa.ServicioID
      INNER JOIN Reservas r ON cs.ReservaID = r.ReservaID
      INNER JOIN Facturas f ON r.ReservaID = f.ReservaID
      WHERE f.FacturaID = @param0
    `

    const resultServicios = await db.ejecutarQuery(queryServicios, [{ valor: id }])

    res.render("cliente/ver-factura", {
      titulo: "Ver Factura",
      factura: factura,
      habitaciones: resultHabitaciones.recordset,
      servicios: resultServicios.recordset,
    })
  } catch (error) {
    console.error("Error al ver factura:", error)
    req.flash("error", "Error al cargar los detalles de la factura")
    res.redirect("/cliente/facturas")
  }
}

// Función auxiliar para obtener el ClienteID a partir del UsuarioID
async function obtenerClienteID(usuarioID) {
  try {
    const query = `
      SELECT c.ClienteID
      FROM Clientes c
      INNER JOIN Personas p ON c.PersonaID = p.PersonaID
      INNER JOIN Usuarios u ON p.PersonaID = u.PersonaID
      WHERE u.UsuarioID = @param0
    `

    const result = await db.ejecutarQuery(query, [{ valor: usuarioID }])

    if (result.recordset.length === 0) {
      return null
    }

    return result.recordset[0].ClienteID
  } catch (error) {
    console.error("Error al obtener ClienteID:", error)
    return null
  }
}

