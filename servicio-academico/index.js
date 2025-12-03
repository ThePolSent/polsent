// servicio-academico/index.js - MEJORADO
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
app.use(cors()); 
app.use(express.json());

const pool = new Pool({
    user:'postgres', 
    host:'localhost', 
    database:'utp_academic_db', 
    password:'polbd', 
    port:5432
});

// ===== VALIDACIONES =====
const validarCodigo = (code) => {
    return code && code.length >= 2 && code.length <= 20;
};

const validarNombre = (name) => {
    return name && name.length >= 3 && name.length <= 100;
};

const validarCreditos = (credits) => {
    return Number.isInteger(credits) && credits >= 1 && credits <= 10;
};

const validarHoras = (hours) => {
    return Number.isInteger(hours) && hours >= 1 && hours <= 200;
};

const validarCosto = (cost) => {
    return !isNaN(cost) && parseFloat(cost) >= 0;
};

// ===== CREATE - CREAR CURSO =====
app.post('/courses', async (req, res) => {
    const { code, name, credits, hours, base_cost, teacher_id, prerequisite_code } = req.body;
    
    // Validaciones obligatorias
    if (!code || !name || !credits || !hours || base_cost === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Los campos code, name, credits, hours y base_cost son obligatorios'
        });
    }

    if (!validarCodigo(code)) {
        return res.status(400).json({
            success: false,
            message: 'El código debe tener entre 2 y 20 caracteres'
        });
    }

    if (!validarNombre(name)) {
        return res.status(400).json({
            success: false,
            message: 'El nombre debe tener entre 3 y 100 caracteres'
        });
    }

    if (!validarCreditos(credits)) {
        return res.status(400).json({
            success: false,
            message: 'Los créditos deben ser un número entero entre 1 y 10'
        });
    }

    if (!validarHoras(hours)) {
        return res.status(400).json({
            success: false,
            message: 'Las horas deben ser un número entero entre 1 y 200'
        });
    }

    if (!validarCosto(base_cost)) {
        return res.status(400).json({
            success: false,
            message: 'El costo base debe ser un número válido mayor o igual a 0'
        });
    }

    try {
        // Verificar si el código ya existe
        const exists = await pool.query('SELECT code FROM courses WHERE code = $1', [code]);
        if (exists.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un curso con este código'
            });
        }

        // Verificar que el prerrequisito existe (si se proporciona)
        if (prerequisite_code) {
            const prereqExists = await pool.query(
                'SELECT code FROM courses WHERE code = $1', 
                [prerequisite_code]
            );
            if (prereqExists.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El código de prerrequisito no existe'
                });
            }
        }

        // Insertar curso
        await pool.query(
            'INSERT INTO courses VALUES ($1, $2, $3, $4, $5, $6, $7)', 
            [code, name, credits, hours, base_cost, teacher_id || null, prerequisite_code || null]
        );
        
        res.json({
            success: true,
            message: 'Curso creado correctamente',
            course: { code, name, credits, hours, base_cost }
        });
    } catch(e) { 
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

// ===== READ - LISTAR TODOS LOS CURSOS =====
app.get('/courses', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM courses ORDER BY code');
        res.json(result.rows);
    } catch(e) {
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

// ===== READ - OBTENER UN CURSO POR CÓDIGO =====
app.get('/courses/:code', async (req, res) => {
    const { code } = req.params;
    
    if (!code) {
        return res.status(400).json({
            success: false,
            message: 'Código de curso requerido'
        });
    }

    try {
        const result = await pool.query('SELECT * FROM courses WHERE code = $1', [code]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Curso no encontrado'
            });
        }
        
        res.json({
            success: true,
            course: result.rows[0]
        });
    } catch(e) {
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

// ===== READ - CURSOS POR PROFESOR =====
app.get('/courses/teacher/:id', async (req, res) => {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de profesor inválido'
        });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM courses WHERE teacher_id = $1 ORDER BY code', 
            [id]
        );
        res.json(result.rows);
    } catch(e) {
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

// ===== UPDATE - ACTUALIZAR CURSO =====
app.put('/courses/:code', async (req, res) => {
    const { code } = req.params;
    const { name, credits, hours, base_cost, teacher_id, prerequisite_code } = req.body;
    
    if (!code) {
        return res.status(400).json({
            success: false,
            message: 'Código de curso requerido'
        });
    }

    // Validar que al menos un campo venga
    if (!name && !credits && !hours && base_cost === undefined && 
        teacher_id === undefined && prerequisite_code === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Debe proporcionar al menos un campo para actualizar'
        });
    }

    try {
        // Verificar que el curso existe
        const exists = await pool.query('SELECT code FROM courses WHERE code = $1', [code]);
        if (exists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Curso no encontrado'
            });
        }

        // Construir query dinámicamente
        let updates = [];
        let params = [];
        let paramIndex = 1;

        if (name) {
            if (!validarNombre(name)) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre debe tener entre 3 y 100 caracteres'
                });
            }
            updates.push(`name = $${paramIndex++}`);
            params.push(name);
        }

        if (credits) {
            if (!validarCreditos(credits)) {
                return res.status(400).json({
                    success: false,
                    message: 'Los créditos deben ser un número entre 1 y 10'
                });
            }
            updates.push(`credits = $${paramIndex++}`);
            params.push(credits);
        }

        if (hours) {
            if (!validarHoras(hours)) {
                return res.status(400).json({
                    success: false,
                    message: 'Las horas deben ser un número entre 1 y 200'
                });
            }
            updates.push(`hours = $${paramIndex++}`);
            params.push(hours);
        }

        if (base_cost !== undefined) {
            if (!validarCosto(base_cost)) {
                return res.status(400).json({
                    success: false,
                    message: 'El costo debe ser un número válido'
                });
            }
            updates.push(`base_cost = $${paramIndex++}`);
            params.push(base_cost);
        }

        if (teacher_id !== undefined) {
            updates.push(`teacher_id = $${paramIndex++}`);
            params.push(teacher_id);
        }

        if (prerequisite_code !== undefined) {
            if (prerequisite_code && prerequisite_code !== '') {
                // Verificar que existe
                const prereqExists = await pool.query(
                    'SELECT code FROM courses WHERE code = $1', 
                    [prerequisite_code]
                );
                if (prereqExists.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'El prerrequisito especificado no existe'
                    });
                }
            }
            updates.push(`prerequisite_code = $${paramIndex++}`);
            params.push(prerequisite_code || null);
        }

        params.push(code);

        await pool.query(
            `UPDATE courses SET ${updates.join(', ')} WHERE code = $${paramIndex}`,
            params
        );

        res.json({
            success: true,
            message: 'Curso actualizado correctamente'
        });
    } catch(e) {
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

// ===== DELETE - ELIMINAR CURSO =====
app.delete('/courses/:code', async (req, res) => {
    const { code } = req.params;
    
    if (!code) {
        return res.status(400).json({
            success: false,
            message: 'Código de curso requerido'
        });
    }

    try {
        // Verificar que existe
        const exists = await pool.query('SELECT code, name FROM courses WHERE code = $1', [code]);
        if (exists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Curso no encontrado'
            });
        }

        // Verificar si hay cursos que dependen de este como prerrequisito
        const hasDependents = await pool.query(
            'SELECT code, name FROM courses WHERE prerequisite_code = $1', 
            [code]
        );
        
        if (hasDependents.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: `No se puede eliminar: ${hasDependents.rows.length} curso(s) tienen este como prerrequisito`,
                dependentCourses: hasDependents.rows
            });
        }

        // Eliminar
        await pool.query('DELETE FROM courses WHERE code = $1', [code]);

        res.json({
            success: true,
            message: 'Curso eliminado correctamente',
            deletedCourse: exists.rows[0]
        });
    } catch(e) {
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

// ===== PRICING RULES =====
app.get('/pricing-rules', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pricing_rules LIMIT 1');
        res.json(result.rows[0] || { credit_limit: 22, extra_credit_cost: 50 });
    } catch(e) {
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

app.put('/pricing-rules', async (req, res) => {
    const { credit_limit, extra_credit_cost } = req.body;
    
    if (!credit_limit || !extra_credit_cost) {
        return res.status(400).json({
            success: false,
            message: 'credit_limit y extra_credit_cost son obligatorios'
        });
    }

    if (!Number.isInteger(credit_limit) || credit_limit < 1 || credit_limit > 50) {
        return res.status(400).json({
            success: false,
            message: 'El límite de créditos debe ser entre 1 y 50'
        });
    }

    if (!validarCosto(extra_credit_cost)) {
        return res.status(400).json({
            success: false,
            message: 'El costo extra debe ser un número válido'
        });
    }

    try {
        await pool.query(
            'UPDATE pricing_rules SET credit_limit = $1, extra_credit_cost = $2',
            [credit_limit, extra_credit_cost]
        );
        res.json({
            success: true,
            message: 'Reglas de precios actualizadas'
        });
    } catch(e) {
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

const PORT = 3002;
app.listen(PORT, () => console.log(`✅ ACADÉMICO (PostgreSQL) corriendo en puerto ${PORT}`));