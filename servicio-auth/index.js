// svc-auth/index.js
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();
app.use(cors()); app.use(express.json());

const db = mysql.createPool({host:'localhost', user:'root', password:'polbd', database:'utp_auth_db'});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.execute('SELECT id, email, full_name, role FROM users WHERE email = ? AND password = ?', [email, password]);
        if (rows.length > 0) res.json({ success: true, user: rows[0] });
        else res.status(401).json({ success: false, message: "Credenciales inválidas" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});
// Endpoint para que el profe vea sus nombres de alumnos (simplificado)
app.post('/users-by-ids', async (req, res) => {
    const { ids } = req.body; // Array de IDs numéricos
    if(!ids || ids.length === 0) return res.json([]);
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await db.execute(`SELECT id, full_name FROM users WHERE id IN (${placeholders})`, ids);
    res.json(rows);
});

app.post('/admin/create-user', async (req, res) => {
    const { email, password, full_name, role } = req.body;
    try {
        // Validar que no exista
        const [exists] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if(exists.length > 0) return res.status(400).json({message: 'El correo ya existe'});

        const [rows] = await db.execute(
            'INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)',
            [email, password, full_name, role]
        );
        res.json({ success: true, message: `Usuario ${role} creado correctamente`, id: rows.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3001, () => console.log('AUTH (MySQL) corriendo en 3001'));