CREATE DATABASE IF NOT EXISTS utp_auth_db;
USE utp_auth_db;

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('student', 'admin', 'teacher') DEFAULT 'student'
);


INSERT INTO users (email, password, full_name, role) VALUES 
('alumno@utp.edu.pe', '123456', 'Juan Estudiante', 'student'),
('profe@utp.edu.pe', '123456', 'Dra. Ana Profesora', 'teacher'),
('admin@utp.edu.pe', 'admin123', 'Soporte IT', 'admin');