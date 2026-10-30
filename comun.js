// Código común a todas las páginas: avisos al lector de pantalla, SOS,
// menú de accesibilidad, estado de la pastilla y temperatura.

const anuncio = document.getElementById("anuncio");
// Vacía y vuelve a escribir para que el lector repita mensajes iguales
function anunciar(texto) {
  anuncio.textContent = "";
  setTimeout(() => { anuncio.textContent = texto; }, 50);
}

// ---------- Sonido y vibración de las alertas (teléfono y tableta) ----------
// Mientras una alerta está abierta suena un pitido doble y vibra, con una pausa entre
// repeticiones, hasta que se cierra. En el ordenador no suena ni vibra.
// Los navegadores solo dejan sonar audio después de que el usuario haya tocado la página,
// así que el sonido se prepara con el primer toque o tecla.
const ES_MOVIL_O_TABLETA = matchMedia("(max-width: 1199px), (pointer: coarse)");
let audio = null;

function prepararAudio() {
  const Contexto = window.AudioContext || window.webkitAudioContext;
  if (!audio && Contexto) audio = new Contexto();
  if (audio && audio.state === "suspended") audio.resume();
}
document.addEventListener("pointerdown", prepararAudio);
document.addEventListener("keydown", prepararAudio);

// Pitido doble; el urgente (SOS) es más agudo y triple
function pitido(urgente) {
  if (!audio || audio.state !== "running") return;
  const inicio = audio.currentTime;
  const tonos = urgente ? [0, 0.3, 0.6] : [0, 0.35];
  tonos.forEach(retraso => {
    const t = inicio + retraso;
    const osc = audio.createOscillator();
    const volumen = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = urgente ? 1040 : 880;
    volumen.gain.setValueAtTime(0.0001, t);
    volumen.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    volumen.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(volumen).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  });
}

// Repite sonido + vibración cada pocos segundos hasta que se cierra la ventana
function avisarConSonido(dialogo, urgente) {
  if (!ES_MOVIL_O_TABLETA.matches) return;
  const patron = urgente ? [500, 200, 500, 200, 500] : [400, 200, 400];
  const repetir = () => {
    prepararAudio(); // lo reintenta en cada repetición por si el navegador aún no lo dejaba
    pitido(urgente);
    if (navigator.vibrate) navigator.vibrate(patron);
  };
  repetir();
  const intervalo = setInterval(repetir, urgente ? 2500 : 3000);
  dialogo.addEventListener("close", () => {
    clearInterval(intervalo);
    if (navigator.vibrate) navigator.vibrate(0);
  }, { once: true });
}

// ---------- Sesión ----------
// La sesión dura mientras el navegador esté abierto (sessionStorage): cada vez que se
// entra en la web se empieza por el inicio de sesión (index.html), que decide qué
// parte abrir según el tipo de usuario. Sin sesión, cualquier página lleva allí.
// Un cuidador que abra una página del paciente va a su propia página.
try {
  const pagina = document.body.dataset.pagina;
  if (pagina !== "login") {
    if (sessionStorage.getItem("sesion") !== "abierta") location.replace("index.html");
    else if (sessionStorage.getItem("tipo-perfil") === "cuidador" && pagina !== "cuidador") location.replace("cuidador.html");
  }
} catch (e) {}

// ---------- Enlaces a un bloque (casa.html#puertas, inicio.html#casa…) ----------
// El navegador desplaza la pantalla hasta el bloque, pero en pantalla grande no hay
// scroll (overflow: hidden) y el contenido se quedaba cortado sin poder volver.
// Se deshace ese desplazamiento y en su lugar se lleva el foco al bloque.
// Donde sí hay scroll (móvil) se deja el salto del navegador, que es lo esperado.
function irAlBloque() {
  const bloque = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (!bloque) return;
  // El overflow del body se aplica a la ventana (que se desplaza como <html>)
  for (let el = bloque.parentElement; el; el = el.parentElement) {
    const estilo = getComputedStyle(el === document.documentElement ? document.body : el);
    if (el.scrollTop && estilo.overflowY === "hidden") el.scrollTop = 0;
  }
  if (document.activeElement !== bloque && bloque.tabIndex === -1) bloque.focus({ preventScroll: true });
}
window.addEventListener("load", () => requestAnimationFrame(irAlBloque));
window.addEventListener("hashchange", irAlBloque);

// ---------- Cerrar sesión (con confirmación, para evitar toques accidentales) ----------
const dialogoSalir = document.getElementById("dialogo-salir");
if (dialogoSalir) {
  document.getElementById("abrir-salir").addEventListener("click", () => {
    dialogoSalir.showModal();
    document.getElementById("salir-no").focus(); // la opción segura tiene el foco
  });
  document.getElementById("salir-no").addEventListener("click", () => dialogoSalir.close());
  document.getElementById("salir-si").addEventListener("click", () => {
    try { sessionStorage.clear(); } catch (e) {}
    location.href = "index.html";
  });
}

// Enlaces que aún no tienen página (href="#"): no hacen nada
document.querySelectorAll('a[href="#"]').forEach(a => a.addEventListener("click", e => e.preventDefault()));

// ---------- Toma de la pastilla ----------
// El estado se guarda en el navegador para que Inicio y Medicación muestren lo mismo
function configurarPastilla(boton, alCambiar) {
  let tomada = false;
  try { tomada = localStorage.getItem("pastilla-tomada") === "1"; } catch (e) {}

  function pintar() {
    boton.classList.toggle("tomada", tomada);
    boton.querySelector(".btn-principal").innerHTML = tomada
      ? 'Tomada <span aria-hidden="true">✓</span>'
      : "Pendiente";
    boton.querySelector(".btn-secundario").textContent = tomada ? "Pulsa para deshacer" : "Pulsa al tomarla";
    if (alCambiar) alCambiar(tomada);
  }

  boton.addEventListener("click", () => {
    tomada = !tomada;
    try {
      localStorage.setItem("pastilla-tomada", tomada ? "1" : "0");
      // Al deshacer, el recordatorio no salta al instante: espera los 5 minutos de cortesía
      if (!tomada) localStorage.setItem("recordatorio-hasta", String(Date.now() + RETRASO_RECORDATORIO_MS));
    } catch (e) {}
    pintar();
    anunciar(tomada ? "Pastilla de la tensión marcada como tomada" : "Pastilla de la tensión pendiente");
  });
  // Si se marca como tomada desde el recordatorio, el botón se pone al día
  document.addEventListener("pastilla-tomada", () => {
    tomada = true;
    pintar();
  });
  pintar();
}

// ---------- Recordatorio de la toma ----------
// En las páginas del paciente, cuando llega la hora de la toma y aún no está tomada,
// salta una ventana "Tómate la medicación" con dos opciones:
//   · "Ya me la he tomado": la marca como tomada y no vuelve a salir.
//   · "Retrasar 5 minutos": vuelve a salir 5 minutos después, y así hasta que se tome.
// El retraso se guarda en el navegador para que valga en todas las páginas.
// Si se entra más tarde de la hora y sigue sin tomar, salta igualmente.
const TOMA_PENDIENTE = { hora: "21:00", nombre: "Pastilla de la tensión" };
const RETRASO_RECORDATORIO_MS = 5 * 60 * 1000;

if (!document.body.dataset.pagina) {
  const ICONO_PASTILLA = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="6" y="16" width="36" height="16" rx="8" transform="rotate(-35 24 24)"/><line x1="24" y1="16" x2="24" y2="32" transform="rotate(-35 24 24)"/></svg>';
  const dialogoToma = document.createElement("dialog");
  dialogoToma.className = "dialogo dialogo-toma";
  dialogoToma.setAttribute("role", "alertdialog");
  dialogoToma.setAttribute("aria-labelledby", "toma-titulo");
  dialogoToma.setAttribute("aria-describedby", "toma-texto");
  dialogoToma.innerHTML = `
    <span class="toma-icono">${ICONO_PASTILLA}</span>
    <h2 id="toma-titulo">Tómate la medicación</h2>
    <p id="toma-texto"></p>
    <div class="dialogo-botones">
      <button class="boton btn-confirmar" type="button" id="toma-hecha">Ya me la he tomado <span aria-hidden="true">✓</span></button>
      <button class="boton" type="button" id="toma-retrasar">Retrasar 5 minutos</button>
    </div>`;
  document.body.append(dialogoToma);
  document.getElementById("toma-texto").textContent = `Son las ${TOMA_PENDIENTE.hora}: ${TOMA_PENDIENTE.nombre}.`;

  function tocaRecordar() {
    let tomada = false, hasta = 0;
    try {
      tomada = localStorage.getItem("pastilla-tomada") === "1";
      hasta = Number(localStorage.getItem("recordatorio-hasta")) || 0;
    } catch (e) {}
    const [h, m] = TOMA_PENDIENTE.hora.split(":").map(Number);
    const ahora = new Date();
    const yaEsLaHora = ahora.getHours() * 60 + ahora.getMinutes() >= h * 60 + m;
    return !tomada && yaEsLaHora && Date.now() >= hasta;
  }

  function revisarToma() {
    if (dialogoToma.open || !tocaRecordar()) return;
    dialogoToma.showModal();
    document.getElementById("toma-hecha").focus();
    avisarConSonido(dialogoToma, false);
  }

  document.getElementById("toma-hecha").addEventListener("click", () => {
    try {
      localStorage.setItem("pastilla-tomada", "1");
      localStorage.removeItem("recordatorio-hasta");
    } catch (e) {}
    dialogoToma.close();
    document.dispatchEvent(new Event("pastilla-tomada"));
    anunciar("Pastilla de la tensión marcada como tomada");
  });

  document.getElementById("toma-retrasar").addEventListener("click", () => {
    try { localStorage.setItem("recordatorio-hasta", String(Date.now() + RETRASO_RECORDATORIO_MS)); } catch (e) {}
    dialogoToma.close();
    anunciar("Te lo recordaremos dentro de 5 minutos");
  });

  // Hay que elegir una de las dos opciones: Escape no la cierra
  dialogoToma.addEventListener("cancel", e => e.preventDefault());

  // Si en otra pestaña se toma o se retrasa, esta ventana también se cierra
  window.addEventListener("storage", e => {
    if ((e.key === "pastilla-tomada" || e.key === "recordatorio-hasta") && dialogoToma.open && !tocaRecordar()) {
      dialogoToma.close();
    }
  });

  revisarToma();
  setInterval(revisarToma, 5000);
}

// ---------- Temperatura ----------
// Se guarda en el navegador para que Inicio y Casa muestren la misma.
// Fuera de 22–25 °C el valor lleva fondo rojo; dentro del rango solo se ve el número
function configurarTemperatura(valor, clase) {
  let temperatura = 30;
  try { temperatura = Number(localStorage.getItem("temperatura")) || 30; } catch (e) {}

  function pintar() {
    const fuera = temperatura < 22 || temperatura > 25;
    valor.className = clase + (fuera ? " alerta" : "");
    valor.innerHTML = `${temperatura} °C` +
      (fuera ? '<span class="sr-only"> (fuera del rango recomendado)</span>' : "");
    return fuera;
  }

  document.querySelectorAll(".btn-temp").forEach(boton => {
    boton.addEventListener("click", () => {
      temperatura = Math.min(35, Math.max(10, temperatura + Number(boton.dataset.paso)));
      try { localStorage.setItem("temperatura", temperatura); } catch (e) {}
      const fuera = pintar();
      anunciar(`Temperatura ${temperatura} grados${fuera ? ", fuera del rango recomendado" : ""}`);
    });
  });
  pintar();
}

// ---------- Dispositivos de la casa ----------
// Se guardan en el navegador para que Inicio y Casa muestren los mismos.
// activo = encendida (luz) o abierta (puerta, ventana).
// La clave lleva versión: al cambiar los ejemplos se sube el número para que se carguen
const CLAVE_DISPOSITIVOS = "dispositivos-v2";
const DISPOSITIVOS_INICIALES = [
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
];

function leerDispositivos() {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_DISPOSITIVOS));
    if (Array.isArray(guardados)) return guardados;
  } catch (e) {}
  return DISPOSITIVOS_INICIALES;
}

// ---------- SOS ----------
// Al pulsar SOS empieza una cuenta atrás de 5 s. Si no se cancela, se avisa a emergencias.
// <dialog> con showModal atrapa el foco y devuelve el foco al botón SOS al cerrarse.
// La página del cuidador no tiene SOS: de ahí los "?.".
const dialogo = document.getElementById("dialogo-sos");
const sosCancelar = document.getElementById("sos-cancelar");
const sosCerrar = document.getElementById("sos-cerrar");
const sosCuenta = document.getElementById("sos-cuenta");
const sosEstado = document.getElementById("sos-estado");
const sosAviso = document.getElementById("sos-aviso");
let cuentaAtras = null;

function pararCuenta() {
  clearInterval(cuentaAtras);
  cuentaAtras = null;
}

function cancelarSos() {
  pararCuenta();
  dialogo.close();
  anunciar("Llamada de emergencia cancelada");
}

document.getElementById("abrir-sos")?.addEventListener("click", () => {
  let segundos = 5;
  sosCuenta.textContent = segundos;
  sosCancelar.hidden = false;
  sosCerrar.hidden = true;
  sosEstado.textContent = "";
  dialogo.showModal();
  sosCancelar.focus();
  sosAviso.textContent = "Se avisará a emergencias en 5 segundos. Pulsa Cancelar para detenerlo.";

  cuentaAtras = setInterval(() => {
    segundos--;
    sosCuenta.textContent = segundos;
    if (segundos > 0) return;
    pararCuenta();
    sosCancelar.hidden = true;
    sosCerrar.hidden = false;
    sosCerrar.focus();
    sosEstado.textContent = "Comunicando con los contactos y servicios de emergencia";
    avisarCuidadores();
  }, 1000);
});

sosCancelar?.addEventListener("click", cancelarSos);
sosCerrar?.addEventListener("click", () => dialogo.close());
// Escape durante la cuenta atrás también cancela
dialogo?.addEventListener("cancel", () => { if (cuentaAtras) cancelarSos(); });
dialogo?.addEventListener("close", pararCuenta);

// ---------- Aviso del SOS del paciente al cuidador ----------
// Sin servidor, el aviso se deja en el navegador (localStorage). Las páginas del cuidador
// abiertas en otra pestaña lo reciben al momento con el evento "storage"; si el cuidador
// entra más tarde, lo ve igualmente mientras no lo haya atendido (durante 1 hora).
// Solo se avisa al acabar la cuenta atrás: si el paciente cancela, no llega nada.
// El aviso lleva la lista de cuidadores vinculados ("para"): solo ellos ven la alerta
// (el SOS de Mario le llega a Dara, no a Paula).
const SOS_VIGENTE_MS = 60 * 60 * 1000;

function avisarCuidadores() {
  let nombre = "", telefono = "", tipo = "", para = [];
  try {
    nombre = sessionStorage.getItem("nombre-usuario") || "";
    telefono = sessionStorage.getItem("telefono-usuario") || "";
    tipo = sessionStorage.getItem("tipo-perfil") || "";
    para = JSON.parse(sessionStorage.getItem("cuidadores")) || [];
  } catch (e) {}
  if (tipo === "cuidador") return; // el SOS del propio cuidador no se avisa a sí mismo
  if (!para.length) return; // paciente sin familiares vinculados: no hay a quién avisar
  const avisoSos = { id: Date.now(), nombre: nombre.split(" ")[0] || "Tu paciente", telefono, para };
  try { localStorage.setItem("sos-aviso", JSON.stringify(avisoSos)); } catch (e) {}
}

// En las páginas del cuidador: ventana roja de emergencia, encima de lo que esté haciendo
if (document.body.dataset.pagina === "cuidador") {
  const ICONO_LLAMAR = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M13 6h7l3 9-5 3a24 24 0 0 0 12 12l3-5 9 3v7a4 4 0 0 1-4 4C21 39 9 27 9 10a4 4 0 0 1 4-4z"/></svg>';
  const dialogoAlerta = document.createElement("dialog");
  dialogoAlerta.className = "dialogo-alerta";
  dialogoAlerta.setAttribute("role", "alertdialog");
  dialogoAlerta.setAttribute("aria-labelledby", "alerta-titulo");
  dialogoAlerta.setAttribute("aria-describedby", "alerta-texto");
  dialogoAlerta.innerHTML = `
    <div class="alerta-cabecera">
      <h2 id="alerta-titulo">Alerta <span id="alerta-nombre"></span></h2>
      <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path d="M12 34h24l-4-6v-8a8 8 0 0 0-16 0v8z"/>
        <path d="M20 38a4 4 0 0 0 8 0"/>
      </svg>
    </div>
    <p class="alerta-texto" id="alerta-texto"></p>
    <div class="alerta-acciones">
      <a class="boton btn-alerta" id="alerta-llamar" href="#">${ICONO_LLAMAR}<span id="alerta-llamar-texto"></span></a>
      <a class="boton btn-alerta" href="tel:112" aria-label="Llamar al 112">${ICONO_LLAMAR}112</a>
    </div>
    <button class="boton btn-atendido" type="button" id="alerta-atendido">Ya lo estoy atendiendo</button>`;
  document.body.append(dialogoAlerta);

  const tituloOriginal = document.title;
  let avisoMostrado = null;
  let usuarioCuidador = "";
  try { usuarioCuidador = sessionStorage.getItem("usuario") || ""; } catch (e) {}
  // Cada cuidador marca "atendido" por su cuenta
  const claveAtendido = "sos-atendido-" + usuarioCuidador;

  function mostrarAlertaSos(avisoSos) {
    avisoMostrado = avisoSos;
    const hora = new Date(avisoSos.id).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    document.getElementById("alerta-nombre").textContent = avisoSos.nombre;
    document.getElementById("alerta-texto").textContent = `${avisoSos.nombre} ha pulsado el botón SOS a las ${hora}.`;
    document.getElementById("alerta-llamar-texto").textContent = `Llamar a ${avisoSos.nombre}`;
    const llamar = document.getElementById("alerta-llamar");
    llamar.hidden = !avisoSos.telefono;
    llamar.href = `tel:+34${avisoSos.telefono}`;
    document.title = `⚠ Alerta ${avisoSos.nombre} · ${tituloOriginal}`;
    if (!dialogoAlerta.open) {
      dialogoAlerta.showModal();
      avisarConSonido(dialogoAlerta, true);
    }
    (avisoSos.telefono ? llamar : dialogoAlerta.querySelector('[href="tel:112"]')).focus();
  }

  function revisarAvisoSos() {
    let avisoSos = null, atendido = "";
    try {
      avisoSos = JSON.parse(localStorage.getItem("sos-aviso"));
      atendido = localStorage.getItem(claveAtendido);
    } catch (e) {}
    if (avisoSos && Array.isArray(avisoSos.para) && avisoSos.para.includes(usuarioCuidador)
        && String(avisoSos.id) !== atendido && Date.now() - avisoSos.id < SOS_VIGENTE_MS) {
      mostrarAlertaSos(avisoSos);
    }
  }

  // Se cierra solo a propósito: ni Escape ni un toque fuera la quitan
  dialogoAlerta.addEventListener("cancel", e => e.preventDefault());
  document.getElementById("alerta-atendido").addEventListener("click", () => {
    try { localStorage.setItem(claveAtendido, String(avisoMostrado.id)); } catch (e) {}
    dialogoAlerta.close();
    document.title = tituloOriginal;
    anunciar(`Alerta de ${avisoMostrado.nombre} marcada como atendida`);
  });

  window.addEventListener("storage", e => { if (e.key === "sos-aviso") revisarAvisoSos(); });
  revisarAvisoSos();
}

// ---------- Llamadas ----------
// Todos los botones "Llamar" (enlaces tel:) abren una ventana de llamada en lugar de marcar
// directamente: quién, a qué número, el estado de la llamada y un botón grande de Colgar.
// La llamada real se conectará más adelante; de momento se simula.
const dialogoLlamada = document.createElement("dialog");
dialogoLlamada.className = "dialogo dialogo-llamada";
dialogoLlamada.setAttribute("aria-labelledby", "llamada-titulo");
dialogoLlamada.setAttribute("aria-describedby", "llamada-numero llamada-estado");
dialogoLlamada.innerHTML = `
  <span class="llamada-icono" aria-hidden="true">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M13 6h7l3 9-5 3a24 24 0 0 0 12 12l3-5 9 3v7a4 4 0 0 1-4 4C21 39 9 27 9 10a4 4 0 0 1 4-4z"/></svg>
  </span>
  <h2 id="llamada-titulo"></h2>
  <p class="llamada-numero" id="llamada-numero"></p>
  <p class="llamada-estado" id="llamada-estado" role="status"></p>
  <p class="llamada-tiempo" id="llamada-tiempo" aria-hidden="true"></p>
  <button class="boton btn-colgar" type="button" id="llamada-colgar">
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M13 6h7l3 9-5 3a24 24 0 0 0 12 12l3-5 9 3v7a4 4 0 0 1-4 4C21 39 9 27 9 10a4 4 0 0 1 4-4z"/></svg>
    Colgar
  </button>`;
document.body.append(dialogoLlamada);

let relojLlamada = null;

// "+34611223344" → "+34 611 223 344"
function formatoNumero(numero) {
  return numero.replace(/^\+34(\d{3})(\d{3})(\d{3})$/, "+34 $1 $2 $3");
}

function llamar(enlace) {
  const numero = enlace.getAttribute("href").replace(/^tel:/, "");
  // Nombre: data-nombre, la etiqueta accesible o el texto del botón, sin el "Llamar a"
  const nombre = (enlace.dataset.nombre || enlace.getAttribute("aria-label") || enlace.textContent)
    .trim().replace(/^Llamar( a| al)?\s*/i, "").trim();
  document.getElementById("llamada-titulo").textContent =
    numero === "112" ? "Llamando al 112" : nombre ? `Llamando a ${nombre}` : "Llamando";
  document.getElementById("llamada-numero").textContent = formatoNumero(numero);
  const estado = document.getElementById("llamada-estado");
  const tiempo = document.getElementById("llamada-tiempo");
  estado.textContent = "Conectando…";
  tiempo.textContent = "";
  dialogoLlamada.classList.remove("conectada");
  dialogoLlamada.showModal();
  document.getElementById("llamada-colgar").focus();

  // A los 3 s la llamada "se conecta" y empieza a contar el tiempo.
  // El lector anuncia el cambio una vez; el contador de segundos no se lee (aria-hidden).
  let segundos = -3;
  clearInterval(relojLlamada);
  relojLlamada = setInterval(() => {
    segundos++;
    if (segundos === 0) {
      document.getElementById("llamada-titulo").textContent =
        numero === "112" ? "En llamada con el 112" : nombre ? `En llamada con ${nombre}` : "En llamada";
      estado.textContent = "Llamada en curso";
      dialogoLlamada.classList.add("conectada");
    }
    if (segundos >= 0) {
      tiempo.textContent = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;
    }
  }, 1000);
}

document.addEventListener("click", e => {
  const enlace = e.target.closest('a[href^="tel:"]');
  if (!enlace) return;
  e.preventDefault();
  llamar(enlace);
});

document.getElementById("llamada-colgar").addEventListener("click", () => dialogoLlamada.close());
dialogoLlamada.addEventListener("close", () => {
  clearInterval(relojLlamada);
  anunciar("Llamada finalizada");
});

// ---------- Menú de accesibilidad ----------
// Los ajustes se guardan en el navegador y se aplican en todas las páginas
const raiz = document.documentElement;
const dialogoA11y = document.getElementById("dialogo-a11y");
const TAMANOS = [100, 115, 130, 150];
const VIBRACION = ["Apagada", "Baja", "Media", "Alta"];
const INICIALES = { texto: 0, vibracion: 0, tema: "claro" };
let ajustes = { ...INICIALES };
try { ajustes = { ...INICIALES, ...JSON.parse(localStorage.getItem("a11y") || "{}") }; } catch (e) {}
if (!TAMANOS[ajustes.texto]) ajustes.texto = 0;
if (!VIBRACION[ajustes.vibracion]) ajustes.vibracion = 0;

function aplicarAjustes() {
  const tamano = TAMANOS[ajustes.texto];
  // Solo crece el texto (no los iconos ni el diseño): todo el texto está en rem
  raiz.style.setProperty("--escala", tamano / 100);
  raiz.classList.toggle("scroll", tamano > 100); // con texto grande se permite el scroll
  raiz.classList.toggle("oscuro", ajustes.tema === "oscuro");
  raiz.classList.toggle("contraste", ajustes.tema === "contraste");

  document.getElementById("texto-mas").disabled = ajustes.texto === TAMANOS.length - 1;
  document.getElementById("texto-menos").disabled = ajustes.texto === 0;
  document.getElementById("vibra-valor").textContent = VIBRACION[ajustes.vibracion];
  document.getElementById("vibra-mas").disabled = ajustes.vibracion === VIBRACION.length - 1;
  document.getElementById("vibra-menos").disabled = ajustes.vibracion === 0;
  document.getElementById("tema-oscuro").setAttribute("aria-pressed", String(ajustes.tema === "oscuro"));
  document.getElementById("tema-contraste").setAttribute("aria-pressed", String(ajustes.tema === "contraste"));
  try { localStorage.setItem("a11y", JSON.stringify(ajustes)); } catch (e) {}
}

// Vibración al pulsar cualquier botón (solo en dispositivos que lo permiten)
function vibrar() {
  if (ajustes.vibracion && navigator.vibrate) navigator.vibrate(ajustes.vibracion * 60);
}
document.addEventListener("click", e => { if (e.target.closest(".boton")) vibrar(); });

function cambiarTema(tema) {
  ajustes.tema = ajustes.tema === tema ? "claro" : tema;
  aplicarAjustes();
}

// El porcentaje no se muestra, pero el lector de pantalla lo anuncia
function cambiarTexto(paso) {
  ajustes.texto += paso;
  aplicarAjustes();
  anunciar(`Tamaño de letra ${TAMANOS[ajustes.texto]} %`);
}

document.getElementById("abrir-a11y").addEventListener("click", () => dialogoA11y.showModal());
document.getElementById("cerrar-a11y").addEventListener("click", () => dialogoA11y.close());
document.getElementById("texto-mas").addEventListener("click", () => cambiarTexto(1));
document.getElementById("texto-menos").addEventListener("click", () => cambiarTexto(-1));
document.getElementById("vibra-mas").addEventListener("click", () => { ajustes.vibracion++; aplicarAjustes(); });
document.getElementById("vibra-menos").addEventListener("click", () => { ajustes.vibracion--; aplicarAjustes(); });
document.getElementById("tema-oscuro").addEventListener("click", () => cambiarTema("oscuro"));
document.getElementById("tema-contraste").addEventListener("click", () => cambiarTema("contraste"));
document.getElementById("a11y-reset").addEventListener("click", () => {
  ajustes = { ...INICIALES };
  aplicarAjustes();
  anunciar("Ajustes de accesibilidad restablecidos");
});

// Cerrar al pulsar fuera de la ventana (menú de accesibilidad y otras ventanas .dialogo).
// La ventana SOS no: un toque accidental no debe cancelar una emergencia.
// Los formularios (.dialogo-form) tampoco: no se pierde lo escrito por un toque fuera.
// Ni la llamada: solo se cuelga con el botón Colgar (o Escape).
document.querySelectorAll("dialog.dialogo:not(.dialogo-form):not(.dialogo-llamada)").forEach(d => d.addEventListener("click", e => {
  const r = d.getBoundingClientRect();
  const fuera = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  if (e.target === d && fuera) d.close();
}));

aplicarAjustes();
