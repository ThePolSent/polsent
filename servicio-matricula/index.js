
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
app.use(cors()); app.use(express.json());

mongoose.connect('mongodb://localhost:27017/utp_matricula_pro_db');

const EnrollmentSchema = new mongoose.Schema({
    studentId: Number,
    studentName: String,
    semester: String, 
    courses: [{
        code: String, name: String, credits: Number, cost: Number, teacherId: Number
    }],
    totalCredits: Number,
    totalCost: Number,
    paid: Boolean,
    enrolledAt: { type: Date, default: Date.now }
});
const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);

app.post('/enroll-batch', async (req, res) => {
    try {
        const nuevaMatricula = new Enrollment(req.body);
        await nuevaMatricula.save();
        res.json({ success: true, id: nuevaMatricula._id });
    } catch (error) { res.status(500).json({ error: error.message }); }
});
app.get('/history/:studentId', async(req, res) => {
    const history = await Enrollment.find({ studentId: req.params.studentId });
    res.json(history);
});
app.get('/students-in-course/:courseCode', async(req, res) => {
    const result = await Enrollment.find({"courses.code": req.params.courseCode}, {studentId: 1});
    res.json(result.map(r => r.studentId));
});

app.get('/kardex/:studentId', async (req, res) => {
    try {
        const history = await Enrollment.find({ studentId: req.params.studentId });
        let approvedCodes = [];
        history.forEach(enrollment => {
            enrollment.courses.forEach(c => approvedCodes.push(c.code));
        });
        res.json({ 
            codes: approvedCodes,
            fullHistory: history 
        });
    } catch (err) { res.status(500).send(err); }
});

app.listen(3003, () => console.log('MATRICULA (Mongo) corriendo en 3003'));