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
    const { tipo } = req.body;
    const query = 'INSERT INTO tipohabitacion (tipo) VALUES (?)';

    db.query(query, [tipo], (err, result) => {
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


app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});