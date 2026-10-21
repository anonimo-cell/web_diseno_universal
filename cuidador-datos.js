// Datos de los pacientes a cargo del cuidador (de ejemplo hasta que haya servidor).
// Se guardan en el navegador para que los cambios (pautas, avisos) se mantengan entre páginas.
// Lo usan cuidador.html y cuidador-medicacion.html, después de comun.js.

const PACIENTES_INICIALES = [
  {
    nombre: "Rosa", edad: 82, telefono: "611223344",
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
    ]
  },
  {
    nombre: "Paco", edad: 79, telefono: "622334455",
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
    alertas: []
  }
];

let pacientes = PACIENTES_INICIALES;
try {
  const guardados = JSON.parse(localStorage.getItem("pacientes-cuidador"));
  if (Array.isArray(guardados) && guardados.length) pacientes = guardados;
} catch (e) {}

function guardarPacientes() {
  try { localStorage.setItem("pacientes-cuidador", JSON.stringify(pacientes)); } catch (e) {}
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
