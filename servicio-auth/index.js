require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conexión MySQL segura
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'polbd',
    database: process.env.DB_NAME || 'utp_auth_db'
});

const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_super_segura';


app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await db.execute(
            'SELECT id, email, full_name, role, password FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            console.log(`[DEBUG LOGIN] Usuario no encontrado: ${email}`);
            return res.status(401).json({ success: false, message: "Credenciales inválidas" });
        }

        const user = rows[0];

        console.log("-----------------------------------------");
        console.log(`[DEBUG LOGIN] Email encontrado: ${user.email}`);
        console.log(`[DEBUG LOGIN] Password enviada (cliente): ${password}`); 
        console.log(`[DEBUG LOGIN] Hash en BD (user.password): ${user.password}`); 
        
        const isMatch = await bcrypt.compare(password, user.password);
        
        console.log(`[DEBUG LOGIN] Resultado de bcrypt.compare: ${isMatch}`); 
        console.log("-----------------------------------------");

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Credenciales inválidas" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.full_name },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Error en /login:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.post('/admin/create-user', async (req, res) => {
    const { email, password, full_name, role } = req.body;

    try {
        const [exists] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (exists.length > 0) {
            return res.status(400).json({ message: 'El correo ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            'INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, full_name, role]
        );

        return res.json({
            success: true,
            message: `Usuario ${role} creado correctamente`,
            id: result.insertId
        });

    } catch (error) {
        console.error("Error en /admin/create-user:", error);
        res.status(500).json({ error: "Error al crear usuario" });
    }
});

app.post('/users-by-ids', async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.json([]);
    }

    const safeIds = ids.filter(id => Number.isInteger(id));
    if (safeIds.length === 0) {
        return res.json([]);
    }

    const placeholders = safeIds.map(() => '?').join(',');

    try {
        const query = `SELECT id, full_name FROM users WHERE id IN (${placeholders})`;

        const [rows] = await db.execute(query, safeIds);

        return res.json(rows);

    } catch (error) {
        console.error("Error en /users-by-ids:", error);
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
});

app.listen(3001, () => {
    console.log('AUTH (MySQL Seguro) corriendo en el puerto 3001');
});
