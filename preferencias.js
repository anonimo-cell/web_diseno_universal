// Colores y tamaño de letra: los decide cada persona en su sistema o navegador, no la web.
// Se carga en <head>, antes que los estilos, para que la página no parpadee en otro color.
//   · Oscuro y más contraste: los ajustes del sistema (prefers-color-scheme, prefers-contrast).
//   · Temas de contraste de Windows: los resuelve estilos.css con forced-colors.
//   · Zoom y tamaño de letra: los del navegador. El diseño se reorganiza con texto grande.
// prototipos.html añade ?tema= y ?texto= a la dirección para enseñar cada combinación.
(function () {
  const raiz = document.documentElement;
  const vista = new URLSearchParams(location.search);
  const oscuro = matchMedia("(prefers-color-scheme: dark)");
  const contraste = matchMedia("(prefers-contrast: more)");
  const textoVista = Number(vista.get("texto"));

  function aplicarTema() {
    // El tema oscuro ya supera 7:1: quien pide oscuro y más contraste no pasa a fondo blanco
    const tema = vista.get("tema") || (oscuro.matches ? "oscuro" : contraste.matches ? "contraste" : "claro");
    raiz.classList.toggle("oscuro", tema === "oscuro");
    raiz.classList.toggle("contraste", tema === "contraste");
  }

  // A partir de 1,5 veces el tamaño normal (24 px) el diseño pasa a una sola columna
  function aplicarTexto() {
    if (textoVista) raiz.style.fontSize = textoVista + "%";
    raiz.classList.toggle("texto-grande", parseFloat(getComputedStyle(raiz).fontSize) >= 24);
  }

  aplicarTema();
  aplicarTexto();
  oscuro.addEventListener("change", aplicarTema);
  contraste.addEventListener("change", aplicarTema);
  window.addEventListener("resize", aplicarTexto);
})();
