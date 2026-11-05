// Colores y tamaño de letra. El tema por defecto es el claro (blanco), aunque el sistema esté en oscuro.
// Se carga en <head>, antes que los estilos, para que la página no parpadee en otro color.
//   · Menú de accesibilidad (comun.js): tema y tamaño de letra guardados en el navegador.
//   · Más contraste: el ajuste del sistema (prefers-contrast), si el menú no indica otro tema.
//   · Temas de contraste de Windows: los resuelve estilos.css con forced-colors.
//   · Zoom y tamaño de letra del navegador: el diseño se reorganiza con texto grande.
// prototipos.html añade ?tema= y ?texto= a la dirección para enseñar cada combinación.
(function () {
  const raiz = document.documentElement;
  const vista = new URLSearchParams(location.search);
  const contraste = matchMedia("(prefers-contrast: more)");
  const textoVista = Number(vista.get("texto"));

  const CLAVE = "accesibilidad";
  const TAMANOS = [100, 115, 130, 150];
  const VIBRACION = ["Apagada", "Baja", "Media", "Alta"];
  const INICIALES = { texto: 0, vibracion: 0, tema: "claro" };

  let ajustes = { ...INICIALES };
  try { ajustes = { ...INICIALES, ...JSON.parse(localStorage.getItem(CLAVE) || "{}") }; } catch (e) {}
  if (!TAMANOS[ajustes.texto]) ajustes.texto = 0;
  if (!VIBRACION[ajustes.vibracion]) ajustes.vibracion = 0;
  if (!["claro", "oscuro", "contraste"].includes(ajustes.tema)) ajustes.tema = "claro";

  function aplicarTema() {
    const tema = vista.get("tema") || (ajustes.tema !== "claro" ? ajustes.tema : contraste.matches ? "contraste" : "claro");
    raiz.classList.toggle("oscuro", tema === "oscuro");
    raiz.classList.toggle("contraste", tema === "contraste");
  }

  // Tamaño mayor que cabe en esta pantalla (lo calcula comun.js). Se aplica el menor entre el
  // guardado y el tope: al volver a una ventana grande se recupera lo que se había elegido.
  let tope = TAMANOS.length - 1;
  const nivelTexto = () => Math.min(ajustes.texto, tope);

  // El diseño pasa a una sola columna solo si la letra del navegador (o ?texto=) llega a 1,5 veces
  // la normal (24 px). El menú de accesibilidad no lo activa: mantiene siempre el menú lateral.
  function aplicarTexto() {
    const tamanoMenu = TAMANOS[nivelTexto()];
    const escalaMenu = textoVista ? 1 : tamanoMenu / 100;
    raiz.style.fontSize = (textoVista || tamanoMenu) + "%";
    raiz.classList.toggle("texto-grande", parseFloat(getComputedStyle(raiz).fontSize) / escalaMenu >= 24);
  }

  // Lo usa el menú de accesibilidad de comun.js
  window.preferencias = {
    TAMANOS,
    VIBRACION,
    leer: () => ({ ...ajustes }),
    nivelTexto,
    tope: () => tope,
    fijarTope(nivel) {
      tope = nivel;
      aplicarTexto();
    },
    guardar(cambios) {
      ajustes = { ...ajustes, ...cambios };
      try { localStorage.setItem(CLAVE, JSON.stringify(ajustes)); } catch (e) {}
      aplicarTema();
      aplicarTexto();
    },
    restablecer() {
      this.guardar(INICIALES);
    }
  };

  aplicarTema();
  aplicarTexto();
  contraste.addEventListener("change", aplicarTema);
  window.addEventListener("resize", aplicarTexto);
})();
