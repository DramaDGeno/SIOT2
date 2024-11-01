const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const port = 3000;

// Configuramos body-parser para procesar JSON
app.use(bodyParser.json());
app.use(cors());

// Conexión a la base de datos MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "observatorio",
});

db.connect((err) => {
  if (err) {
    console.error("Error conectando a la base de datos:", err);
  } else {
    console.log("Conectado a la base de datos");
  }
});

// Dependencias necesarias para manejar sesiones y cifrado de contraseñas
const session = require('express-session');

// Configuración de la sesión en express
app.use(session({
    secret: 'EebubkdJ0@toYquk@zH]',
    resave: false,
    saveUninitialized: true
}));

// Ruta para el login
app.post('/login', (req, res) => {
    const { usuario, contrasena } = req.body;
    const query = 'SELECT * FROM usuarios WHERE usuario = ? AND contrasena = ?';

    db.query(query, [usuario, contrasena], (err, results) => {
        if (err) {
            return res.status(500).send({ message: 'Error al consultar la base de datos' });
        }

        if (results.length > 0) {
            const { rol } = results[0];
            req.session.rol = rol;  // Almacena el rol en la sesión

            return res.status(200).send({ message: 'Inicio de sesión exitoso', rol });
        } else {
            return res.status(401).send({ message: 'Usuario o contraseña incorrectos' });
        }
    });
});


// Ruta para crear un nuevo tipo de habitación
app.post("/tipohabitaciones", (req, res) => {
  const { tipo, cantidad } = req.body;
  const queryCheck =
    "SELECT tipo FROM tipohabitacion WHERE LOWER(tipo) = LOWER(?)";
  const queryInsert =
    "INSERT INTO tipohabitacion (tipo, cantidad) VALUES (?, ?)";

  // Validar que la cantidad esté dentro del rango permitido
  if (cantidad < 1 || cantidad > 30) {
    return res
      .status(400)
      .send({ message: "La cantidad debe estar entre 1 y 30." });
  }

  // Verificar si ya existe el tipo de habitación (ignora mayúsculas/minúsculas)
  db.query(queryCheck, [tipo], (err, results) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Error al consultar la base de datos" });
    }

    if (results.length > 0) {
      // Tipo de habitación ya existente
      const existingType = results[0].tipo; // Obtiene el nombre exacto registrado en la base de datos
      return res.status(400).send({
        message: `El tipo de habitación "${existingType}" ya existe.`,
      });
    }

    // Insertar el nuevo tipo de habitación
    db.query(queryInsert, [tipo, cantidad], (err, result) => {
      if (err) {
        return res
          .status(500)
          .send({ message: "Error al insertar el tipo de habitación" });
      }

      // Después de la inserción, obtener todos los tipos de habitación
      db.query("SELECT * FROM tipohabitacion", (err, result) => {
        if (err) {
          return res
            .status(500)
            .send({ message: "Error al consultar la base de datos" });
        }
        // Enviar la lista de tipos de habitación actualizada
        res.status(200).json(result);
      });
    });
  });
});

// Ruta para obtener todos los tipos de habitación
app.get("/tipohabitaciones", (req, res) => {
  const query = "SELECT * FROM tipohabitacion";
  db.query(query, (err, result) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Error al consultar la base de datos" });
    }
    res.status(200).json(result);
  });
});

// Ruta para actualizar un tipo de habitación
app.put("/tipohabitaciones/:id", (req, res) => {
  const { id } = req.params;
  const { tipo, cantidad } = req.body;

  const queryCheck =
    "SELECT tipo FROM tipohabitacion WHERE LOWER(tipo) = LOWER(?) AND idtipo != ?";
  const queryUpdate =
    "UPDATE tipohabitacion SET tipo = ?, cantidad = ? WHERE idtipo = ?";

  // Validar que la cantidad esté dentro del rango permitido
  if (cantidad < 1 || cantidad > 30) {
    return res
      .status(400)
      .send({ message: "La cantidad debe estar entre 1 y 30." });
  }

  // Verificar si ya existe otro tipo de habitación con el mismo nombre (ignora mayúsculas/minúsculas)
  db.query(queryCheck, [tipo, id], (err, results) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Error al consultar la base de datos" });
    }

    if (results.length > 0) {
      // Ya existe otro tipo de habitación con el mismo nombre
      const existingType = results[0].tipo;
      return res.status(400).send({
        message: `El tipo de habitación "${existingType}" ya existe.`,
      });
    }

    // Actualizar el tipo de habitación en la base de datos
    db.query(queryUpdate, [tipo, cantidad, id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .send({ message: "Error al actualizar el tipo de habitación" });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .send({
            message: "No se encontró el tipo de habitación a actualizar",
          });
      }

      // Obtener todos los tipos de habitación después de la actualización
      db.query("SELECT * FROM tipohabitacion", (err, result) => {
        if (err) {
          return res
            .status(500)
            .send({ message: "Error al consultar la base de datos" });
        }
        // Enviar la lista de tipos de habitación actualizada
        res.status(200).json(result);
      });
    });
  });
});

// Ruta para obtener el historial de ocupación
app.get("/api/historial", (req, res) => {
  const query = `
        SELECT fecha, tipo, habitacionesocupadas, habitacionestotales
        FROM tipohabitacion a
        INNER JOIN historico b ON a.idtipo = b.idtipo
        ORDER BY fecha DESC
    `;

  db.query(query, (err, result) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Error al consultar la base de datos" });
    }
    res.status(200).json(result);
  });
});

app.post('/guardar-historico', (req, res) => {
  const { fecha, habitaciones } = req.body;

  // Paso 1: Verificar si ya existen registros para la fecha
  const checkQuery = 'SELECT COUNT(*) AS count FROM historico WHERE fecha = ?';
  db.query(checkQuery, [fecha], (err, checkResult) => {
    if (err) {
      return res.status(500).send({ message: 'Error al verificar la fecha' });
    }

    if (checkResult[0].count > 0) {
      return res.status(400).send({ message: 'Ya existen registros para esta fecha' });
    }

    // Paso 2: Obtener el total de habitaciones disponibles en la tabla 'tipohabitacion'
    const totalQuery = 'SELECT tipo, cantidad FROM tipohabitacion';
    db.query(totalQuery, (err, tiposHabitacion) => {
      if (err) {
        return res.status(500).send({ message: 'Error al consultar las habitaciones totales' });
      }

      const cantidadesDisponibles = {};
      tiposHabitacion.forEach(tipo => {
        cantidadesDisponibles[tipo.tipo.toLowerCase()] = tipo.cantidad;
      });

      // Validar cantidades
      for (const [tipo, ocupadas] of Object.entries(habitaciones)) {
        const cantidadDisponible = cantidadesDisponibles[tipo.toLowerCase()];
        if (cantidadDisponible === undefined) {
          return res.status(400).send({ message: `Tipo de habitación '${tipo}' no encontrado` });
        }
        if (ocupadas > cantidadDisponible) {
          return res.status(400).send({ message: `No se pueden registrar más de ${cantidadDisponible} habitaciones de tipo ${tipo}` });
        }
      }

      // Paso 3: Obtener el total de habitaciones disponibles
      const totalHabitaciones = Object.values(cantidadesDisponibles).reduce((a, b) => a + b, 0);

      // Paso 4: Realizar inserciones por cada tipo de habitación ingresado en el formulario
      const promesas = Object.entries(habitaciones).map(([tipo, ocupadas]) => {
        return new Promise((resolve, reject) => {
          const tipoQuery = 'SELECT idtipo FROM tipohabitacion WHERE tipo = ?';
          db.query(tipoQuery, [tipo], (err, tipoResult) => {
            if (err || tipoResult.length === 0) {
              return reject(err || new Error('Tipo de habitación no encontrado'));
            }

            const idtipo = tipoResult[0].idtipo;

            // Insertar en la tabla 'historico'
            const insertQuery = `
              INSERT INTO historico (idtipo, fecha, habitacionesocupadas, habitacionestotales) 
              VALUES (?, ?, ?, ?)
            `;
            db.query(insertQuery, [idtipo, fecha, ocupadas, totalHabitaciones], (err, result) => {
              if (err) return reject(err);
              resolve(ocupadas);
            });
          });
        });
      });

      // Ejecutar todas las promesas de inserción
      Promise.all(promesas)
        .then((ocupadasArray) => {
          // Calcular el total de habitaciones ocupadas
          const totalOcupadas = ocupadasArray.reduce((a, b) => a + Number(b), 0);
          const porcentaje = (totalOcupadas / totalHabitaciones) * 100;

          // Insertar el porcentaje en la tabla 'estadistica'
          const insertEstadisticaQuery = `
            INSERT INTO estadistica (fecha, porcentaje) 
            VALUES (?, ?)
          `;
          db.query(insertEstadisticaQuery, [fecha, porcentaje], (err) => {
            if (err) {
              return res.status(500).send({ message: 'Error al insertar en la tabla estadistica' });
            }

            // Respuesta exitosa
            res.status(201).send({ message: 'Registros históricos y estadística guardados exitosamente' });
          });
        })
        .catch((err) => res.status(500).send({ message: err.message }));
    });
  });
});





app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
