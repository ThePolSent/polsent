-- ==========================================
-- SCRIPT 2: PostgreSQL - Base de Datos Académica
-- ==========================================
-- Ejecutar en PostgreSQL:
DROP DATABASE IF EXISTS utp_academic_db;
CREATE DATABASE utp_academic_db;

\c utp_academic_db;

-- Tabla de Cursos
DROP TABLE IF EXISTS courses CASCADE;
CREATE TABLE courses (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    credits INTEGER NOT NULL,
    hours INTEGER NOT NULL,
    base_cost DECIMAL(10,2) NOT NULL,
    teacher_id INTEGER,
    prerequisite_code VARCHAR(20),
    FOREIGN KEY (prerequisite_code) REFERENCES courses(code)
);

-- Tabla de Reglas de Precio
DROP TABLE IF EXISTS pricing_rules;
CREATE TABLE pricing_rules (
    id SERIAL PRIMARY KEY,
    credit_limit INTEGER NOT NULL DEFAULT 22,
    extra_credit_cost DECIMAL(10,2) NOT NULL DEFAULT 50.00
);

-- Insertar reglas de precio
INSERT INTO pricing_rules (credit_limit, extra_credit_cost) VALUES (22, 50.00);

-- Insertar cursos (Ciclo 1 - Sin prerrequisitos)
INSERT INTO courses VALUES 
('MAT101', 'Matemática Básica', 4, 64, 320.00, 6, NULL),
('COM101', 'Comunicación I', 3, 48, 270.00, 8, NULL),
('ING101', 'Inglés I', 3, 48, 270.00, 8, NULL),
('HUM101', 'Desarrollo Personal', 2, 32, 200.00, 8, NULL),
('INF101', 'Introducción a la Programación', 4, 64, 350.00, 6, NULL);

-- Insertar cursos (Ciclo 2 - Con prerrequisitos)
INSERT INTO courses VALUES 
('MAT201', 'Cálculo I', 4, 64, 340.00, 6, 'MAT101'),
('FIS201', 'Física I', 4, 64, 340.00, 7, 'MAT101'),
('INF201', 'Programación Orientada a Objetos', 4, 64, 370.00, 6, 'INF101'),
('COM201', 'Comunicación II', 3, 48, 270.00, 8, 'COM101'),
('ING201', 'Inglés II', 3, 48, 270.00, 8, 'ING101');

-- Insertar cursos (Ciclo 3)
INSERT INTO courses VALUES 
('MAT301', 'Cálculo II', 4, 64, 360.00, 6, 'MAT201'),
('EST301', 'Estadística Aplicada', 3, 48, 300.00, 7, 'MAT101'),
('INF301', 'Estructura de Datos', 4, 64, 380.00, 6, 'INF201'),
('BDD301', 'Base de Datos I', 4, 64, 380.00, 9, 'INF201'),
('WEB301', 'Desarrollo Web I', 3, 48, 330.00, 9, 'INF201');

-- Insertar cursos (Ciclo 4)
INSERT INTO courses VALUES 
('INF401', 'Algoritmos Avanzados', 4, 64, 400.00, 6, 'INF301'),
('BDD401', 'Base de Datos II', 4, 64, 400.00, 9, 'BDD301'),
('WEB401', 'Desarrollo Web II', 4, 64, 380.00, 9, 'WEB301'),
('ARQ401', 'Arquitectura de Software', 3, 48, 350.00, 7, 'INF301'),
('SIS401', 'Análisis de Sistemas', 3, 48, 340.00, 8, 'BDD301');

-- Verificar datos insertados
SELECT 'Total de cursos:', COUNT(*) FROM courses;
SELECT 'Cursos sin prerrequisito:', COUNT(*) FROM courses WHERE prerequisite_code IS NULL;
SELECT 'Cursos con prerrequisito:', COUNT(*) FROM courses WHERE prerequisite_code IS NOT NULL;

