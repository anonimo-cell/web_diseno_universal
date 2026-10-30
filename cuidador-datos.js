// Datos de los pacientes a cargo del cuidador (de ejemplo hasta que haya servidor).
// Se guardan en el navegador para que los cambios (pautas, avisos) se mantengan entre páginas.
// Lo usan cuidador.html y cuidador-medicacion.html, después de comun.js.

const PACIENTES_INICIALES = [
  {
    nombre: "Rosa", edad: 82, telefono: "611223344",
    // Código que el paciente ve en su perfil y que sirve para asociarlo al cuidador
    codigo: "VH-4821-7395", alergias: "Penicilina", patologias: "Hipertensión",
    tomas: [
      { hora: "08:00", nombre: "Tensión", dosis: "1 comprimido", tomada: true },
      { hora: "14:00", nombre: "Vitamina D", dosis: "1 cápsula", tomada: false },
      { hora: "21:00", nombre: "Estómago", dosis: "1 sobre", tomada: false }
    ],
    // % de tomas confirmadas cada día de esta semana (lunes → domingo)
    semana: [100, 100, 100, 60, 100, 95, 90],
    historial: [
      { semana: "13 – 19 oct", porcentaje: 88 },
      { semana: "6 – 12 oct", porcentaje: 95 },
      { semana: "29 sep – 5 oct", porcentaje: 79 },
      { semana: "22 – 28 sep", porcentaje: 91 }
    ],
    avisoMinutos: 30,
    movimientos: [
      { lugar: "Salón", hace: 5 },
      { lugar: "Cocina", hace: 42 },
      { lugar: "Dormitorio", hace: 130 }
    ],
    alertas: [
      { texto: "Puerta de la entrada abierta", hace: 12 }
    ],
    // Sensores de la casa: activo = encendida (luz) o abierta (puerta, ventana)
    casa: {
      temperatura: 30,
      dispositivos: [
        { tipo: "luz", lugar: "Cocina", activo: false },
        { tipo: "luz", lugar: "Salón", activo: true },
        { tipo: "luz", lugar: "Dormitorio", activo: false },
        { tipo: "luz", lugar: "Baño", activo: false },
        { tipo: "luz", lugar: "Pasillo", activo: true },
        { tipo: "puerta", lugar: "Entrada", activo: true },
        { tipo: "puerta", lugar: "Terraza", activo: false },
        { tipo: "puerta", lugar: "Baño", activo: false },
        { tipo: "ventana", lugar: "Cocina", activo: false },
        { tipo: "ventana", lugar: "Salón", activo: false },
        { tipo: "ventana", lugar: "Dormitorio", activo: true },
        { tipo: "ventana", lugar: "Baño", activo: false }
      ]
    }
  },
  {
    nombre: "Paco", edad: 79, telefono: "622334455",
    codigo: "VH-1962-3795", alergias: "", patologias: "Artrosis, fibrilación auricular",
    tomas: [
      { hora: "08:00", nombre: "Sintrom", dosis: "½ comprimido", tomada: true },
      { hora: "09:00", nombre: "Omeprazol", dosis: "1 cápsula", tomada: true },
      { hora: "14:00", nombre: "Paracetamol", dosis: "1 g", tomada: true },
      { hora: "18:00", nombre: "Paracetamol", dosis: "1 g", tomada: true },
      { hora: "20:00", nombre: "Sintrom", dosis: "½ comprimido", tomada: true }
    ],
    semana: [100, 100, 100, 100, 100, 100, 100],
    historial: [
      { semana: "13 – 19 oct", porcentaje: 100 },
      { semana: "6 – 12 oct", porcentaje: 97 },
      { semana: "29 sep – 5 oct", porcentaje: 100 },
      { semana: "22 – 28 sep", porcentaje: 94 }
    ],
    avisoMinutos: 30,
    movimientos: [
      { lugar: "Cocina", hace: 24 },
      { lugar: "Baño", hace: 61 }
    ],
    alertas: [],
    casa: {
      temperatura: 23,
      dispositivos: [
        { tipo: "luz", lugar: "Dormitorio", activo: false },
        { tipo: "luz", lugar: "Cocina", activo: false },
        { tipo: "luz", lugar: "Salón", activo: true },
        { tipo: "luz", lugar: "Baño", activo: false },
        { tipo: "luz", lugar: "Entrada", activo: false },
        { tipo: "puerta", lugar: "Entrada", activo: false },
        { tipo: "puerta", lugar: "Terraza", activo: false },
        { tipo: "puerta", lugar: "Dormitorio", activo: true },
        { tipo: "ventana", lugar: "Salón", activo: true },
        { tipo: "ventana", lugar: "Cocina", activo: false },
        { tipo: "ventana", lugar: "Dormitorio", activo: false },
        { tipo: "ventana", lugar: "Terraza", activo: false }
      ]
    }
  }
];

// Lo guardado se completa con los datos iniciales, por si se guardó antes de que
// existiera algún apartado (por ejemplo, la casa).
// La clave lleva versión: al cambiar los ejemplos se sube el número para que se carguen
const CLAVE_PACIENTES = "pacientes-cuidador-v2";
let pacientes = PACIENTES_INICIALES;
try {
  const guardados = JSON.parse(localStorage.getItem(CLAVE_PACIENTES));
  if (Array.isArray(guardados) && guardados.length) {
    pacientes = guardados.map((p, i) => ({ ...PACIENTES_INICIALES[i], ...p }));
  }
} catch (e) {}

// Paciente recién asociado por su código: aún sin medicación, historial ni sensores
function nuevoPaciente(datos) {
  return {
    alergias: "", patologias: "",
    tomas: [], semana: [], historial: [], avisoMinutos: 30,
    movimientos: [], alertas: [],
    casa: { temperatura: 22, dispositivos: [] },
    ...datos
  };
}

function guardarPacientes() {
  try { localStorage.setItem(CLAVE_PACIENTES, JSON.stringify(pacientes)); } catch (e) {}
}

// Estado de una toma de hoy: tomada, pendiente (ya pasó su hora) o más tarde (aún no toca)
function estadoToma(toma) {
  if (toma.tomada) return "tomada";
  const [h, m] = toma.hora.split(":").map(Number);
  const ahora = new Date();
  return h * 60 + m > ahora.getHours() * 60 + ahora.getMinutes() ? "mas-tarde" : "pendiente";
}

// Texto, clase de color e icono de cada estado (color + icono + palabra, WCAG 1.4.1)
const ESTADOS_TOMA = {
  "tomada": {
    texto: "Tomada", clase: "ok",
    icono: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'
  },
  "pendiente": {
    texto: "Pendiente", clase: "alerta",
    icono: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5M12 16.5v.01"/>'
  },
  "mas-tarde": {
    texto: "Más tarde", clase: "espera",
    icono: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  }
};

const tomasConfirmadas = p => p.tomas.filter(t => t.tomada).length;
