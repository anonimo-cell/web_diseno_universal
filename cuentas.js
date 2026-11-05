// Cuentas y formularios de acceso: lo comparten index.html (entrar, restablecer contraseña)
// y registro.html (crear cuenta). Se carga después de comun.js.

// ---------- Cuentas ----------
// Prototipo sin servidor: las cuentas se guardan en el navegador (la contraseña en claro,
// solo para la demo). Cuentas de prueba:
//   pacientes: mario / 1234, carmen / carmen123 · cuidadores: dara / 1234, paula / paula123
// "cuidadores": familiares vinculados al paciente, los que reciben su SOS (Mario → Dara)
const USUARIOS_INICIALES = {
  mario: { nombre: "Mario", telefono: "655123456", clave: "1234", tipo: "paciente", cuidadores: ["dara"] },
  dara: { nombre: "Dara", telefono: "677123456", clave: "1234", tipo: "cuidador" },
  carmen: { nombre: "Carmen García", telefono: "612345678", clave: "carmen123", tipo: "paciente", cuidadores: ["paula"] },
  paula: { nombre: "Paula Martín", telefono: "634567890", clave: "paula123", tipo: "cuidador" }
};
// Cada tipo de perfil entra en su propia aplicación
const DESTINOS = { paciente: "inicio.html", cuidador: "cuidador.html" };

let usuarios = { ...USUARIOS_INICIALES };
try { usuarios = { ...USUARIOS_INICIALES, ...JSON.parse(localStorage.getItem("usuarios")) }; } catch (e) {}

function guardarUsuarios() {
  try { localStorage.setItem("usuarios", JSON.stringify(usuarios)); } catch (e) {}
}

function entrar(usuario) {
  const u = usuarios[usuario];
  // Las cuentas guardadas antes de existir la vinculación no la tienen: se toma la de ejemplo
  const cuidadores = u.cuidadores || USUARIOS_INICIALES[usuario]?.cuidadores || [];
  // Nombre y teléfono de esos familiares, para que el paciente los tenga en sus contactos
  const familiares = cuidadores.filter(id => usuarios[id])
    .map(id => ({ nombre: usuarios[id].nombre, telefono: usuarios[id].telefono }));
  // La sesión se guarda solo mientras el navegador esté abierto (ver comun.js)
  try {
    sessionStorage.setItem("familiares", JSON.stringify(familiares));
    sessionStorage.setItem("sesion", "abierta");
    sessionStorage.setItem("usuario", usuario);
    sessionStorage.setItem("cuidadores", JSON.stringify(cuidadores)); // a quién llega su SOS
    sessionStorage.setItem("tipo-perfil", u.tipo);
    sessionStorage.setItem("nombre-usuario", u.nombre);
    sessionStorage.setItem("telefono-usuario", u.telefono); // para que el cuidador pueda llamarle si pulsa SOS
  } catch (e) {}
  location.href = DESTINOS[u.tipo];
}

// Usuarios sin mayúsculas ni espacios alrededor: "Carmen " y "carmen" son el mismo
const normalizar = texto => texto.trim().toLowerCase();
// "612 345 678", "+34612345678"… → "612345678"
const soloCifras = texto => texto.replace(/[\s.-]/g, "").replace(/^\+?34(?=\d{9}$)/, "");
const formatoTelefono = t => "+34 " + t.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");

// ---------- Errores en los campos ----------
// Cada campo tiene su <p id="error-ID">. El foco va al primer campo con error
// y el lector lee el mensaje porque está en su aria-describedby (WCAG 3.3.1).
function comprobar(reglas) {
  let primero = null;
  reglas.forEach(([id, mensaje]) => {
    document.getElementById(id).setAttribute("aria-invalid", String(Boolean(mensaje)));
    document.getElementById("error-" + id).textContent = mensaje || "";
    if (mensaje && !primero) primero = id;
  });
  if (primero) document.getElementById(primero).focus();
  return !primero;
}

function limpiarErrores(contenedor) {
  contenedor.querySelectorAll(".campo-error").forEach(p => { p.textContent = ""; });
  contenedor.querySelectorAll("[aria-invalid]").forEach(el => el.removeAttribute("aria-invalid"));
}

const errorClave = valor => valor.length < 6 ? "La contraseña debe tener al menos 6 caracteres" : "";
const errorRepetir = (valor, original) => valor !== original ? "Las contraseñas no coinciden" : "";

// ---------- Códigos por SMS y correo (simulados) ----------
// Sin servidor no se pueden enviar: el código se muestra en un recuadro de prueba
const generarCodigo = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");

function enviarSms(demo) {
  const codigo = generarCodigo();
  demo.textContent = `Prototipo: el SMS llegaría al móvil. Tu código es ${codigo}`;
  return codigo;
}

// Prototipo: no se envía ningún correo y el código de confirmación es siempre el mismo
const CODIGO_CORREO = "1234";

// ---------- Formularios por pasos ----------
// Solo se ve el paso activo; el foco va a su primer campo o botón.
// "indicador" es opcional: el registro no muestra en qué paso se está.
function mostrarPaso(contenedor, paso, indicador) {
  contenedor.querySelectorAll("[data-paso]").forEach(p => { p.hidden = p.dataset.paso !== paso; });
  if (indicador !== undefined) contenedor.querySelector(".pasos-indicador").textContent = indicador;
  contenedor.querySelector(`[data-paso="${paso}"]`).querySelector("input, button:not([data-cerrar])").focus();
}

// "Mostrar contraseñas": cambia el tipo de los campos que indica data-mostrar
function mostrarClaves(check) {
  check.dataset.mostrar.split(" ").forEach(id => {
    document.getElementById(id).type = check.checked ? "text" : "password";
  });
}
document.querySelectorAll("[data-mostrar]").forEach(c => c.addEventListener("change", () => mostrarClaves(c)));

// Botón "Mostrar" junto a una contraseña: data-ver-clave indica el id de su campo
document.querySelectorAll("[data-ver-clave]").forEach(boton => {
  const campo = document.getElementById(boton.dataset.verClave);
  boton.addEventListener("click", () => {
    const visible = campo.type === "password";
    campo.type = visible ? "text" : "password";
    boton.setAttribute("aria-pressed", String(visible));
    boton.querySelector(".ver-clave-texto").textContent = visible ? "Ocultar" : "Mostrar";
    boton.querySelector(".ojo-tachado").toggleAttribute("hidden", !visible);
  });
});
