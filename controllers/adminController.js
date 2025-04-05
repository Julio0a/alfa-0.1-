// Controlador para administrador
const db = require("../config/dbConfig")

// Dashboard de administrador
exports.dashboard = async (req, res) => {
  try {
    // Obtener estadísticas para el dashboard
    const queryHabitaciones = `
      SELECT 
        COUNT(*) AS TotalHabitaciones,
        SUM(CASE WHEN Estado = 'Disponible' THEN 1 ELSE 0 END) AS Disponibles,
        SUM(CASE WHEN Estado = 'Ocupada' THEN 1 ELSE 0 END) AS Ocupadas,
        SUM(CASE WHEN Estado = 'Mantenimiento' THEN 1 ELSE 0 END) AS Mantenimiento
      FROM Habitaciones
    `

    const queryReservas = `
      SELECT 
        COUNT(*) AS TotalReservas,
        SUM(CASE WHEN EstadoReserva = 'Pendiente' THEN 1 ELSE 0 END) AS Pendientes,
        SUM(CASE WHEN EstadoReserva = 'Confirmada' THEN 1 ELSE 0 END) AS Confirmadas,
        SUM(CASE WHEN EstadoReserva = 'Cancelada' THEN 1 ELSE 0 END) AS Canceladas,
        SUM(CASE WHEN EstadoReserva = 'Completada' THEN 1 ELSE 0 END) AS Completadas
      FROM Reservas
    `

    const queryFacturas = `
      SELECT 
        COUNT(*) AS TotalFacturas,
        SUM(Total) AS MontoTotal
      FROM Facturas
    `

    const resultHabitaciones = await db.ejecutarQuery(queryHabitaciones)
    const resultReservas = await db.ejecutarQuery(queryReservas)
    const resultFacturas = await db.ejecutarQuery(queryFacturas)

    const estadisticas = {
      habitaciones: resultHabitaciones.recordset[0],
      reservas: resultReservas.recordset[0],
      facturas: resultFacturas.recordset[0],
    }

    res.render("admin/dashboard", {
      titulo: "Panel de Administración",
      estadisticas,
    })
  } catch (error) {
    console.error("Error en dashboard admin:", error)
    req.flash("error", "Error al cargar el dashboard")
    res.redirect("/")
  }
}

// Listar habitaciones
exports.listarHabitaciones = async (req, res) => {
  try {
    const querySucursales = `SELECT SucursalID, NombreSucursal FROM Sucursales`
    const resultSucursales = await db.ejecutarQuery(querySucursales)

    const sucursalID = req.query.sucursal || ""
    const estado = req.query.estado || ""

    let queryHabitaciones = `
      SELECT h.HabitacionID, h.NumeroHabitacion, h.Estado, 
             s.NombreSucursal, t.NombreTipo, t.Capacidad, t.PrecioPorNoche
      FROM Habitaciones h
      INNER JOIN Sucursales s ON h.SucursalID = s.SucursalID
      INNER JOIN TipoHabitaciones t ON h.TipoHabitacionID = t.TipoHabitacionID
      WHERE 1=1
    `

    const params = []

    if (sucursalID) {
      queryHabitaciones += ` AND h.SucursalID = @param${params.length}`
      params.push({ valor: sucursalID })
    }

    if (estado) {
      queryHabitaciones += ` AND h.Estado = @param${params.length}`
      params.push({ valor: estado })
    }

    queryHabitaciones += ` ORDER BY s.NombreSucursal, h.NumeroHabitacion`

    const resultHabitaciones = await db.ejecutarQuery(queryHabitaciones, params)

    res.render("admin/habitaciones", {
      titulo: "Gestión de Habitaciones",
      habitaciones: resultHabitaciones.recordset,
      sucursales: resultSucursales.recordset,
      filtros: {
        sucursal: sucursalID,
        estado: estado,
      },
    })
  } catch (error) {
    console.error("Error al listar habitaciones:", error)
    req.flash("error", "Error al cargar las habitaciones")
    res.redirect("/admin/dashboard")
  }
}

// Mostrar formulario para crear habitación
exports.mostrarFormularioHabitacion = async (req, res) => {
  try {
    const querySucursales = `SELECT SucursalID, NombreSucursal FROM Sucursales`
    const queryTipos = `SELECT TipoHabitacionID, NombreTipo FROM TipoHabitaciones`

    const resultSucursales = await db.ejecutarQuery(querySucursales)
    const resultTipos = await db.ejecutarQuery(queryTipos)

    res.render("admin/habitacion-form", {
      titulo: "Nueva Habitación",
      habitacion: {},
      sucursales: resultSucursales.recordset,
      tipos: resultTipos.recordset,
      editar: false,
    })
  } catch (error) {
    console.error("Error al mostrar formulario de habitación:", error)
    req.flash("error", "Error al cargar el formulario")
    res.redirect("/admin/habitaciones")
  }
}

// Crear habitación
exports.crearHabitacion = async (req, res) => {
  const { sucursalID, numeroHabitacion, tipoHabitacionID, estado } = req.body

  try {
    const query = `
      INSERT INTO Habitaciones (SucursalID, NumeroHabitacion, TipoHabitacionID, Estado)
      VALUES (@param0, @param1, @param2, @param3)
    `

    await db.ejecutarQuery(query, [
      { valor: sucursalID },
      { valor: numeroHabitacion },
      { valor: tipoHabitacionID },
      { valor: estado },
    ])

    req.flash("exito", "Habitación creada exitosamente")
    res.redirect("/admin/habitaciones")
  } catch (error) {
    console.error("Error al crear habitación:", error)
    req.flash("error", "Error al crear la habitación")
    res.redirect("/admin/habitaciones/nueva")
  }
}

// Mostrar formulario para editar habitación
exports.mostrarFormularioEditarHabitacion = async (req, res) => {
  const { id } = req.params

  try {
    const queryHabitacion = `
      SELECT HabitacionID, SucursalID, NumeroHabitacion, TipoHabitacionID, Estado
      FROM Habitaciones
      WHERE HabitacionID = @param0
    `

    const querySucursales = `SELECT SucursalID, NombreSucursal FROM Sucursales`
    const queryTipos = `SELECT TipoHabitacionID, NombreTipo FROM TipoHabitaciones`

    const resultHabitacion = await db.ejecutarQuery(queryHabitacion, [{ valor: id }])
    const resultSucursales = await db.ejecutarQuery(querySucursales)
    const resultTipos = await db.ejecutarQuery(queryTipos)

    if (resultHabitacion.recordset.length === 0) {
      req.flash("error", "Habitación no encontrada")
      return res.redirect("/admin/habitaciones")
    }

    res.render("admin/habitacion-form", {
      titulo: "Editar Habitación",
      habitacion: resultHabitacion.recordset[0],
      sucursales: resultSucursales.recordset,
      tipos: resultTipos.recordset,
      editar: true,
    })
  } catch (error) {
    console.error("Error al mostrar formulario de edición:", error)
    req.flash("error", "Error al cargar el formulario")
    res.redirect("/admin/habitaciones")
  }
}

// Actualizar habitación
exports.actualizarHabitacion = async (req, res) => {
  const { id } = req.params
  const { sucursalID, numeroHabitacion, tipoHabitacionID, estado } = req.body

  try {
    const query = `
      UPDATE Habitaciones
      SET SucursalID = @param0,
          NumeroHabitacion = @param1,
          TipoHabitacionID = @param2,
          Estado = @param3
      WHERE HabitacionID = @param4
    `

    await db.ejecutarQuery(query, [
      { valor: sucursalID },
      { valor: numeroHabitacion },
      { valor: tipoHabitacionID },
      { valor: estado },
      { valor: id },
    ])

    req.flash("exito", "Habitación actualizada exitosamente")
    res.redirect("/admin/habitaciones")
  } catch (error) {
    console.error("Error al actualizar habitación:", error)
    req.flash("error", "Error al actualizar la habitación")
    res.redirect(`/admin/habitaciones/editar/${id}`)
  }
}

// Listar tipos de habitaciones
exports.listarTiposHabitaciones = async (req, res) => {
  try {
    const query = `
      SELECT TipoHabitacionID, NombreTipo, Descripcion, Capacidad, PrecioPorNoche
      FROM TipoHabitaciones
      ORDER BY NombreTipo
    `

    const result = await db.ejecutarQuery(query)

    res.render("admin/tipos-habitaciones", {
      titulo: "Tipos de Habitaciones",
      tipos: result.recordset,
    })
  } catch (error) {
    console.error("Error al listar tipos de habitaciones:", error)
    req.flash("error", "Error al cargar los tipos de habitaciones")
    res.redirect("/admin/dashboard")
  }
}

// Mostrar formulario para crear tipo de habitación
exports.mostrarFormularioTipoHabitacion = (req, res) => {
  res.render("admin/tipo-habitacion-form", {
    titulo: "Nuevo Tipo de Habitación",
    tipo: {},
    editar: false,
  })
}

// Crear tipo de habitación
exports.crearTipoHabitacion = async (req, res) => {
  const { nombreTipo, descripcion, capacidad, precioPorNoche } = req.body

  try {
    const query = `
      INSERT INTO TipoHabitaciones (NombreTipo, Descripcion, Capacidad, PrecioPorNoche)
      VALUES (@param0, @param1, @param2, @param3)
    `

    await db.ejecutarQuery(query, [
      { valor: nombreTipo },
      { valor: descripcion },
      { valor: capacidad },
      { valor: precioPorNoche },
    ])

    req.flash("exito", "Tipo de habitación creado exitosamente")
    res.redirect("/admin/tipos-habitaciones")
  } catch (error) {
    console.error("Error al crear tipo de habitación:", error)
    req.flash("error", "Error al crear el tipo de habitación")
    res.redirect("/admin/tipos-habitaciones/nuevo")
  }
}

// Mostrar formulario para editar tipo de habitación
exports.mostrarFormularioEditarTipoHabitacion = async (req, res) => {
  const { id } = req.params

  try {
    const query = `
      SELECT TipoHabitacionID, NombreTipo, Descripcion, Capacidad, PrecioPorNoche
      FROM TipoHabitaciones
      WHERE TipoHabitacionID = @param0
    `

    const result = await db.ejecutarQuery(query, [{ valor: id }])

    if (result.recordset.length === 0) {
      req.flash("error", "Tipo de habitación no encontrado")
      return res.redirect("/admin/tipos-habitaciones")
    }

    res.render("admin/tipo-habitacion-form", {
      titulo: "Editar Tipo de Habitación",
      tipo: result.recordset[0],
      editar: true,
    })
  } catch (error) {
    console.error("Error al mostrar formulario de edición:", error)
    req.flash("error", "Error al cargar el formulario")
    res.redirect("/admin/tipos-habitaciones")
  }
}

// Actualizar tipo de habitación
exports.actualizarTipoHabitacion = async (req, res) => {
  const { id } = req.params
  const { nombreTipo, descripcion, capacidad, precioPorNoche } = req.body

  try {
    const query = `
      UPDATE TipoHabitaciones
      SET NombreTipo = @param0,
          Descripcion = @param1,
          Capacidad = @param2,
          PrecioPorNoche = @param3
      WHERE TipoHabitacionID = @param4
    `

    await db.ejecutarQuery(query, [
      { valor: nombreTipo },
      { valor: descripcion },
      { valor: capacidad },
      { valor: precioPorNoche },
      { valor: id },
    ])

    req.flash("exito", "Tipo de habitación actualizado exitosamente")
    res.redirect("/admin/tipos-habitaciones")
  } catch (error) {
    console.error("Error al actualizar tipo de habitación:", error)
    req.flash("error", "Error al actualizar el tipo de habitación")
    res.redirect(`/admin/tipos-habitaciones/editar/${id}`)
  }
}

// Listar servicios adicionales
exports.listarServicios = async (req, res) => {
  try {
    const query = `
      SELECT ServicioID, NombreServicio, Precio
      FROM ServiciosAdicionales
      ORDER BY NombreServicio
    `

    const result = await db.ejecutarQuery(query)

    res.render("admin/servicios", {
      titulo: "Servicios Adicionales",
      servicios: result.recordset,
    })
  } catch (error) {
    console.error("Error al listar servicios:", error)
    req.flash("error", "Error al cargar los servicios")
    res.redirect("/admin/dashboard")
  }
}

// Mostrar formulario para crear servicio
exports.mostrarFormularioServicio = (req, res) => {
  res.render("admin/servicio-form", {
    titulo: "Nuevo Servicio",
    servicio: {},
    editar: false,
  })
}

// Crear servicio
exports.crearServicio = async (req, res) => {
  const { nombreServicio, precio } = req.body

  try {
    const query = `
      INSERT INTO ServiciosAdicionales (NombreServicio, Precio)
      VALUES (@param0, @param1)
    `

    await db.ejecutarQuery(query, [{ valor: nombreServicio }, { valor: precio }])

    req.flash("exito", "Servicio creado exitosamente")
    res.redirect("/admin/servicios")
  } catch (error) {
    console.error("Error al crear servicio:", error)
    req.flash("error", "Error al crear el servicio")
    res.redirect("/admin/servicios/nuevo")
  }
}

// Mostrar formulario para editar servicio
exports.mostrarFormularioEditarServicio = async (req, res) => {
  const { id } = req.params

  try {
    const query = `
      SELECT ServicioID, NombreServicio, Precio
      FROM ServiciosAdicionales
      WHERE ServicioID = @param0
    `

    const result = await db.ejecutarQuery(query, [{ valor: id }])

    if (result.recordset.length === 0) {
      req.flash("error", "Servicio no encontrado")
      return res.redirect("/admin/servicios")
    }

    res.render("admin/servicio-form", {
      titulo: "Editar Servicio",
      servicio: result.recordset[0],
      editar: true,
    })
  } catch (error) {
    console.error("Error al mostrar formulario de edición:", error)
    req.flash("error", "Error al cargar el formulario")
    res.redirect("/admin/servicios")
  }
}

// Actualizar servicio
exports.actualizarServicio = async (req, res) => {
  const { id } = req.params
  const { nombreServicio, precio } = req.body

  try {
    const query = `
      UPDATE ServiciosAdicionales
      SET NombreServicio = @param0,
          Precio = @param1
      WHERE ServicioID = @param2
    `

    await db.ejecutarQuery(query, [{ valor: nombreServicio }, { valor: precio }, { valor: id }])

    req.flash("exito", "Servicio actualizado exitosamente")
    res.redirect("/admin/servicios")
  } catch (error) {
    console.error("Error al actualizar servicio:", error)
    req.flash("error", "Error al actualizar el servicio")
    res.redirect(`/admin/servicios/editar/${id}`)
  }
}

// Listar usuarios
exports.listarUsuarios = async (req, res) => {
  try {
    const query = `
      SELECT u.UsuarioID, u.NombreUsuario, p.PrimerNombre, p.PrimerApellido, p.Correo, u.FechaCreacion
      FROM Usuarios u
      INNER JOIN Personas p ON u.PersonaID = p.PersonaID
      ORDER BY u.NombreUsuario
    `

    const result = await db.ejecutarQuery(query)

    // Obtener roles para cada usuario
    for (const usuario of result.recordset) {
      const queryRoles = `
        SELECT r.NombreRol
        FROM Roles r
        INNER JOIN UsuariosRoles ur ON r.RolID = ur.RolID
        WHERE ur.UsuarioID = @param0
      `

      const resultRoles = await db.ejecutarQuery(queryRoles, [{ valor: usuario.UsuarioID }])
      usuario.roles = resultRoles.recordset.map((rol) => rol.NombreRol)
    }

    res.render("admin/usuarios", {
      titulo: "Gestión de Usuarios",
      usuarios: result.recordset,
    })
  } catch (error) {
    console.error("Error al listar usuarios:", error)
    req.flash("error", "Error al cargar los usuarios")
    res.redirect("/admin/dashboard")
  }
}

