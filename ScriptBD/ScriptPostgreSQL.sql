DROP TABLE IF EXISTS courses;
CREATE TABLE courses (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    credits INT NOT NULL,
    hours INT NOT NULL,
    base_cost DECIMAL(10,2) NOT NULL, 
    teacher_id INT,
    prerequisite_code VARCHAR(10) 
);

INSERT INTO courses (code, name, credits, hours, base_cost, teacher_id, prerequisite_code) VALUES 
('CS101', 'Introducción a la Programación', 4, 64, 400.00, 2, NULL),
('CS102', 'Programación Orientada a Objetos', 5, 80, 500.00, 2, 'CS101'),
('DB201', 'Base de Datos I', 4, 64, 400.00, NULL, NULL),
('DB202', 'Base de Datos Avanzada', 5, 80, 550.00, NULL, 'DB201'),
('MATH1', 'Matemática I', 5, 80, 300.00, NULL, NULL),
('PROJ1', 'Proyecto Integrador I', 3, 48, 350.00, NULL, 'CS102');

DROP TABLE IF EXISTS pricing_rules;
CREATE TABLE pricing_rules (
    id SERIAL PRIMARY KEY,
    credit_limit INT DEFAULT 22,
    extra_credit_cost DECIMAL(10,2) DEFAULT 50.00
);
INSERT INTO pricing_rules (credit_limit, extra_credit_cost) VALUES (22, 50.00);

