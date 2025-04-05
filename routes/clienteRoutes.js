// Rutas de cliente
const express = require("express")
const router = express.Router()
const clienteController = require("../controllers/clienteController")
const { estaAutenticado, esCliente } = require("../middlewares/authMiddleware")

// Aplicar middleware a todas las rutas
router.use(estaAutenticado)
router.use(esCliente)

// Dashboard
router.get("/dashboard", clienteController.dashboard)

// Buscar habitaciones
router.get("/buscar-habitaciones", clienteController.buscarHabitaciones)

// Reservas
router.get("/crear-reserva", clienteController.mostrarFormularioReserva)
router.post("/crear-reserva", clienteController.crearReserva)
router.get("/mis-reservas", clienteController.listarReservas)
router.get("/mis-reservas/:id", clienteController.verReserva)
router.get("/mis-reservas/:id", clienteController.verReserva)
router.post("/mis-reservas/:id/cancelar", clienteController.cancelarReserva)

// Facturas
router.get("/facturas", clienteController.listarFacturas)
router.get("/facturas/:id", clienteController.verFactura)

module.exports = router

