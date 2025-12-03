const bcrypt = require('bcryptjs');

async function generarHash() {
    const passwordPlano = 'profesor123'; // ¡La contraseña que quieres usar!
    const saltRounds = 10;

    console.log(`Generando hash para: ${passwordPlano}`);

    // Genera el hash de forma asíncrona
    const nuevoHash = await bcrypt.hash(passwordPlano, saltRounds);

    console.log("----------------------------------------------------------------");
    console.log("NUEVO HASH PARA 'admin123' (Cópialo completo):");
    console.log(nuevoHash);
    console.log("----------------------------------------------------------------");
}

generarHash();