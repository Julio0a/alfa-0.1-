// Archivo para crear usuarios iniciales
const bcrypt = require('bcrypt');
const db = require('./config/dbConfig');

async function crearUsuarios() {
  try {
    console.log('Iniciando creación de usuarios...');
    
    // Contraseña común para todos los usuarios
    const password = 'password123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log('Contraseña hasheada generada');
    
    // Conectar a la base de datos
    const pool = await db.conectar();
    const transaction = new db.sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // 1. Insertar personas
      console.log('Insertando personas...');
      
      // Admin
      let request = new db.sql.Request(transaction);
      let result = await request.query(`
        INSERT INTO Personas (PrimerNombre, SegundoNombre, PrimerApellido, SegundoApellido, NumeroIdentidad, Correo)
        OUTPUT INSERTED.PersonaID
        VALUES ('Admin', NULL, 'Sistema', NULL, '0000000000000', 'admin@hotelzafiro504.com')
      `);
      const adminPersonaID = result.recordset[0].PersonaID;
      
      // Juan Pérez (Recepcionista)
      request = new db.sql.Request(transaction);
      result = await request.query(`
        INSERT INTO Personas (PrimerNombre, SegundoNombre, PrimerApellido, SegundoApellido, NumeroIdentidad, Correo)
        OUTPUT INSERTED.PersonaID
        VALUES ('Juan', 'Carlos', 'Pérez', 'López', '0801199012345', 'juan.perez@hotelzafiro504.com')
      `);
      const juanPersonaID = result.recordset[0].PersonaID;
      
      // María Rodríguez (RRHH)
      request = new db.sql.Request(transaction);
      result = await request.query(`
        INSERT INTO Personas (PrimerNombre, SegundoNombre, PrimerApellido, SegundoApellido, NumeroIdentidad, Correo)
        OUTPUT INSERTED.PersonaID
        VALUES ('María', 'Elena', 'Rodríguez', 'Gómez', '0801199054321', 'maria.rodriguez@hotelzafiro504.com')
      `);
      const mariaPersonaID = result.recordset[0].PersonaID;
      
      // Carlos Mendoza (Cliente)
      request = new db.sql.Request(transaction);
      result = await request.query(`
        INSERT INTO Personas (PrimerNombre, SegundoNombre, PrimerApellido, SegundoApellido, NumeroIdentidad, Correo)
        OUTPUT INSERTED.PersonaID
        VALUES ('Carlos', NULL, 'Mendoza', 'Flores', '0501198765432', 'carlos.mendoza@hotelzafiro504.com')
      `);
      const carlosPersonaID = result.recordset[0].PersonaID;
      
      console.log('Personas insertadas correctamente');
      
      // 2. Insertar usuarios con la contraseña hasheada
      console.log('Insertando usuarios...');
      
      // Admin
      request = new db.sql.Request(transaction);
      request.input('personaID', adminPersonaID);
      request.input('contrasena', hashedPassword);
      result = await request.query(`
        INSERT INTO Usuarios (PersonaID, NombreUsuario, Contrasena, FechaCreacion)
        OUTPUT INSERTED.UsuarioID
        VALUES (@personaID, 'admin', @contrasena, GETDATE())
      `);
      const adminUsuarioID = result.recordset[0].UsuarioID;
      
      // Juan Pérez
      request = new db.sql.Request(transaction);
      request.input('personaID', juanPersonaID);
      request.input('contrasena', hashedPassword);
      result = await request.query(`
        INSERT INTO Usuarios (PersonaID, NombreUsuario, Contrasena, FechaCreacion)
        OUTPUT INSERTED.UsuarioID
        VALUES (@personaID, 'jperez', @contrasena, GETDATE())
      `);
      const juanUsuarioID = result.recordset[0].UsuarioID;
      
      // María Rodríguez
      request = new db.sql.Request(transaction);
      request.input('personaID', mariaPersonaID);
      request.input('contrasena', hashedPassword);
      result = await request.query(`
        INSERT INTO Usuarios (PersonaID, NombreUsuario, Contrasena, FechaCreacion)
        OUTPUT INSERTED.UsuarioID
        VALUES (@personaID, 'mrodriguez', @contrasena, GETDATE())
      `);
      const mariaUsuarioID = result.recordset[0].UsuarioID;
      
      // Carlos Mendoza
      request = new db.sql.Request(transaction);
      request.input('personaID', carlosPersonaID);
      request.input('contrasena', hashedPassword);
      result = await request.query(`
        INSERT INTO Usuarios (PersonaID, NombreUsuario, Contrasena, FechaCreacion)
        OUTPUT INSERTED.UsuarioID
        VALUES (@personaID, 'cmendoza', @contrasena, GETDATE())
      `);
      const carlosUsuarioID = result.recordset[0].UsuarioID;
      
      console.log('Usuarios insertados correctamente');
      
      // 3. Asignar roles
      console.log('Asignando roles...');
      
      // Admin - Administrador (RolID = 1)
      request = new db.sql.Request(transaction);
      await request.query(`
        INSERT INTO UsuariosRoles (UsuarioID, RolID)
        VALUES (${adminUsuarioID}, 1)
      `);
      
      // Juan - Recepcionista (RolID = 3)
      request = new db.sql.Request(transaction);
      await request.query(`
        INSERT INTO UsuariosRoles (UsuarioID, RolID)
        VALUES (${juanUsuarioID}, 3)
      `);
      
      // María - RecursosHumanos (RolID = 4)
      request = new db.sql.Request(transaction);
      await request.query(`
        INSERT INTO UsuariosRoles (UsuarioID, RolID)
        VALUES (${mariaUsuarioID}, 4)
      `);
      
      // Carlos - Cliente (RolID = 2)
      request = new db.sql.Request(transaction);
      await request.query(`
        INSERT INTO UsuariosRoles (UsuarioID, RolID)
        VALUES (${carlosUsuarioID}, 2)
      `);
      
      console.log('Roles asignados correctamente');
      
      // 4. Insertar empleados
      console.log('Insertando empleados...');
      
      // Juan - Recepcionista
      request = new db.sql.Request(transaction);
      await request.query(`
        INSERT INTO Empleados (PersonaID, PuestoID, SucursalID, FechaContratacion)
        VALUES (${juanPersonaID}, 3, 1, '2022-01-15')
      `);
      
      // María - RRHH
      request = new db.sql.Request(transaction);
      await request.query(`
        INSERT INTO Empleados (PersonaID, PuestoID, SucursalID, FechaContratacion)
        VALUES (${mariaPersonaID}, 9, 1, '2022-02-01')
      `);
      
      console.log('Empleados insertados correctamente');
      
      // 5. Insertar cliente
      console.log('Insertando cliente...');
      
      request = new db.sql.Request(transaction);
      await request.query(`
        INSERT INTO Clientes (PersonaID, RTN, FechaRegistro)
        VALUES (${carlosPersonaID}, '08011987654321', GETDATE())
      `);
      
      console.log('Cliente insertado correctamente');
      
      // Confirmar transacción
      await transaction.commit();
      console.log('Transacción completada exitosamente');
      
      console.log('Usuarios creados correctamente:');
      console.log('- Admin: admin / password123');
      console.log('- Recepcionista: jperez / password123');
      console.log('- RRHH: mrodriguez / password123');
      console.log('- Cliente: cmendoza / password123');
      
    } catch (error) {
      // Revertir transacción en caso de error
      await transaction.rollback();
      console.error('Error en la transacción:', error);
      throw error;
    }
    
  } catch (error) {
    console.error('Error al crear usuarios:', error);
  } finally {
    process.exit();
  }
}

crearUsuarios();