// svc-pagos/index.js
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors()); app.use(express.json());

// Simula un proceso de pago con delay
app.post('/process-payment', (req, res) => {
    const { amount, cardNumber, studentId } = req.body;
    console.log(`Procesando pago de S/${amount} para estudiante ${studentId} con tarjeta ${cardNumber.slice(-4)}`);
    
    setTimeout(() => {
        // Simula éxito el 90% de las veces
        if (Math.random() > 0.1) {
            res.json({ success: true, transactionId: 'TXN-' + Date.now(), message: 'Pago Aprobado' });
        } else {
            res.status(400).json({ success: false, message: 'Fondos insuficientes o tarjeta rechazada' });
        }
    }, 2000); // 2 segundos de espera dramática
});

app.listen(3004, () => console.log('PAGOS (Simulación) corriendo en 3004'));