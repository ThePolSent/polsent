/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const GATEWAY = 'http://localhost:3000/api';

// --- COMPONENTE MODAL GENÉRICO ---
const Modal = ({ isOpen, title, children, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 style={{ color: 'var(--utp-blue)', marginTop: 0 }}>{title}</h3>
        {children}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          { }
        </div>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');


  // --- ESTADOS DE DATOS ---
  const [availableCourses, setAvailableCourses] = useState([]); // Catálogo (Postgres)
  const [kardexCodes, setKardexCodes] = useState([]); // Cursos aprobados (Mongo - Lista simple)
  const [fullKardex, setFullKardex] = useState([]); // Historial detallado (Mongo)
  const [cart, setCart] = useState([]); // Carrito temporal
  const [pricingRules, setPricingRules] = useState({ credit_limit: 22, extra_credit_cost: 50 });
  const [teachersList, setTeachersList] = useState([]); // Lista de profes para el Admin

  // --- ESTADOS DE UI/FORMULARIO ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('matricula'); // 'matricula' | 'historial'
  const [modal, setModal] = useState({ open: false, type: '', data: null });
  const [loadingPay, setLoadingPay] = useState(false);

  // --- ESTADOS FORM ADMIN ---
  const [userErrors, setUserErrors] = useState({});
  const [courseErrors, setCourseErrors] = useState({});
  const validateAdminUser = () => {
  let errors = {};

  // Nombre
  if (!newTeacher.full_name.trim()) {
    errors.full_name = "El nombre no puede estar vacío.";
  } else if (newTeacher.full_name.trim().length < 3) {
    errors.full_name = "Debe tener al menos 3 caracteres.";
  }

  // Email institucional
  if (!newTeacher.email.trim()) {
    errors.email = "El email es obligatorio.";
  } else if (!/^[\w.-]+@utp\.edu\.pe$/.test(newTeacher.email)) {
    errors.email = "Debe ser un correo institucional válido (@utp.edu.pe).";
  }

  // Password
  if (!newTeacher.password.trim()) {
    errors.password = "La contraseña es obligatoria.";
  } else if (newTeacher.password.length < 6) {
    errors.password = "Debe tener al menos 6 caracteres.";
  }

  // Rol
  if (!["teacher", "student", "admin"].includes(newTeacher.role)) {
    errors.role = "Rol inválido.";
  }

  setUserErrors(errors);
  return Object.keys(errors).length === 0;
};
  const [newCourse, setNewCourse] = useState({
    code: '', name: '', credits: 3, hours: 48, base_cost: 300, prerequisite_code: '', teacher_id: ''
  });
  const [newTeacher, setNewTeacher] = useState({ full_name: '', email: '', password: '', role: 'teacher' });

  // --- CÁLCULOS EN TIEMPO REAL (MEMOIZED) ---
  const totals = cart.reduce((acc, c) => ({
    credits: acc.credits + c.credits,
    hours: acc.hours + c.hours,
    baseCost: acc.baseCost + parseFloat(c.base_cost)
  }), { credits: 0, hours: 0, baseCost: 0 });

  const extraCredits = Math.max(0, totals.credits - pricingRules.credit_limit);
  const extraCost = extraCredits * parseFloat(pricingRules.extra_credit_cost);
  const finalTotal = totals.baseCost + extraCost;

  // --- EFECTOS DE CARGA ---
  useEffect(() => {
    if (!user) return;
    if (user.role === 'student') loadStudentData();
    if (user.role === 'admin') loadAdminData();
    if (user.role === 'teacher') loadTeacherData();
  }, [user]);

  const loadStudentData = async () => {
    try {
      // 1. Cargar Cursos y Reglas (Postgres)
      const [coursesRes, rulesRes] = await Promise.all([
        axios.get(`${GATEWAY}/academic/courses`),
        axios.get(`${GATEWAY}/academic/pricing-rules`)
      ]);
      setAvailableCourses(coursesRes.data);
      if (rulesRes.data) setPricingRules(rulesRes.data);

      // 2. Cargar Historial (Mongo)
      const histRes = await axios.get(`${GATEWAY}/enrollment/kardex/${user.id}`);
      setKardexCodes(histRes.data.codes); // ['CS101', 'MATH1']
      setFullKardex(histRes.data.fullHistory);
    } catch (error) { alert('Error cargando datos del alumno'); }
  };

  const loadAdminData = async () => {
    // Carga cursos (para prerequisitos) y lista de usuarios (para filtrar profes)
    const coursesRes = await axios.get(`${GATEWAY}/academic/courses`);
    setAvailableCourses(coursesRes.data);

    // Simulación: Traemos un rango de IDs esperando encontrar profesores
    const dummyIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const usersRes = await axios.post(`${GATEWAY}/auth/users-by-ids`, { ids: dummyIds });
    // Filtramos en frontend solo para mostrar teachers (en un caso real el endpoint filtraría)
    /* Nota: Como la BD MySQL de usuarios es simple, asumimos que el endpoint devuelve todo lo que encuentre */
    setTeachersList(usersRes.data);
  };

  const loadTeacherData = async () => {
    try {
      const { data: courses } = await axios.get(`${GATEWAY}/academic/courses`);

      const teacherId = Number(user.id);

      const assignedCourses = courses.filter(
        (course) => course.teacher_id === teacherId
      );

      setAvailableCourses(assignedCourses);

    } catch (error) {
      console.error("Error al cargar cursos del docente:", error);
      alert("Error cargando datos del docente");
    }
  };
  // ----------------------------
  // Validación de Cursos (Admin)
  // ----------------------------
  const validateAdminCourse = () => {
    const errors = {};

    const code = newCourse.code.trim();
    const name = newCourse.name.trim();
    const credits = parseInt(newCourse.credits, 10);
    const baseCost = parseFloat(newCourse.base_cost);
    const prereq = newCourse.prerequisite_code;

    // Código del Curso
    if (!code) {
      errors.code = "El código es obligatorio.";
    } else if (!/^[A-Z]{2,4}\d{2,4}$/.test(code)) {
      errors.code = "Formato inválido (Ej: CS105).";
    }

    // Nombre del Curso
    if (!name) {
      errors.name = "El nombre es obligatorio.";
    } else if (name.length < 5) {
      errors.name = "Debe tener al menos 5 caracteres.";
    }

    // Créditos
    if (isNaN(credits) || credits < 1 || credits > 6) {
      errors.credits = "Debe ser un número entre 1 y 6.";
    }

    // Costo Base
    if (isNaN(baseCost) || baseCost < 100) {
      errors.base_cost = "El costo debe ser S/ 100 o más.";
    }

    // Profesor responsable
    if (!newCourse.teacher_id) {
      errors.teacher_id = "Debe asignar un profesor.";
    }

    // Prerrequisito (opcional, pero si se coloca debe existir)
    if (prereq && !availableCourses.some(c => c.code === prereq)) {
      errors.prerequisite_code = "El prerrequisito seleccionado no existe.";
    }

    setCourseErrors(errors);
    return Object.keys(errors).length === 0;
  };


  // --------------------------------
  // Crear Usuario-Profesor (Admin)
  // --------------------------------
  const handleAdminCreateTeacher = async (e) => {
    e.preventDefault();

    // Validación previa
    if (!validateAdminUser()) return;

    try {
      await axios.post(`${GATEWAY}/auth/admin/create-user`, newTeacher);
      alert('Usuario Creado');

      // Reset form
      setNewTeacher({
        full_name: '',
        email: '',
        password: '',
        role: 'teacher'
      });

      loadAdminData();
    } catch (error) {
      alert('Error creando usuario');
    }
  };


  // --- LÓGICA CORE DE NEGOCIO (ALUMNO) ---
  const checkCourseStatus = (course) => {
    // 1. ¿Ya Aprobado?
    if (kardexCodes.includes(course.code)) return { canAdd: false, msg: 'Completado', color: 'green' };

    // 2. ¿Ya en carrito?
    if (cart.find(c => c.code === course.code)) return { canAdd: false, msg: 'En carrito', color: 'blue' };

    // 3. ¿Tiene Prerrequisito?
    if (course.prerequisite_code) {
      const prereqPassed = kardexCodes.includes(course.prerequisite_code);
      if (!prereqPassed) {
        // Si no lo pasé, ¿lo estoy llevando ahora en el carrito?
        const prereqInCart = cart.find(c => c.code === course.prerequisite_code);
        if (prereqInCart) {
          // REGLA CRÍTICA: No llevar Curso B si Curso A está en el mismo carrito
          return { canAdd: false, msg: `Bloqueado: Debes aprobar ${course.prerequisite_code} primero`, color: 'red' };
        }
        return { canAdd: false, msg: `Falta req: ${course.prerequisite_code}`, color: 'red' };
      }
    }
    return { canAdd: true };
  };

  const addToCart = (course) => {
    const status = checkCourseStatus(course);
    if (!status.canAdd) {
      setModal({ open: true, type: 'alert', data: { title: 'No disponible', msg: status.msg } });
      return;
    }
    setCart([...cart, course]);
  };

  const removeFromCart = (code) => {
    setCart(cart.filter(c => c.code !== code));
  };

  // --- OPERACIONES ---
  const [loginErrors, setLoginErrors] = useState({});

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginErrors({}); // Resetear errores al intentar iniciar sesión

    let errors = {};
    let isValid = true;

    // Validación de Correo (@utp.edu.pe)
    if (!email.trim()) {
      errors.email = "El correo es obligatorio.";
      isValid = false;
    } else if (!/^[\w.-]+@utp\.edu\.pe$/.test(email)) {
      errors.email = "Debe ser un correo institucional válido (@utp.edu.pe).";
      isValid = false;
    }

    // Validación de Contraseña
    if (!password) {
      errors.password = "La contraseña es obligatoria.";
      isValid = false;
    }

    setLoginErrors(errors);

    if (!isValid) return; // Detener si la validación falla

    try {
      const res = await axios.post(`${GATEWAY}/auth/login`, { email, password });
      setUser(res.data.user);
      setView('dashboard');
    } catch (e) {
      // Si la API falla (credenciales incorrectas u otro error de servidor)
      setLoginErrors({ general: 'Credenciales incorrectas. Inténtalo de nuevo.' });
    }
  };

  const handlePayment = async () => {
    setLoadingPay(true);
    try {
      // 1. Simular Pasarela (Node)
      await axios.post(`${GATEWAY}/payments/process-payment`, {
        amount: finalTotal,
        studentId: user.id,
        cardNumber: '4111-2222-3333-4444'
      });

      // 2. Guardar Matrícula (Mongo)
      const enrollmentData = {
        studentId: user.id,
        studentName: user.full_name,
        semester: '2025-1',
        courses: cart,
        totalCredits: totals.credits,
        totalCost: finalTotal,
        paid: true
      };
      await axios.post(`${GATEWAY}/enrollment/enroll-batch`, enrollmentData);

      // 3. Éxito
      setLoadingPay(false);
      setModal({ open: false }); // Cerrar modal de pago
      setCart([]); // Vaciar carrito

      // 4. Refrescar Historial
      const histRes = await axios.get(`${GATEWAY}/enrollment/kardex/${user.id}`);
      setKardexCodes(histRes.data.codes);
      setFullKardex(histRes.data.fullHistory);

      setModal({ open: true, type: 'alert', data: { title: '¡Éxito!', msg: 'Matrícula procesada correctamente. Revisa tu historial.' } });

    } catch (error) {
      setLoadingPay(false);
      alert('Error en el pago o registro.');
    }
  };

  const handleAdminCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${GATEWAY}/academic/courses`, newCourse);
      alert('Curso Creado');
      setNewCourse({ code: '', name: '', credits: 3, hours: 48, base_cost: 300, prerequisite_code: '', teacher_id: '' });
      loadAdminData(); // Refrescar listas
    } catch (e) { alert('Error creando curso'); }
  };


  // --- VISTAS ---

  if (!user) return (
    <div className="login-box card">
      <div className="logo">UTP<span>+class</span></div>
      <h2 style={{ color: '#666' }}>Acceso Institucional</h2>
      <form onSubmit={handleLogin}>
        {/* CORREO */}
        <input
          className={`input-field ${loginErrors.email ? 'error' : ''}`} // <-- ESTILO CONDICIONAL
          type="text" // Cambiado de 'email' a 'text' para que nuestra validación personalizada funcione mejor
          placeholder="Correo Institucional (ej: alumno@utp.edu.pe)"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        {loginErrors.email && (
          <p className="error-message">{loginErrors.email}</p> // <-- MENSAJE DE ERROR
        )}

        {/* CONTRASEÑA */}
        <input
          className={`input-field ${loginErrors.password ? 'error' : ''}`} // <-- ESTILO CONDICIONAL
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {loginErrors.password && (
          <p className="error-message">{loginErrors.password}</p> // <-- MENSAJE DE ERROR
        )}

        {/* ERROR GENERAL DE CREDENCIALES (si falla la API) */}
        {loginErrors.general && (
          <p className="error-message" style={{ textAlign: 'center', fontWeight: 'bold' }}>
            {loginErrors.general}
          </p>
        )}

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '15px' }}>
          Ingresar
        </button>
      </form>
      <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#999' }}>
        Demo: admin@utp.edu.pe | alumno@utp.edu.pe | profe@utp.edu.pe <br /> (Pass: 123456 / admin123)
      </div>
    </div>
  );

  return (
    <div>
      {/* HEADER */}
      <header className="header">
        <div className="logo">UTP<span>+class</span> <small style={{ fontSize: '1rem', color: '#888' }}>| {user.role.toUpperCase()}</small></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>Hola, <strong>{user.full_name}</strong></span>
          <button className="btn btn-outline" onClick={() => window.location.reload()}>Salir</button>
        </div>
      </header>

      <div className="container">

        {/* --- VISTA ALUMNO --- */}
        {user.role === 'student' && (
          <>
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
              <button className={`btn-tab ${activeTab === 'matricula' ? 'active' : ''}`} onClick={() => setActiveTab('matricula')}>Nueva Matrícula</button>
              <button className={`btn-tab ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>Historial Académico</button>
            </div>

            {activeTab === 'matricula' && (
              <div className="dashboard-grid">
                {/* COLUMNA IZQ: CATÁLOGO */}
                <div className="card">
                  <div className="card-header">
                    <span>Oferta Académica 2025-1</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>PostgreSQL Data</span>
                  </div>
                  {availableCourses.map(c => {
                    const status = checkCourseStatus(c);
                    return (
                      <div key={c.code} className="course-item">
                        <div className="course-info">
                          <h4>{c.name}</h4>
                          <div className="course-meta">
                            <span className="badge">{c.code}</span>
                            <span>{c.credits} créditos</span>
                            {c.prerequisite_code && <span className="badge badge-req">Req: {c.prerequisite_code}</span>}
                          </div>
                        </div>
                        <div>
                          {status.canAdd ? (
                            <button className="btn btn-primary" onClick={() => addToCart(c)}>Agregar</button>
                          ) : (
                            <span className={status.color === 'green' ? 'status-ok' : 'status-blocked'}>
                              {status.color === 'green' ? '✓ ' : '🔒 '} {status.msg}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* COLUMNA DER: CARRITO */}
                <div className="card" style={{ position: 'sticky', top: '20px' }}>
                  <div className="card-header">
                    <span>Mi Matrícula</span>
                    <span style={{ fontSize: '0.9rem' }}>Temp</span>
                  </div>
                  {cart.length === 0 ? <p style={{ color: '#999', textAlign: 'center' }}>Selecciona cursos para simular tu matrícula.</p> : (
                    <>
                      {cart.map(c => (
                        <div key={c.code} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem' }}>
                          <span>{c.name}</span>
                          <button className="btn-danger" style={{ border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => removeFromCart(c.code)}>X</button>
                        </div>
                      ))}

                      <div className="cart-summary">
                        <div className="summary-row"><span>Créditos:</span> <b>{totals.credits}</b></div>
                        <div className="summary-row"><span>Costo Base:</span> <span>S/ {totals.baseCost}</span></div>
                        {extraCredits > 0 && (
                          <div className="summary-row" style={{ color: 'var(--utp-red)' }}>
                            <span>Recargo ({extraCredits} creds):</span>
                            <span>+ S/ {extraCost}</span>
                          </div>
                        )}
                        <div className="total-price">S/ {finalTotal.toFixed(2)}</div>
                      </div>

                      <button className="btn btn-primary" style={{ width: '100%', marginTop: '15px' }}
                        onClick={() => setModal({ open: true, type: 'pay' })}>
                        Procesar Matrícula
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'historial' && (
              <div className="card">
                <div className="card-header">Mi Kárdex (MongoDB)</div>
                {fullKardex.length === 0 && <p>No hay registros de matrícula previos.</p>}
                {fullKardex.map(record => (
                  <div key={record._id} style={{ marginBottom: '25px' }}>
                    <div style={{ background: '#f0f0f0', padding: '10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <strong>Ciclo {record.semester}</strong>
                      <small>{new Date(record.enrolledAt).toLocaleDateString()}</small>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                      <thead><tr style={{ textAlign: 'left', fontSize: '0.9rem', color: '#666' }}><th>Cód</th><th>Curso</th><th>Créditos</th><th>Estado</th></tr></thead>
                      <tbody>
                        {record.courses.map(c => (
                          <tr key={c.code} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '8px' }}>{c.code}</td>
                            <td>{c.name}</td>
                            <td>{c.credits}</td>
                            <td style={{ color: 'green', fontWeight: 'bold' }}>Aprobado</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      {user.role === 'admin' && (
        <div className="dashboard-grid">

          {/* ---------- 1. Registrar Usuarios (MySQL) ---------- */}
          <div className="card">
            <div className="card-header">1. Registrar Usuarios (MySQL)</div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (validateAdminUser()) {
                  handleAdminCreateTeacher(e);
                }
              }}
            >
              {/* Nombre Completo */}
              <input
                className="input-field"
                placeholder="Nombre Completo"
                value={newTeacher.full_name}
                onChange={(e) =>
                  setNewTeacher({ ...newTeacher, full_name: e.target.value })
                }
              />
              {userErrors.full_name && (
                <p className="error-message">{userErrors.full_name}</p>
              )}

              {/* Email UTP */}
              <input
                className="input-field"
                placeholder="Email UTP"
                value={newTeacher.email}
                onChange={(e) =>
                  setNewTeacher({ ...newTeacher, email: e.target.value })
                }
              />
              {userErrors.email && (
                <p className="error-message">{userErrors.email}</p>
              )}

              {/* Password */}
              <input
                className="input-field"
                type="password"
                placeholder="Password"
                value={newTeacher.password}
                onChange={(e) =>
                  setNewTeacher({ ...newTeacher, password: e.target.value })
                }
              />
              {userErrors.password && (
                <p className="error-message">{userErrors.password}</p>
              )}

              {/* Tipo de Usuario */}
              <label style={{ fontSize: "0.8rem", fontWeight: "bold" }}>
                Tipo de Usuario:
              </label>

              <select
                className="input-field"
                value={newTeacher.role}
                onChange={(e) =>
                  setNewTeacher({ ...newTeacher, role: e.target.value })
                }
              >
                <option value="teacher">Profesor</option>
                <option value="student">Alumno</option>
                <option value="admin">Administrador</option>
              </select>

              {userErrors.role && (
                <p className="error-message">{userErrors.role}</p>
              )}

              <button className="btn btn-primary">Registrar Usuario</button>
            </form>
          </div>

          {/* ---------- 2. Crear Curso (PostgreSQL) ---------- */}
          <div className="card">
            <div className="card-header">2. Crear Curso (PostgreSQL)</div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (validateAdminCourse()) {
                  handleAdminCreateCourse(e);
                }
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                {/* Código */}
                <div>
                  <input
                    className="input-field"
                    placeholder="Código (CS105)"
                    value={newCourse.code}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, code: e.target.value })
                    }
                  />
                  {courseErrors.code && (
                    <p className="error-message">{courseErrors.code}</p>
                  )}
                </div>

                {/* Nombre */}
                <div>
                  <input
                    className="input-field"
                    placeholder="Nombre"
                    value={newCourse.name}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, name: e.target.value })
                    }
                  />
                  {courseErrors.name && (
                    <p className="error-message">{courseErrors.name}</p>
                  )}
                </div>

                {/* Créditos */}
                <div>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="Créditos"
                    value={newCourse.credits}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, credits: e.target.value })
                    }
                  />
                  {courseErrors.credits && (
                    <p className="error-message">{courseErrors.credits}</p>
                  )}
                </div>

                {/* Costo */}
                <div>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="Costo"
                    value={newCourse.base_cost}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, base_cost: e.target.value })
                    }
                  />
                  {courseErrors.base_cost && (
                    <p className="error-message">{courseErrors.base_cost}</p>
                  )}
                </div>
              </div>

              {/* Profesor Responsable */}
              <label
                style={{
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  display: "block",
                  marginTop: "10px",
                }}
              >
                Profesor Responsable:
              </label>

              <select
                className="input-field"
                value={newCourse.teacher_id}
                onChange={(e) =>
                  setNewCourse({ ...newCourse, teacher_id: e.target.value })
                }
              >
                <option value="">-- Seleccionar --</option>
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.role})
                  </option>
                ))}
              </select>

              {courseErrors.teacher_id && (
                <p className="error-message">{courseErrors.teacher_id}</p>
              )}

              {/* Prerrequisito */}
              <label
                style={{
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  display: "block",
                  marginTop: "10px",
                }}
              >
                Prerrequisito:
              </label>

              <select
                className="input-field"
                value={newCourse.prerequisite_code}
                onChange={(e) =>
                  setNewCourse({
                    ...newCourse,
                    prerequisite_code: e.target.value,
                  })
                }
              >
                <option value="">-- Ninguno --</option>
                {availableCourses.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>

              {courseErrors.prerequisite_code && (
                <p className="error-message">{courseErrors.prerequisite_code}</p>
              )}

              <button className="btn btn-primary" style={{ width: "100%" }}>
                Guardar Curso
              </button>
            </form>
          </div>
        </div>
      )}


        {/* --- VISTA TEACHER --- */}
        {user.role === "teacher" && (
          <div className="card">
            <div className="card-header">Mis Cursos Asignados (PostgreSQL)</div>

            {availableCourses.length === 0 ? (
              <p
                style={{
                  color: "#999",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                No tienes cursos asignados para el periodo actual.
              </p>
            ) : (
              <div>
                <p
                  style={{
                    marginBottom: "20px",
                    fontSize: "0.9rem",
                    color: "#666",
                  }}
                >
                  A continuación se listan los cursos de tu responsabilidad.
                </p>

                {availableCourses.map((c) => (
                  <div
                    key={c.code}
                    className="course-item"
                    style={{
                      border: "1px solid #eee",
                      marginBottom: "10px",
                      padding: "15px",
                    }}
                  >
                    <div className="course-info">
                      <h4>
                        {c.name}
                        <span
                          className="badge"
                          style={{
                            background: "#f0f0f0",
                            color: "#333",
                            marginLeft: "8px",
                          }}
                        >
                          {c.code}
                        </span>
                      </h4>

                      <div className="course-meta">
                        <span>
                          Créditos: <b>{c.credits}</b>
                        </span>{" "}
                        |{" "}
                        <span>
                          Costo Base: S/ <b>{c.base_cost}</b>
                        </span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}


      </div>

      {/* --- MODALES --- */}
      {modal.open && (
        <Modal isOpen={modal.open} title={modal.type === 'pay' ? 'Confirmar Matrícula' : modal.data?.title}>
          {modal.type === 'alert' && (
            <>
              <p>{modal.data?.msg}</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setModal({ open: false })}>Entendido</button>
              </div>
            </>
          )}

          {modal.type === 'pay' && (
            <>
              <p>Vas a matricularte en <strong>{cart.length} cursos</strong>.</p>
              <h1 style={{ textAlign: 'center', color: 'var(--utp-red)' }}>S/ {finalTotal.toFixed(2)}</h1>
              <p style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>Se simulará el cobro a la tarjeta terminada en 4444.</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={() => setModal({ open: false })} disabled={loadingPay}>Cancelar</button>
                <button className="btn btn-primary" onClick={handlePayment} disabled={loadingPay}>
                  {loadingPay ? 'Procesando...' : 'Pagar Ahora'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

    </div>
  );
}

export default App;