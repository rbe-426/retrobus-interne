/* ==========================================================================
   Rétrobus / TICE – pilotage de l'écran TFT
   Touches : 1 veille · 2 prochains arrêts · 3 arrivées · 4 terminus
             0 = rotation automatique on/off
   Console du navigateur : TFT.setLine("7", "#0a7d3b"), TFT.setStops([...]) …
   ========================================================================== */
(function () {
  "use strict";

  // ---------- Données modifiables ----------
  var config = {
    line: { label: "LIGNE", color: "#dc0032" },     // libellé + couleur (rail, flèche, pastille)
    destination: { city: "Ville de destinat", stop: "Arrêt terminus" },
    // Prochains arrêts : le 1er est l'arrêt "en cours" (pastille orange)
    stops: [
      { city: "VILLE", name: "Arrêt" },
      { city: "VILLE", name: "Arrêt" },
      { city: "VILLE", name: "Arrêt" },
      { city: "VILLE", name: "Arrêt" }
    ],
    // Fin de parcours : dernier élément = terminus
    terminus: [
      { city: "VILLE", name: "Arrêt" },
      { city: "VILLE", name: "Arrêt" },
      { city: "VILLE", name: "Arrêt (terminus)" }
    ],
    arrivals: [
      { city: "VILLE", name: "Arrêt", minutes: "X" },
      { city: "VILLE", name: "Arrêt", minutes: "X" },
      { city: "CORBEIL", name: "Léon Cassé", minutes: 16 },
      { city: "EVRY", name: "Hôpital Sud Franc", minutes: 19 }
    ],
    autoRotateSeconds: 8,
    autoRotate: false
  };

  var MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  var current = 1, timer = null;

  function $(id) { return document.getElementById(id); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // Texte noir ou blanc selon la luminosité de la couleur de ligne
  function textFor(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return "#000";
    var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#000" : "#fff";
  }

  function bind(name, value) {
    var els = document.querySelectorAll('[data-bind="' + name + '"]');
    for (var i = 0; i < els.length; i++) els[i].textContent = value;
  }

  // ---------- Horloge (HH:mm) + date ----------
  function tick() {
    var d = new Date();
    bind("clock", pad(d.getHours()) + ":" + pad(d.getMinutes()));
    bind("date", d.getDate() + " " + MONTHS[d.getMonth()]);
  }

  // ---------- Rendu ----------
  function renderHeader() {
    document.documentElement.style.setProperty("--line-color", config.line.color);
    document.documentElement.style.setProperty("--line-text", textFor(config.line.color));
    bind("line", config.line.label);
    bind("destCity", config.destination.city);
    bind("destStop", config.destination.stop);
  }

  function renderStops(containerId, list, isTerminus) {
    var html = "";
    for (var i = 0; i < list.length; i++) {
      var cls = "stop-row";
      if (i === 0) cls += " first next";
      if (i === list.length - 1) cls += " last";
      if (isTerminus && i === list.length - 2) cls += " end-arrow";
      html += '<div class="' + cls + '"><span class="city">' + esc(list[i].city) + ' -</span><span class="name">' +
              esc(list[i].name) + '</span><span class="rail"><i class="node"></i></span></div>';
    }
    $(containerId).innerHTML = html;
  }

  function renderArrivals() {
    var html = "";
    config.arrivals.forEach(function (a) {
      html += '<div class="arrival"><span><span class="city">' + esc(a.city) + ' - </span><span class="stop">' +
              esc(a.name) + '</span></span><span class="time">' + esc(a.minutes) + ' mn</span></div>';
    });
    $("arrivals-list").innerHTML = html;
  }

  function render() {
    renderHeader();
    renderStops("stops-list", config.stops, false);
    renderStops("terminus-list", config.terminus, true);
    renderArrivals();
  }

  // ---------- Slides ----------
  function show(n) {
    if (n < 1 || n > 4) return;
    current = n;
    for (var i = 1; i <= 4; i++) $("slide-" + i).classList.toggle("active", i === n);
  }

  function setAuto(on) {
    config.autoRotate = on;
    clearInterval(timer);
    if (on) timer = setInterval(function () { show(current % 4 + 1); }, config.autoRotateSeconds * 1000);
  }

  // ---------- Mise à l'échelle de la scène ----------
  function fit() {
    var s = Math.min(window.innerWidth / 1024, window.innerHeight / 576);
    $("stage").style.transform = "translate(-50%, -50%) scale(" + s + ")";
  }

  // ---------- API publique (console ou intégration) ----------
  window.TFT = {
    config: config,
    show: show,
    refresh: render,
    setLine: function (label, color) { config.line.label = label; if (color) config.line.color = color; render(); },
    setDestination: function (city, stop) { config.destination.city = city; config.destination.stop = stop; render(); },
    setStops: function (list) { config.stops = list; render(); },
    setTerminus: function (list) { config.terminus = list; render(); },
    setArrivals: function (list) { config.arrivals = list; render(); },
    setAuto: setAuto
  };

  document.addEventListener("keydown", function (e) {
    if (e.key >= "1" && e.key <= "4") show(+e.key);
    else if (e.key === "0") setAuto(!config.autoRotate);
  });
  window.addEventListener("resize", fit);

  render(); tick(); fit(); show(1); setAuto(config.autoRotate);
  setInterval(tick, 1000);
})();
