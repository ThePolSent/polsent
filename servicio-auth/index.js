const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();
app.use(cors()); 
app.use(express.json());

const db = mysql.createPool({
    host:'localhost', 
    user:'root', 
    password:'polbd', 
    database:'utp_auth_db'
});

// ===== VALIDACIONES =====
const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

const validarPassword = (password) => {
    return password && password.length >= 6;
};

const validarRol = (role) => {
    return ['student', 'admin', 'teacher'].includes(role);
};

// ===== LOGIN =====
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Validaciones
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: "El correo y la contraseña son obligatorios" 
        });
    }

    if (!validarEmail(email)) {
        return res.status(400).json({ 
            success: false, 
            message: "Formato de correo inválido" 
        });
    }

    try {
        const [rows] = await db.execute(
            'SELECT id, email, full_name, role FROM users WHERE email = ? AND password = ?', 
            [email, password]
        );
        
        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.status(401).json({ 
                success: false, 
                message: "Credenciales incorrectas" 
            });
        }
    } catch (error) { 
        res.status(500).json({ 
            success: false, 
            error: error.message 
        }); 
    }
});

// ===== CREATE USUARIO (Admin) =====
app.post('/admin/create-user', async (req, res) => {
    const { email, password, full_name, role } = req.body;
    
    // Validaciones
    if (!email || !password || !full_name || !role) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son obligatorios (email, password, full_name, role)'
        });
    }

    if (!validarEmail(email)) {
        return res.status(400).json({
            success: false,
            message: 'Formato de correo electrónico inválido'
        });
    }

    if (!validarPassword(password)) {
        return res.status(400).json({
            success: false,
            message: 'La contraseña debe tener al menos 6 caracteres'
        });
    }

    if (!validarRol(role)) {
        return res.status(400).json({
            success: false,
            message: 'Rol inválido. Debe ser: student, admin o teacher'
        });
    }

    if (full_name.length < 3) {
        return res.status(400).json({
            success: false,
            message: 'El nombre completo debe tener al menos 3 caracteres'
        });
    }

    try {
        // Verificar si el email ya existe
        const [exists] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if(exists.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Este correo electrónico ya está registrado'
            });
        }

        // Crear usuario
        const [result] = await db.execute(
            'INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)',
            [email, password, full_name, role]
        );
        
        res.json({ 
            success: true, 
            message: `Usuario ${role === 'student' ? 'estudiante' : role === 'teacher' ? 'profesor' : 'administrador'} creado correctamente`, 
            id: result.insertId 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ===== READ - LISTAR TODOS LOS USUARIOS (Admin) =====
app.get('/admin/users', async (req, res) => {
    const { role } = req.query; // Filtro opcional por rol
    
    try {
        let query = 'SELECT id, email, full_name, role FROM users';
        let params = [];
        
        if (role && validarRol(role)) {
            query += ' WHERE role = ?';
            params.push(role);
        }
        
        query += ' ORDER BY id DESC';
        
        const [users] = await db.execute(query, params);
        res.json({ 
            success: true, 
            total: users.length,
            users 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ===== READ - OBTENER UN USUARIO POR ID =====
app.get('/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de usuario inválido'
        });
    }

    try {
        const [users] = await db.execute(
            'SELECT id, email, full_name, role FROM users WHERE id = ?', 
            [id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        
        res.json({ 
            success: true, 
            user: users[0] 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ===== UPDATE - ACTUALIZAR USUARIO =====
app.put('/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    const { email, password, full_name, role } = req.body;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de usuario inválido'
        });
    }

    // Validar que al menos un campo venga para actualizar
    if (!email && !password && !full_name && !role) {
        return res.status(400).json({
            success: false,
            message: 'Debe proporcionar al menos un campo para actualizar'
        });
    }

    try {
        // Verificar que el usuario existe
        const [exists] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
        if (exists.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Construir query dinámicamente
        let updates = [];
        let params = [];

        if (email) {
            if (!validarEmail(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de correo electrónico inválido'
                });
            }
            // Verificar que el email no esté en uso por otro usuario
            const [emailExists] = await db.execute(
                'SELECT id FROM users WHERE email = ? AND id != ?', 
                [email, id]
            );
            if (emailExists.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Este correo ya está en uso por otro usuario'
                });
            }
            updates.push('email = ?');
            params.push(email);
        }

        if (password) {
            if (!validarPassword(password)) {
                return res.status(400).json({
                    success: false,
                    message: 'La contraseña debe tener al menos 6 caracteres'
                });
            }
            updates.push('password = ?');
            params.push(password);
        }

        if (full_name) {
            if (full_name.length < 3) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre debe tener al menos 3 caracteres'
                });
            }
            updates.push('full_name = ?');
            params.push(full_name);
        }

        if (role) {
            if (!validarRol(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Rol inválido. Debe ser: student, admin o teacher'
                });
            }
            updates.push('role = ?');
            params.push(role);
        }

        params.push(id);

        await db.execute(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        res.json({ 
            success: true, 
            message: 'Usuario actualizado correctamente' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ===== DELETE - ELIMINAR USUARIO =====
app.delete('/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: 'ID de usuario inválido'
        });
    }

    try {
        // Verificar que el usuario existe
        const [exists] = await db.execute('SELECT id, email FROM users WHERE id = ?', [id]);
        if (exists.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Eliminar
        await db.execute('DELETE FROM users WHERE id = ?', [id]);

        res.json({ 
            success: true, 
            message: 'Usuario eliminado correctamente',
            deletedUser: exists[0].email
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ===== OBTENER USUARIOS POR IDS (Para el frontend) =====
app.post('/users-by-ids', async (req, res) => {
    const { ids } = req.body;
    
    if(!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.json([]);
    }

    try {
        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await db.execute(
            `SELECT id, full_name, email, role FROM users WHERE id IN (${placeholders})`, 
            ids
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`✅ AUTH (MySQL) corriendo en puerto ${PORT}`));