// Rutas de administrador
const express = require("express")
const router = express.Router()
const adminController = require("../controllers/adminController")
const { estaAutenticado, esAdmin } = require("../middlewares/authMiddleware")

// Aplicar middleware a todas las rutas
router.use(estaAutenticado)
router.use(esAdmin)

// Dashboard
router.get("/dashboard", adminController.dashboard)

// Habitaciones
router.get("/habitaciones", adminController.listarHabitaciones)
router.get("/habitaciones/nueva", adminController.mostrarFormularioHabitacion)
router.post("/habitaciones/nueva", adminController.crearHabitacion)
router.get("/habitaciones/editar/:id", adminController.mostrarFormularioEditarHabitacion)
router.post("/habitaciones/editar/:id", adminController.actualizarHabitacion)

// Tipos de habitaciones
router.get("/tipos-habitaciones", adminController.listarTiposHabitaciones)
router.get("/tipos-habitaciones/nuevo", adminController.mostrarFormularioTipoHabitacion)
router.post("/tipos-habitaciones/nuevo", adminController.crearTipoHabitacion)
router.get("/tipos-habitaciones/editar/:id", adminController.mostrarFormularioEditarTipoHabitacion)
router.post("/tipos-habitaciones/editar/:id", adminController.actualizarTipoHabitacion)

// Servicios adicionales
router.get("/servicios", adminController.listarServicios)
router.get("/servicios/nuevo", adminController.mostrarFormularioServicio)
router.post("/servicios/nuevo", adminController.crearServicio)
router.get("/servicios/editar/:id", adminController.mostrarFormularioEditarServicio)
router.post("/servicios/editar/:id", adminController.actualizarServicio)

// Usuarios
router.get("/usuarios", adminController.listarUsuarios)

module.exports = router

