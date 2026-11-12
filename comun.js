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

// ---------- Vista previa (prototipos.html) ----------
// Con ?vista=1 la página se enseña sin iniciar sesión, con datos de ejemplo: Mario y su
// familiar Dara o, en las páginas del cuidador, Dara. No salta el recordatorio de la toma
// y el SOS no avisa a nadie.
const VISTA_PREVIA = new URLSearchParams(location.search).has("vista");
if (VISTA_PREVIA) {
  try {
    if (sessionStorage.getItem("sesion") !== "abierta") {
      const esCuidador = document.body.dataset.pagina === "cuidador";
      sessionStorage.setItem("nombre-usuario", esCuidador ? "Dara" : "Mario");
      sessionStorage.setItem("familiares", JSON.stringify(esCuidador ? [] : [{ nombre: "Dara", telefono: "677123456" }]));
    }
  } catch (e) {}
}

// ---------- Familiar o cuidador vinculado ----------
// Quien tiene un cuidador vinculado ve solo lo esencial: la gestión (editar datos, contactos
// y dispositivos) la hace el cuidador. Sin cuidador, la persona conserva esas opciones.
function leerFamiliares() {
  try { return JSON.parse(sessionStorage.getItem("familiares")) || []; } catch (e) { return []; }
}

// ---------- Sesión ----------
// La sesión dura mientras el navegador esté abierto (sessionStorage): cada vez que se
// entra en la web se empieza por el inicio de sesión (index.html), que decide qué
// parte abrir según el tipo de usuario. Sin sesión, cualquier página lleva allí.
// Un cuidador que abra una página del paciente va a su propia página.
try {
  const pagina = document.body.dataset.pagina;
  if (pagina !== "login" && !VISTA_PREVIA) {
    if (sessionStorage.getItem("sesion") !== "abierta") location.replace("index.html");
    else if (sessionStorage.getItem("tipo-perfil") === "cuidador" && pagina !== "cuidador") location.replace("cuidador.html");
  }
} catch (e) {}

// ---------- Enlaces a un bloque (casa.html#puertas, perfil.html#contactos…) ----------
// El navegador desplaza la pantalla hasta el bloque; además se lleva allí el foco del teclado.
function irAlBloque() {
  const bloque = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (!bloque) return;
  if (document.activeElement !== bloque && bloque.tabIndex === -1) bloque.focus({ preventScroll: true });
}
window.addEventListener("load", () => requestAnimationFrame(irAlBloque));
window.addEventListener("hashchange", irAlBloque);

// ---------- Palabra "Perfil" debajo del avatar ----------
// Como "Accesibilidad" bajo su icono: se entiende sin conocer el símbolo.
// El enlace ya se anuncia como "Mi perfil" (aria-label); la palabra es visual y también lleva al perfil.
(function etiquetarAvatar() {
  const avatar = document.querySelector(".perfiles .avatar");
  if (!avatar || avatar.parentElement.classList.contains("avatar-grupo")) return;
  const grupo = document.createElement("div");
  grupo.className = "avatar-grupo";
  avatar.replaceWith(grupo);
  const texto = document.createElement("a");
  texto.className = "avatar-texto";
  texto.href = avatar.getAttribute("href");
  texto.textContent = "Perfil";
  texto.tabIndex = -1;
  texto.setAttribute("aria-hidden", "true");
  grupo.append(avatar, texto);
})();

// ---------- Cerrar sesión (con confirmación, para evitar toques accidentales) ----------
// El botón está en la cabecera de todas las páginas con sesión, junto al avatar,
// para poder salir desde cualquier ventana.
(function crearBotonSalir() {
  const perfiles = document.querySelector(".perfiles");
  if (!perfiles || document.getElementById("abrir-salir")) return;
  const boton = document.createElement("button");
  boton.className = "boton btn-salir";
  boton.type = "button";
  boton.id = "abrir-salir";
  boton.setAttribute("aria-haspopup", "dialog");
  boton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 4H5v16h5"/><path d="m14 8 4 4-4 4M18 12H9"/></svg>
    <span class="salir-texto">Cerrar sesión</span>`;
  perfiles.append(boton);

  if (!document.getElementById("dialogo-salir")) {
    const d = document.createElement("dialog");
    d.className = "dialogo dialogo-salir";
    d.id = "dialogo-salir";
    d.setAttribute("aria-labelledby", "salir-titulo");
    d.setAttribute("aria-describedby", "salir-texto");
    d.innerHTML = `
      <h2 id="salir-titulo">¿Cerrar sesión?</h2>
      <p id="salir-texto">Para volver a usar la aplicación tendrás que entrar otra vez con tu usuario y contraseña.</p>
      <div class="dialogo-botones">
        <button class="boton" type="button" id="salir-no">No, seguir aquí</button>
        <button class="boton btn-salir" type="button" id="salir-si">Sí, cerrar sesión</button>
      </div>`;
    document.body.append(d);
  }
})();

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
// En las páginas del paciente, cuando llega la hora de la toma con la página abierta y aún
// no está tomada, salta una ventana "Tómate la medicación" con dos opciones:
//   · "Ya me la he tomado": la marca como tomada y no vuelve a salir.
//   · "Retrasar 5 minutos": vuelve a salir 5 minutos después, y así hasta que se tome.
// La X hace lo mismo que retrasar: cerrar no cuenta como tomada y el aviso no se pierde.
// El retraso se guarda en el navegador para que valga en todas las páginas.
// No salta al entrar en una página: si ya es la hora, se ve el botón "Pendiente" de la tarjeta.
const TOMA_PENDIENTE = { hora: "21:00", nombre: "Pastilla de la tensión" };
const RETRASO_RECORDATORIO_MS = 5 * 60 * 1000;

if (!document.body.dataset.pagina && !VISTA_PREVIA) {
  const ICONO_PASTILLA = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="6" y="16" width="36" height="16" rx="8" transform="rotate(-35 24 24)"/><line x1="24" y1="16" x2="24" y2="32" transform="rotate(-35 24 24)"/></svg>';
  const dialogoToma = document.createElement("dialog");
  dialogoToma.className = "dialogo dialogo-toma";
  dialogoToma.setAttribute("role", "alertdialog");
  dialogoToma.setAttribute("aria-labelledby", "toma-titulo");
  dialogoToma.setAttribute("aria-describedby", "toma-texto");
  dialogoToma.innerHTML = `
    <button class="boton btn-cerrar" type="button" id="toma-cerrar" aria-label="Cerrar y recordármelo en 5 minutos" title="Cerrar y recordármelo en 5 minutos">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
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

  // Lo que ya tocaba al entrar no abre la ventana; solo lo que llega con la página abierta
  let tocabaAlEntrar = tocaRecordar();

  function revisarToma() {
    const toca = tocaRecordar();
    if (!toca) tocabaAlEntrar = false;
    if (!toca || tocabaAlEntrar || dialogoToma.open) return;
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

  function retrasarToma() {
    try { localStorage.setItem("recordatorio-hasta", String(Date.now() + RETRASO_RECORDATORIO_MS)); } catch (e) {}
    dialogoToma.close();
    anunciar("Te lo recordaremos dentro de 5 minutos");
  }
  document.getElementById("toma-retrasar").addEventListener("click", retrasarToma);
  document.getElementById("toma-cerrar").addEventListener("click", retrasarToma);

  // Hay que usar uno de los botones: Escape no la cierra
  dialogoToma.addEventListener("cancel", e => e.preventDefault());

  // Si en otra pestaña se toma o se retrasa, esta ventana también se cierra
  window.addEventListener("storage", e => {
    if ((e.key === "pastilla-tomada" || e.key === "recordatorio-hasta") && dialogoToma.open && !tocaRecordar()) {
      dialogoToma.close();
    }
  });

  setInterval(revisarToma, 5000);
}

// ---------- Temperatura ----------
// Se guarda en el navegador para que Inicio y Casa muestren la misma.
// Fuera de 22–25 °C el valor lleva fondo rojo; dentro del rango solo se ve el número
function leerTemperatura() {
  try { return Number(localStorage.getItem("temperatura")) || 30; } catch (e) { return 30; }
}

const temperaturaFueraDeRango = temperatura => temperatura < 22 || temperatura > 25;

function configurarTemperatura(valor, clase) {
  let temperatura = leerTemperatura();

  function pintar() {
    const fuera = temperaturaFueraDeRango(temperatura);
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

// ---------- Pulsación larga en − / + de la temperatura ----------
// Mantener pulsado repite el cambio: empieza a los 0,5 s y luego sube o baja cada 0,2 s,
// hasta soltar. Funciona con ratón, dedo y lápiz. Con el teclado, mantener Intro ya repite.
document.querySelectorAll(".btn-temp").forEach(boton => {
  let espera = null, repeticion = null, repetido = false, pulsando = false;

  function parar() {
    clearTimeout(espera);
    clearInterval(repeticion);
    espera = repeticion = null;
  }

  boton.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    repetido = false;
    pulsando = true;
    parar();
    espera = setTimeout(() => {
      repetido = true;
      boton.click();
      repeticion = setInterval(() => {
        if (boton.disabled) return parar();
        boton.click();
      }, 200);
    }, 500);
  });
  boton.addEventListener("pointerup", () => {
    pulsando = false;
    parar();
  });
  // Si el dedo sale del botón antes de soltar no llegará clic: no hay nada que descartar.
  // (En pantallas táctiles pointerleave también llega justo después de soltar: ahí no se toca)
  ["pointerleave", "pointercancel", "blur"].forEach(tipo => boton.addEventListener(tipo, () => {
    if (pulsando) repetido = false;
    pulsando = false;
    parar();
  }));

  // El clic que llega al soltar no suma otro paso si ya se estaba repitiendo
  boton.addEventListener("click", e => {
    if (repetido && !repeticion && !espera) {
      repetido = false;
      e.stopImmediatePropagation();
    }
  }, true);

  // En el móvil, mantener pulsado no abre el menú del navegador
  boton.addEventListener("contextmenu", e => e.preventDefault());
});

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
// Al pulsar SOS empieza una cuenta atrás de 10 s. Si no se cancela, se avisa a emergencias.
// "Avisar ahora" confirma al momento, sin esperar a que termine.
// <dialog> con showModal atrapa el foco y devuelve el foco al botón SOS al cerrarse.
// La página del cuidador no tiene SOS: de ahí los "?.".
const dialogo = document.getElementById("dialogo-sos");
const sosCancelar = document.getElementById("sos-cancelar");
const sosAhora = document.getElementById("sos-ahora");
const sosCerrar = document.getElementById("sos-cerrar");
const sosCuenta = document.getElementById("sos-cuenta");
const sosEstado = document.getElementById("sos-estado");
const sosAviso = document.getElementById("sos-aviso");
let cuentaAtras = null;

function pararCuenta() {
  clearInterval(cuentaAtras);
  cuentaAtras = null;
}

function enviarSos() {
  pararCuenta();
  sosCancelar.hidden = true;
  sosAhora.hidden = true;
  sosCerrar.hidden = false;
  sosCerrar.focus();
  sosEstado.textContent = "Comunicando con los contactos y servicios de emergencia";
  avisarCuidadores();
}

function cancelarSos() {
  pararCuenta();
  dialogo.close();
  anunciar("Llamada de emergencia cancelada");
}

document.getElementById("abrir-sos")?.addEventListener("click", () => {
  let segundos = 10;
  sosCuenta.textContent = segundos;
  sosCancelar.hidden = false;
  sosAhora.hidden = false;
  sosCerrar.hidden = true;
  sosEstado.textContent = "";
  dialogo.showModal();
  sosCancelar.focus();
  sosAviso.textContent = "Se avisará a emergencias en 10 segundos. Pulsa Cancelar para detenerlo o Avisar ahora para no esperar.";

  cuentaAtras = setInterval(() => {
    segundos--;
    sosCuenta.textContent = segundos;
    if (segundos <= 0) enviarSos();
  }, 1000);
});

sosCancelar?.addEventListener("click", cancelarSos);
sosAhora?.addEventListener("click", enviarSos);
sosCerrar?.addEventListener("click", () => dialogo.close());
// Escape durante la cuenta atrás también cancela
dialogo?.addEventListener("cancel", () => { if (cuentaAtras) cancelarSos(); });
dialogo?.addEventListener("close", pararCuenta);

// ---------- Aviso del SOS del paciente al cuidador ----------
// Sin servidor, el aviso se deja en el navegador (localStorage). Las páginas del cuidador
// abiertas en otra pestaña lo reciben al momento con el evento "storage"; si el cuidador
// entra más tarde, lo ve igualmente mientras no lo haya atendido (durante 1 hora).
// Solo se avisa al confirmar o al acabar la cuenta atrás: si el paciente cancela, no llega nada.
// El aviso lleva la lista de cuidadores vinculados ("para"): solo ellos ven la alerta
// (el SOS de Mario le llega a Dara, no a Paula).
const SOS_VIGENTE_MS = 60 * 60 * 1000;

function avisarCuidadores() {
  if (VISTA_PREVIA) return; // en los prototipos el SOS no avisa a nadie
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
// Pestaña colgada del borde superior, junto al avatar, en todas las páginas con sesión.
// Los ajustes se guardan en el navegador (preferencias.js) y valen para todas las páginas.
(function () {
  const perfiles = document.querySelector(".perfiles");
  if (!perfiles) return;

  const ICONO = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="4.5" r="1.8" fill="currentColor"/>
      <path d="M4.5 8.5 12 10l7.5-1.5M12 10v5M12 15l-3.5 6M12 15l3.5 6"/>
    </svg>`;

  const abrir = document.createElement("button");
  abrir.className = "boton btn-a11y";
  abrir.type = "button";
  abrir.setAttribute("aria-haspopup", "dialog");
  abrir.title = "Menú de accesibilidad";
  // Icono acompañado de la palabra, para que se entienda sin conocer el símbolo
  abrir.innerHTML = `${ICONO}<span class="a11y-texto">Accesibilidad</span>`;
  perfiles.prepend(abrir);

  const menu = document.createElement("dialog");
  menu.className = "dialogo dialogo-a11y";
  menu.setAttribute("aria-labelledby", "a11y-titulo");
  menu.innerHTML = `
    <button class="boton btn-cerrar" type="button" id="cerrar-a11y" aria-label="Cerrar" title="Cerrar">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
    <h2 id="a11y-titulo" class="a11y-titulo">Menú de accesibilidad ${ICONO}</h2>

    <section class="a11y-grupo" aria-labelledby="grupo-texto">
      <h3 id="grupo-texto">
        Tamaño de letra
        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <rect x="4" y="4" width="24" height="24" rx="2"/>
          <path d="M10 24 16 8l6 16M12.3 18h7.4"/>
        </svg>
      </h3>
      <div class="a11y-fila">
        <button class="boton a11y-paso" type="button" id="texto-menos" aria-label="Disminuir tamaño de letra">−</button>
        <output class="a11y-valor" id="texto-valor"></output>
        <button class="boton a11y-paso" type="button" id="texto-mas" aria-label="Aumentar tamaño de letra">+</button>
      </div>
    </section>

    <section class="a11y-grupo" aria-labelledby="grupo-vibracion">
      <h3 id="grupo-vibracion">
        Vibración
        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <rect x="11" y="5" width="10" height="22" rx="2"/>
          <circle cx="16" cy="22" r="0.8" fill="currentColor"/>
          <path d="M7 9 5 11l2 2-2 2 2 2-2 2 2 2M25 9l2 2-2 2 2 2-2 2 2 2-2 2"/>
        </svg>
      </h3>
      <div class="a11y-fila">
        <button class="boton a11y-paso" type="button" id="vibra-menos" aria-label="Disminuir vibración">−</button>
        <output class="a11y-valor" id="vibra-valor" aria-live="polite"></output>
        <button class="boton a11y-paso" type="button" id="vibra-mas" aria-label="Aumentar vibración">+</button>
      </div>
    </section>

    <section class="a11y-grupo" aria-labelledby="grupo-tema">
      <h3 id="grupo-tema">
        Tema
        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <circle cx="16" cy="16" r="5"/>
          <path d="M16 3v4M16 25v4M3 16h4M25 16h4M7 7l3 3M22 22l3 3M7 25l3-3M22 10l3-3"/>
        </svg>
      </h3>
      <div class="a11y-temas">
        <button class="boton a11y-tema" type="button" id="tema-oscuro" aria-pressed="false">Oscuro</button>
        <button class="boton a11y-tema" type="button" id="tema-contraste" aria-pressed="false">Alto contraste</button>
      </div>
    </section>

    <div class="dialogo-botones">
      <button class="boton btn-reset" type="button" id="a11y-reset">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>
        Restablecer
      </button>
    </div>`;
  document.body.append(menu);

  const { TAMANOS, VIBRACION } = window.preferencias;
  const boton = id => document.getElementById(id);
  const raizPagina = document.documentElement;

  // ¿Cabe la letra actual sin desbordar la página ni cortar el texto del menú lateral?
  function cabe() {
    return raizPagina.scrollWidth <= raizPagina.clientWidth
      && [...document.querySelectorAll(".sidebar .nav-item")].every(el => el.scrollWidth <= el.clientWidth + 1);
  }

  // Prueba cada tamaño, sin que llegue a pintarse, y se queda con el mayor que cabe.
  // Con el diseño de texto grande (letra del navegador) o en los prototipos no hay tope.
  function calcularTope() {
    const sinTope = raizPagina.classList.contains("texto-grande") || new URLSearchParams(location.search).has("texto");
    let tope = TAMANOS.length - 1;
    if (!sinTope) {
      const original = raizPagina.style.fontSize;
      tope = 0;
      for (let nivel = 1; nivel < TAMANOS.length; nivel++) {
        raizPagina.style.fontSize = TAMANOS[nivel] + "%";
        if (!cabe()) break;
        tope = nivel;
      }
      raizPagina.style.fontSize = original;
    }
    window.preferencias.fijarTope(tope);
  }

  // Pinta el estado del menú. Un botón que se desactiva pierde el foco: pasa a su pareja
  function pintar() {
    const { vibracion, tema } = window.preferencias.leer();
    const texto = window.preferencias.nivelTexto();
    [["texto-mas", "texto-menos", texto >= window.preferencias.tope()], ["texto-menos", "texto-mas", texto === 0],
     ["vibra-mas", "vibra-menos", vibracion === VIBRACION.length - 1], ["vibra-menos", "vibra-mas", vibracion === 0]]
      .forEach(([id, pareja, desactivar]) => {
        const teniaFoco = document.activeElement === boton(id);
        boton(id).disabled = desactivar;
        if (desactivar && teniaFoco) boton(pareja).focus();
      });
    boton("texto-valor").textContent = `Nivel ${texto + 1} de ${TAMANOS.length}`;
    boton("vibra-valor").textContent = VIBRACION[vibracion];
    boton("tema-oscuro").setAttribute("aria-pressed", String(tema === "oscuro"));
    boton("tema-contraste").setAttribute("aria-pressed", String(tema === "contraste"));
  }

  function cambiarTexto(paso) {
    const texto = window.preferencias.nivelTexto() + paso;
    window.preferencias.guardar({ texto });
    pintar();
    const esElMaximo = texto >= window.preferencias.tope();
    anunciar(`Tamaño de letra: nivel ${texto + 1} de ${TAMANOS.length}${esElMaximo ? ". Es el máximo que cabe en esta pantalla" : ""}`);
  }

  function cambiarVibracion(paso) {
    window.preferencias.guardar({ vibracion: window.preferencias.leer().vibracion + paso });
    pintar();
  }

  function cambiarTema(tema) {
    window.preferencias.guardar({ tema: window.preferencias.leer().tema === tema ? "claro" : tema });
    pintar();
  }

  abrir.addEventListener("click", () => menu.showModal());
  boton("cerrar-a11y").addEventListener("click", () => menu.close());
  boton("texto-mas").addEventListener("click", () => cambiarTexto(1));
  boton("texto-menos").addEventListener("click", () => cambiarTexto(-1));
  boton("vibra-mas").addEventListener("click", () => cambiarVibracion(1));
  boton("vibra-menos").addEventListener("click", () => cambiarVibracion(-1));
  boton("tema-oscuro").addEventListener("click", () => cambiarTema("oscuro"));
  boton("tema-contraste").addEventListener("click", () => cambiarTema("contraste"));
  boton("a11y-reset").addEventListener("click", () => {
    window.preferencias.restablecer();
    pintar();
    anunciar("Ajustes de accesibilidad restablecidos");
  });

  // Vibración al pulsar cualquier botón (solo en dispositivos que lo permiten)
  document.addEventListener("click", e => {
    const { vibracion } = window.preferencias.leer();
    if (vibracion && navigator.vibrate && e.target.closest(".boton")) navigator.vibrate(vibracion * 60);
  });

  // El tope depende de la pantalla y del contenido: se calcula al cargar y al cambiar la ventana
  function actualizar() {
    calcularTope();
    pintar();
  }
  actualizar();
  window.addEventListener("load", actualizar);
  window.addEventListener("resize", actualizar);
})();

// Cerrar al pulsar fuera de la ventana (ventanas .dialogo).
// La ventana SOS no: un toque accidental no debe cancelar una emergencia.
// Los formularios (.dialogo-form) tampoco: no se pierde lo escrito por un toque fuera.
// Ni la llamada: solo se cuelga con el botón Colgar (o Escape).
document.querySelectorAll("dialog.dialogo:not(.dialogo-form):not(.dialogo-llamada)").forEach(d => d.addEventListener("click", e => {
  const r = d.getBoundingClientRect();
  const fuera = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  if (e.target === d && fuera) d.close();
}));
