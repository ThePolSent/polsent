// svc-matricula/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
app.use(cors()); app.use(express.json());

mongoose.connect('mongodb://localhost:27017/utp_matricula_pro_db');

// Esquema de Matrícula FINAL (Un documento por alumno por ciclo)
const EnrollmentSchema = new mongoose.Schema({
    studentId: Number,
    studentName: String,
    semester: String, // Ej: "2025-2"
    courses: [{
        code: String, name: String, credits: Number, cost: Number, teacherId: Number
    }],
    totalCredits: Number,
    totalCost: Number,
    paid: Boolean,
    enrolledAt: { type: Date, default: Date.now }
});
const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);

// Guardar matrícula completa (Batch)
app.post('/enroll-batch', async (req, res) => {
    try {
        // Aquí se podrían re-validar reglas de negocio antes de guardar
        const nuevaMatricula = new Enrollment(req.body);
        await nuevaMatricula.save();
        res.json({ success: true, id: nuevaMatricula._id });
    } catch (error) { res.status(500).json({ error: error.message }); }
});
// Ver historial de un alumno
app.get('/history/:studentId', async(req, res) => {
    const history = await Enrollment.find({ studentId: req.params.studentId });
    res.json(history);
});
// Para el profesor: Ver quiénes están en un curso específico
app.get('/students-in-course/:courseCode', async(req, res) => {
    // Busca matrículas que contengan el código del curso
    const result = await Enrollment.find({"courses.code": req.params.courseCode}, {studentId: 1});
    // Devuelve solo los IDs de los estudiantes
    res.json(result.map(r => r.studentId));
});

app.get('/kardex/:studentId', async (req, res) => {
    try {
        const history = await Enrollment.find({ studentId: req.params.studentId });
        // Aplanamos la estructura para sacar solo la lista de códigos de cursos aprobados
        let approvedCodes = [];
        history.forEach(enrollment => {
            enrollment.courses.forEach(c => approvedCodes.push(c.code));
        });
        res.json({ 
            codes: approvedCodes, // ["CS101", "MATH1"]
            fullHistory: history 
        });
    } catch (err) { res.status(500).send(err); }
});

app.listen(3003, () => console.log('MATRICULA (Mongo) corriendo en 3003'));