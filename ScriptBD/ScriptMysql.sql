-- ==========================================
-- SCRIPT 1: MySQL - Base de Datos de Usuarios
-- ==========================================
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

-- Insertar usuarios de prueba
INSERT INTO users (email, password, full_name, role) VALUES 
-- Estudiantes
('juan.perez@utp.edu.pe', '123456', 'Juan Carlos Pérez González', 'student'),
('maria.lopez@utp.edu.pe', '123456', 'María Fernanda López Torres', 'student'),
('carlos.ruiz@utp.edu.pe', '123456', 'Carlos Alberto Ruiz Vega', 'student'),
('ana.garcia@utp.edu.pe', '123456', 'Ana Lucía García Mendoza', 'student'),
('luis.martinez@utp.edu.pe', '123456', 'Luis Eduardo Martínez Silva', 'student'),

-- Profesores
('rosa.fernandez@utp.edu.pe', '123456', 'Dra. Rosa Elena Fernández', 'teacher'),
('jorge.silva@utp.edu.pe', '123456', 'Dr. Jorge Antonio Silva Rojas', 'teacher'),
('patricia.diaz@utp.edu.pe', '123456', 'Mg. Patricia Isabel Díaz Castro', 'teacher'),
('roberto.chavez@utp.edu.pe', '123456', 'Ing. Roberto Luis Chávez Ramos', 'teacher'),

-- Administradores
('admin@utp.edu.pe', 'admin123', 'Soporte Técnico UTP', 'admin'),
('secretaria@utp.edu.pe', 'admin123', 'Secretaría Académica', 'admin');
