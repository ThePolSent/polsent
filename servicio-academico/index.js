// svc-academico/index.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
app.use(cors()); app.use(express.json());

const pool = new Pool({user:'postgres', host:'localhost', database:'utp_academic_db', password:'polbd', port:5432});

// Listar cursos (público)
app.get('/courses', async (req, res) => {
    const result = await pool.query('SELECT * FROM courses ORDER BY code');
    res.json(result.rows);
});
// Obtener cursos de un profesor específico
app.get('/courses/teacher/:id', async (req, res) => {
    const result = await pool.query('SELECT * FROM courses WHERE teacher_id = $1', [req.params.id]);
    res.json(result.rows);
});
// Obtener reglas de precio
app.get('/pricing-rules', async (req, res) => {
    const result = await pool.query('SELECT * FROM pricing_rules LIMIT 1');
    res.json(result.rows[0]);
});
// ADMIN: Agregar curso
app.post('/courses', async (req, res) => {
    const { code, name, credits, hours, base_cost, teacher_id, prerequisite_code } = req.body;
    try {
        await pool.query('INSERT INTO courses VALUES ($1, $2, $3, $4, $5, $6, $7)', [code, name, credits, hours, base_cost, teacher_id || null, prerequisite_code || null]);
        res.json({success: true});
    } catch(e) { res.status(500).send(e.message)}
});

app.listen(3002, () => console.log('ACADEMICO (PgSQL) corriendo en 3002'));