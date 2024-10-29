const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3000;

// Configuramos body-parser para procesar JSON
app.use(bodyParser.json());
app.use(cors());

// Conexión a la base de datos MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'observatorio'
});

db.connect((err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
    } else {
        console.log('Conectado a la base de datos');
    }
});


// Ruta para crear un nuevo tipo de habitación
app.post('/tipohabitaciones', (req, res) => {
    const { tipo, cantidad } = req.body;
    const queryCheck = 'SELECT tipo FROM tipohabitacion WHERE LOWER(tipo) = LOWER(?)';
    const queryInsert = 'INSERT INTO tipohabitacion (tipo, cantidad) VALUES (?, ?)';

    // Validar que la cantidad esté dentro del rango permitido
    if (cantidad < 1 || cantidad > 30) {
        return res.status(400).send({ message: 'La cantidad debe estar entre 1 y 30.' });
    }

    // Verificar si ya existe el tipo de habitación (ignora mayúsculas/minúsculas)
    db.query(queryCheck, [tipo], (err, results) => {
        if (err) {
            return res.status(500).send({ message: 'Error al consultar la base de datos' });
        }

        if (results.length > 0) {
            // Tipo de habitación ya existente
            const existingType = results[0].tipo; // Obtiene el nombre exacto registrado en la base de datos
            return res.status(400).send({ 
                message: `El tipo de habitación "${existingType}" ya existe.` 
            });
        }

        // Insertar el nuevo tipo de habitación
        db.query(queryInsert, [tipo, cantidad], (err, result) => {
            if (err) {
                return res.status(500).send({ message: 'Error al insertar el tipo de habitación' });
            }

            // Después de la inserción, obtener todos los tipos de habitación
            db.query('SELECT * FROM tipohabitacion', (err, result) => {
                if (err) {
                    return res.status(500).send({ message: 'Error al consultar la base de datos' });
                }
                // Enviar la lista de tipos de habitación actualizada
                res.status(200).json(result);
            });
        });
    });
});



// Ruta para obtener todos los tipos de habitación
app.get('/tipohabitaciones', (req, res) => {
    const query = 'SELECT * FROM tipohabitacion';
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).send({ message: 'Error al consultar la base de datos' });
        }
        res.status(200).json(result);
    });
});

// Ruta para actualizar un tipo de habitación
app.put('/tipohabitaciones/:id', (req, res) => {
    const { id } = req.params;
    const { tipo, cantidad } = req.body;

    const queryCheck = 'SELECT tipo FROM tipohabitacion WHERE LOWER(tipo) = LOWER(?) AND idtipo != ?';
    const queryUpdate = 'UPDATE tipohabitacion SET tipo = ?, cantidad = ? WHERE idtipo = ?';

    // Validar que la cantidad esté dentro del rango permitido
    if (cantidad < 1 || cantidad > 30) {
        return res.status(400).send({ message: 'La cantidad debe estar entre 1 y 30.' });
    }

    // Verificar si ya existe otro tipo de habitación con el mismo nombre (ignora mayúsculas/minúsculas)
    db.query(queryCheck, [tipo, id], (err, results) => {
        if (err) {
            return res.status(500).send({ message: 'Error al consultar la base de datos' });
        }

        if (results.length > 0) {
            // Ya existe otro tipo de habitación con el mismo nombre
            const existingType = results[0].tipo;
            return res.status(400).send({ 
                message: `El tipo de habitación "${existingType}" ya existe.` 
            });
        }

        // Actualizar el tipo de habitación en la base de datos
        db.query(queryUpdate, [tipo, cantidad, id], (err, result) => {
            if (err) {
                return res.status(500).send({ message: 'Error al actualizar el tipo de habitación' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).send({ message: 'No se encontró el tipo de habitación a actualizar' });
            }

            // Obtener todos los tipos de habitación después de la actualización
            db.query('SELECT * FROM tipohabitacion', (err, result) => {
                if (err) {
                    return res.status(500).send({ message: 'Error al consultar la base de datos' });
                }
                // Enviar la lista de tipos de habitación actualizada
                res.status(200).json(result);
            });
        });
    });
});


// Ruta para obtener el historial de ocupación
app.get('/api/historial', (req, res) => {
    const query = `
        SELECT fecha, tipo, habitacionesocupadas, habitacionestotales
        FROM tipohabitacion a
        INNER JOIN historico b ON a.idtipo = b.idtipo
    `;

    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).send({ message: 'Error al consultar la base de datos' });
        }
        res.status(200).json(result);
    });
});


// Configurar sesiones
const session = require('express-session');

app.use(session({
    secret: 'thisisasecret', // Cambia esto por una clave secreta segura
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Cambia a true si usas HTTPS
}));

//login
app.post('/login', (req, res) => {
    const { usuario, contrasena } = req.body;

    const query = 'SELECT * FROM usuarios WHERE usuario = ? AND contrasena = ?';

    db.query(query, [usuario, contrasena], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error al consultar la base de datos' });
        
        if (results.length > 0) {
            // Autenticación exitosa: guardar el usuario en la sesión
            req.session.user = {
                id: results[0].idusuario,
                nombre: results[0].nombre,
                rol: results[0].rol
            };
            res.status(200).json({ message: 'Inicio de sesión exitoso', rol: results[0].rol });
        } else {
            // Autenticación fallida
            res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }
    });
});


//verify session
app.get('/check-session', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ loggedIn: true, user: req.session.user });
    } else {
        res.status(401).json({ loggedIn: false });
    }
});


//logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error al cerrar la sesión' });
        }
        res.clearCookie('connect.sid'); // Limpiar cookie de sesión
        res.status(200).json({ message: 'Sesión cerrada con éxito' });
    });
});


app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});