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
const session = require("express-session");

// Configuración de la sesión en express
app.use(
  session({
    secret: "EebubkdJ0@toYquk@zH]",
    resave: false,
    saveUninitialized: true,
  })
);

// Ruta para el login
app.post("/login", (req, res) => {
  const { usuario, contrasena } = req.body;
  // Actualiza la consulta SQL para incluir la verificación de 'activo'
  const query =
    "SELECT * FROM usuarios WHERE usuario = ? AND contrasena = ? AND activo = 1";

  db.query(query, [usuario, contrasena], (err, results) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Error al consultar la base de datos" });
    }

    if (results.length > 0) {
      const { rol } = results[0];
      req.session.rol = rol; // Almacena el rol en la sesión
      return res.status(200).send({ message: "Inicio de sesión exitoso", rol });
    } else {
      return res.status(401).send({
        message: "Usuario o contraseña incorrectos o cuenta desactivada",
      });
    }
  });
});

// Ruta para obtener todos los usuarios activos
app.get("/api/usuarios", (req, res) => {
  const query =
    "SELECT idusuario, nombre, usuario, rol FROM usuarios WHERE activo = 1";

  db.query(query, (error, results) => {
    if (error) {
      console.error("Error al obtener los usuarios:", error);
      res.status(500).json({ message: "Error al obtener los usuarios" });
    } else {
      res.json(results); // Enviar los usuarios activos como respuesta en formato JSON
    }
  });
});

// Ruta para crear un nuevo usuario
app.post("/api/usuarios/crear", (req, res) => {
  const { nombre, usuario, contrasena, rol } = req.body;
  const rolBooleano = rol === "admin"; // 'admin' se convierte en true, otros en false

  // Consulta para verificar si el nombre de usuario ya existe
  const queryCheck =
    "SELECT usuario FROM usuarios WHERE LOWER(usuario) = LOWER(?)";

  // Consulta para insertar un nuevo usuario con el campo activo en 1
  const queryInsert =
    "INSERT INTO usuarios (nombre, usuario, contrasena, rol, activo) VALUES (?, ?, ?, ?, 1)";

  // Validar que el nombre de usuario no esté vacío
  if (!usuario || !nombre || !contrasena) {
    return res
      .status(400)
      .send({ message: "Todos los campos son obligatorios." });
  }

  // Verificar si el usuario ya existe
  db.query(queryCheck, [usuario], (error, results) => {
    if (error) {
      console.error("Error al verificar el usuario:", error);
      return res.status(500).json({ message: "Error al verificar el usuario" });
    }

    if (results.length > 0) {
      return res
        .status(400)
        .send({ message: "El nombre de usuario ya existe." });
    }

    // Si el usuario no existe, proceder a la inserción
    db.query(
      queryInsert,
      [nombre, usuario, contrasena, rolBooleano],
      (error, results) => {
        if (error) {
          console.error("Error al crear el usuario:", error);
          return res.status(500).json({ message: "Error al crear el usuario" });
        } else {
          res
            .status(201)
            .json({ message: "Usuario creado", idusuario: results.insertId });
        }
      }
    );
  });
});

// Ruta para obtener usuarios inactivos
app.get("/api/usuarios/inactivos", (req, res) => {
  const query =
    "SELECT idusuario, nombre, usuario FROM usuarios WHERE activo = 0";

  db.query(query, (error, results) => {
    if (error) {
      console.error("Error al obtener usuarios inactivos:", error);
      return res
        .status(500)
        .json({ message: "Error al obtener usuarios inactivos" });
    }

    res.json(results); // Enviar los usuarios inactivos como respuesta en formato JSON
  });
});

// Ruta para obtener un usuario por ID
app.get("/api/usuarios/:idusuario", (req, res) => {
  const idusuario = req.params.idusuario;

  const query =
    "SELECT idusuario, nombre, usuario, rol, activo FROM usuarios WHERE idusuario = ?";

  db.query(query, [idusuario], (error, results) => {
    if (error) {
      console.error("Error al obtener el usuario:", error);
      return res.status(500).json({ message: "Error al obtener el usuario" });
    }

    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ message: "Usuario no encontrado" });
    }
  });
});

// Ruta para actualizar un usuario
app.put("/api/usuarios/:id", (req, res) => {
  const idusuario = req.params.id;
  const { nombre, usuario, contrasena, rol } = req.body;

  // Preparar la consulta SQL para actualizar el usuario
  const query = `
    UPDATE usuarios 
    SET nombre = ?, usuario = ?, rol = ?
    ${contrasena ? ", contrasena = ?" : ""}
    WHERE idusuario = ? AND activo = 1`;

  // Armar los valores a actualizar
  const values = contrasena
    ? [nombre, usuario, rol, contrasena, idusuario]
    : [nombre, usuario, rol, idusuario];

  db.query(query, values, (error, results) => {
    if (error) {
      console.error("Error al actualizar el usuario:", error);
      return res
        .status(500)
        .json({ message: "Error al actualizar el usuario" });
    }

    if (results.affectedRows > 0) {
      res.json({ message: "Usuario actualizado con éxito" });
    } else {
      res.status(404).json({ message: "Usuario no encontrado o inactivo" });
    }
  });
});

// Ruta para desactivar un usuario (soft delete)
app.delete("/api/usuarios/:id", (req, res) => {
  const idusuario = req.params.id;

  const query = "UPDATE usuarios SET activo = 0 WHERE idusuario = ?";

  db.query(query, [idusuario], (error, results) => {
    if (error) {
      console.error("Error al desactivar el usuario:", error);
      return res
        .status(500)
        .json({ message: "Error al desactivar el usuario" });
    }

    if (results.affectedRows > 0) {
      res.json({ message: "Usuario desactivado con éxito" });
    } else {
      res.status(404).json({ message: "Usuario no encontrade" });
    }
  });
});

// Ruta para recuperar un usuario
app.put("/api/usuarios/recuperar/:idusuario", (req, res) => {
  const idusuario = req.params.idusuario;

  // Consulta para actualizar el estado a activo
  const query = "UPDATE usuarios SET activo = 1 WHERE idusuario = ?";

  db.query(query, [idusuario], (error, results) => {
    if (error) {
      console.error("Error al recuperar el usuario:", error);
      return res.status(500).json({ message: "Error al recuperar el usuario" });
    }

    if (results.affectedRows > 0) {
      res.json({ message: "Usuario recuperado con éxito" });
    } else {
      res
        .status(404)
        .json({ message: "Usuario no encontrado o ya está activo" });
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
        return res.status(404).send({
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

app.delete("/borrar-registros/:fecha", async (req, res) => {
  const fecha = req.params.fecha;
  const usuario = req.body.usuario;
  const fechaOperacion = new Date(new Date().getTime());

  try {
    // Verificar registros en historico
    const checkHistoricoQuery = "SELECT * FROM historico WHERE fecha = ?";
    const [historicoResults] = await db
      .promise()
      .query(checkHistoricoQuery, [fecha]);

    if (historicoResults.length === 0) {
      return res
        .status(404)
        .send({
          message: `No se encontraron registros en historico para la fecha ${fecha}`,
        });
    }

    // Insertar en historialoperaciones antes de borrar
    const insertPromises = historicoResults.map((record) => {
      const insertQuery = `
        INSERT INTO historialoperaciones (idtipo, fecha, habitacionesocupadas, habitacionestotales, usuario, fechaoperacion, tipooperacion)
        VALUES (?, ?, ?, ?, ?, ?, 'ELIMINACION')
      `;
      return db
        .promise()
        .query(insertQuery, [
          record.idtipo,
          record.fecha,
          record.habitacionesocupadas,
          record.habitacionestotales,
          usuario,
          fechaOperacion,
        ]);
    });

    await Promise.all(insertPromises);

    // Borrar registros en historico
    const deleteHistoricoQuery = "DELETE FROM historico WHERE fecha = ?";
    await db.promise().query(deleteHistoricoQuery, [fecha]);

    // Verificar y borrar registros en estadistica
    const checkEstadisticaQuery = "SELECT * FROM estadistica WHERE fecha = ?";
    const [estadisticaResults] = await db
      .promise()
      .query(checkEstadisticaQuery, [fecha]);

    if (estadisticaResults.length > 0) {
      const deleteEstadisticaQuery = "DELETE FROM estadistica WHERE fecha = ?";
      await db.promise().query(deleteEstadisticaQuery, [fecha]);
    }

    res
      .status(200)
      .send({ message: `Registros borrados para la fecha ${fecha}` });
  } catch (error) {
    console.error("Error en el proceso de eliminación:", error);
    res
      .status(500)
      .send({
        message: "Error interno al procesar la eliminación de registros",
      });
  }
});

// Ruta para obtener todos los historial de operaciones
app.get("/api/operaciones", (req, res) => {
  const consulta = `
    SELECT idhistoperacion, tipo, 
           DATE_FORMAT(fechaoperacion, '%Y-%m-%d %H:%i:%s') AS fechaoperacion, 
           fecha, habitacionesocupadas, habitacionestotales, usuario, tipooperacion
    FROM tipohabitacion a
    INNER JOIN historialoperaciones b ON a.idtipo = b.idtipo
    ORDER BY idhistoperacion`;

  db.query(consulta, (error, results) => {
    if (error) {
      console.error("Error al obtener las operaciones realizadas:", error);
      res
        .status(500)
        .json({ message: "Error al obtener el historial de operación" });
    } else {
      res.json(results); // Enviar los usuarios activos como respuesta en formato JSON
    }
  });
});

app.post("/guardar-historico", (req, res) => {
  const { fecha, habitaciones, usuario } = req.body; // Ahora recibimos 'usuario'

  // Paso 1: Verificar si ya existen registros para la fecha
  const checkQuery = "SELECT COUNT(*) AS count FROM historico WHERE fecha = ?";
  db.query(checkQuery, [fecha], (err, checkResult) => {
    if (err) {
      return res.status(500).send({ message: "Error al verificar la fecha" });
    }

    if (checkResult[0].count > 0) {
      return res
        .status(400)
        .send({ message: "Ya existen registros para esta fecha" });
    }

    // Paso 2: Obtener el total de habitaciones disponibles en la tabla 'tipohabitacion'
    const totalQuery = "SELECT tipo, cantidad FROM tipohabitacion";
    db.query(totalQuery, (err, tiposHabitacion) => {
      if (err) {
        return res
          .status(500)
          .send({ message: "Error al consultar las habitaciones totales" });
      }

      const cantidadesDisponibles = {};
      tiposHabitacion.forEach((tipo) => {
        cantidadesDisponibles[tipo.tipo.toLowerCase()] = tipo.cantidad;
      });

      // Validar cantidades
      for (const [tipo, ocupadas] of Object.entries(habitaciones)) {
        const cantidadDisponible = cantidadesDisponibles[tipo.toLowerCase()];
        if (cantidadDisponible === undefined) {
          return res
            .status(400)
            .send({ message: `Tipo de habitación '${tipo}' no encontrado` });
        }
        if (ocupadas > cantidadDisponible) {
          return res.status(400).send({
            message: `No se pueden registrar más de ${cantidadDisponible} habitaciones de tipo ${tipo}`,
          });
        }
      }

      // Paso 3: Obtener el total de habitaciones disponibles
      const totalHabitaciones = Object.values(cantidadesDisponibles).reduce(
        (a, b) => a + b,
        0
      );

      // Paso 4: Realizar inserciones por cada tipo de habitación ingresado en el formulario
      const promesas = Object.entries(habitaciones).map(([tipo, ocupadas]) => {
        return new Promise((resolve, reject) => {
          const tipoQuery = "SELECT idtipo FROM tipohabitacion WHERE tipo = ?";
          db.query(tipoQuery, [tipo], (err, tipoResult) => {
            if (err || tipoResult.length === 0) {
              return reject(
                err || new Error("Tipo de habitación no encontrado")
              );
            }

            const idtipo = tipoResult[0].idtipo;

            // Insertar en la tabla 'historico'
            const insertQuery = `
              INSERT INTO historico (idtipo, fecha, habitacionesocupadas, habitacionestotales) 
              VALUES (?, ?, ?, ?)
            `;
            db.query(
              insertQuery,
              [idtipo, fecha, ocupadas, totalHabitaciones],
              (err, result) => {
                if (err) return reject(err);
                resolve(ocupadas);
              }
            );
          });
        });
      });

      // Ejecutar todas las promesas de inserción
      Promise.all(promesas)
        .then((ocupadasArray) => {
          // Calcular el total de habitaciones ocupadas
          const totalOcupadas = ocupadasArray.reduce(
            (a, b) => a + Number(b),
            0
          );
          const porcentaje = (totalOcupadas / totalHabitaciones) * 100;

          // Insertar también en la tabla 'historialoperaciones'
          const fechaActual = new Date();
          fechaActual.setHours(fechaActual.getHours() - 6); // Ajusta la diferencia horaria (UTC -6)

          const fechaOperacion = fechaActual
            .toISOString()
            .slice(0, 19)
            .replace("T", " "); // Formato 'YYYY-MM-DD HH:MM:SS'

          const promesasOperaciones = Object.entries(habitaciones).map(
            ([tipo, ocupadas]) => {
              return new Promise((resolve, reject) => {
                const tipoQuery =
                  "SELECT idtipo FROM tipohabitacion WHERE tipo = ?";
                db.query(tipoQuery, [tipo], (err, tipoResult) => {
                  if (err || tipoResult.length === 0) {
                    return reject(
                      err || new Error("Tipo de habitación no encontrado")
                    );
                  }

                  const idtipo = tipoResult[0].idtipo;

                  // Insertar en la tabla 'historialoperaciones'
                  const insertOperacionesQuery = `
                  INSERT INTO historialoperaciones (idtipo, fecha, habitacionesocupadas, habitacionestotales, usuario, fechaoperacion, tipooperacion) 
  VALUES (?, ?, ?, ?, ?, ?, 'REGISTRO OCUPACION')
                `;
                  db.query(
                    insertOperacionesQuery,
                    [
                      idtipo,
                      fecha,
                      ocupadas,
                      totalHabitaciones,
                      usuario,
                      fechaOperacion,
                    ],
                    (err) => {
                      if (err) return reject(err);
                      resolve();
                    }
                  );
                });
              });
            }
          );

          // Ejecutar todas las promesas de inserción en 'historialoperaciones'
          Promise.all(promesasOperaciones)
            .then(() => {
              // Convertir la fecha al nombre del mes de forma segura
              const [year, month, day] = fecha.split("-"); // Dividir la fecha en año, mes y día
              const fechaObj = new Date(year, month - 1, day); // Crear fecha con mes correcto (0 = enero, 11 = diciembre)
              const mesNumerico = fechaObj.getMonth(); // Obtener el índice del mes (0 para enero, 11 para diciembre)

              // Mapear el índice del mes a su nombre en español
              const meses = [
                "Enero",
                "Febrero",
                "Marzo",
                "Abril",
                "Mayo",
                "Junio",
                "Julio",
                "Agosto",
                "Septiembre",
                "Octubre",
                "Noviembre",
                "Diciembre",
              ];
              const mes = meses[mesNumerico];

              // Insertar el porcentaje y el mes en la tabla 'estadistica'
              const insertEstadisticaQuery = `
                INSERT INTO estadistica (fecha, porcentaje, mes) 
                VALUES (?, ?, ?)
              `;
              db.query(
                insertEstadisticaQuery,
                [fecha, porcentaje, mes],
                (err) => {
                  if (err) {
                    return res.status(500).send({
                      message: "Error al insertar en la tabla estadistica",
                    });
                  }

                  // Respuesta exitosa
                  res.status(201).send({
                    message:
                      "Registros históricos y estadística guardados exitosamente",
                  });
                }
              );
            })
            .catch((err) => res.status(500).send({ message: err.message }));
        })
        .catch((err) => res.status(500).send({ message: err.message }));
    });
  });
});

app.get("/obtener-estadisticas", (req, res) => {
  const { anio } = req.query;
  let query = `
    SELECT YEAR(fecha) AS anio, mes, AVG(porcentaje) AS porcentaje
    FROM estadistica
  `;

  if (anio) {
    query += ` WHERE YEAR(fecha) = ${db.escape(anio)} `;
  }

  query += `
    GROUP BY anio, mes
    ORDER BY anio DESC, FIELD(mes, 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre')
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Error al obtener las estadísticas" });
    }
    res.status(200).send(results);
  });
});

app.get("/obtener-anios", (req, res) => {
  const query = `
    SELECT DISTINCT YEAR(fecha) AS anio
    FROM estadistica
    ORDER BY anio DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).send({ message: "Error al obtener los años" });
    }
    res.status(200).send(results);
  });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
