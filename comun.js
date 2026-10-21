// Código común a todas las páginas: avisos al lector de pantalla, SOS,
// menú de accesibilidad, estado de la pastilla y temperatura.

const anuncio = document.getElementById("anuncio");
// Vacía y vuelve a escribir para que el lector repita mensajes iguales
function anunciar(texto) {
  anuncio.textContent = "";
  setTimeout(() => { anuncio.textContent = texto; }, 50);
}

// ---------- Sesión ----------
// Sin sesión, cualquier página lleva al inicio de sesión.
// Un cuidador que abra una página del paciente va a su propia página.
try {
  const pagina = document.body.dataset.pagina;
  if (pagina !== "login") {
    if (localStorage.getItem("sesion") === "cerrada") location.replace("login.html");
    else if (localStorage.getItem("tipo-perfil") === "cuidador" && pagina !== "cuidador") location.replace("cuidador.html");
  }
} catch (e) {}

// ---------- Cerrar sesión (con confirmación, para evitar toques accidentales) ----------
const dialogoSalir = document.getElementById("dialogo-salir");
if (dialogoSalir) {
  document.getElementById("abrir-salir").addEventListener("click", () => {
    dialogoSalir.showModal();
    document.getElementById("salir-no").focus(); // la opción segura tiene el foco
  });
  document.getElementById("salir-no").addEventListener("click", () => dialogoSalir.close());
  document.getElementById("salir-si").addEventListener("click", () => {
    try {
      localStorage.setItem("sesion", "cerrada");
      localStorage.removeItem("tipo-perfil");
    } catch (e) {}
    location.href = "login.html";
  });
}

// Enlaces que aún no tienen página (medicación, casa y contactos del cuidador): no hacen nada
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
    try { localStorage.setItem("pastilla-tomada", tomada ? "1" : "0"); } catch (e) {}
    pintar();
    anunciar(tomada ? "Pastilla de la tensión marcada como tomada" : "Pastilla de la tensión pendiente");
  });
  pintar();
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
  }, 1000);
});

sosCancelar?.addEventListener("click", cancelarSos);
sosCerrar?.addEventListener("click", () => dialogo.close());
// Escape durante la cuenta atrás también cancela
dialogo?.addEventListener("cancel", () => { if (cuentaAtras) cancelarSos(); });
dialogo?.addEventListener("close", pararCuenta);

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
document.querySelectorAll("dialog.dialogo:not(.dialogo-form)").forEach(d => d.addEventListener("click", e => {
  const r = d.getBoundingClientRect();
  const fuera = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  if (e.target === d && fuera) d.close();
}));

aplicarAjustes();
