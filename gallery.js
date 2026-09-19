/* =========================================================================
   Boda de Toñi y Rocío · galería 3D del álbum ("el silo de recuerdos")
   - Anillos de fotos en 3D (CSS transforms, sin librerías) que giran solos
     y que se pueden arrastrar para mirar alrededor / subir y bajar.
   - Visor a pantalla completa con anterior/siguiente sobre TODAS las fotos.
   - Alternativa en cuadrícula para quien prefiera algo más sencillo, y
     respeto de "reduce motion".
   ========================================================================= */

(function () {
  "use strict";

  var PHOTOS = window.ALBUM_PHOTOS || [];
  if (!PHOTOS.length) return;

  var THUMB_DIR = "album/thumbs/";
  var FULL_DIR = "album/full/";

  var $ = function (id) { return document.getElementById(id); };
  var prefersReduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var stage = $("g3dStage");
  var scene = $("g3dScene");
  var sparkWrap = $("g3dSparkles");
  var grid = $("g3dGrid");
  var toggleBtn = $("g3dToggle");
  var countEl = $("g3dCount");
  var upBtn = $("g3dUp");
  var downBtn = $("g3dDown");

  var lb = $("g3dLb");
  var lbImg = $("g3dLbImg");
  var lbCount = $("g3dLbCount");

  var built = false;
  var showingGrid = false;

  /* =======================================================================
     DISPOSICIÓN DE LOS ANILLOS
     ===================================================================== */
  var PER_RING = 17; // 170 fotos = 10 anillos exactos de 17
  var ringsCount = Math.max(1, Math.ceil(PHOTOS.length / PER_RING));

  function sizes() {
    var w = window.innerWidth;
    if (w < 380) return { cw: 92, ch: 122, gap: 172 };
    if (w < 640) return { cw: 112, ch: 148, gap: 200 };
    return { cw: 134, ch: 176, gap: 226 };
  }

  var geo = null; // se calcula al construir

  function buildScene() {
    scene.innerHTML = "";
    geo = sizes();

    var perLastRing = PHOTOS.length - PER_RING * (ringsCount - 1);
    var idx = 0;

    for (var r = 0; r < ringsCount; r++) {
      var count = (r === ringsCount - 1) ? perLastRing : PER_RING;
      if (count <= 0) break;

      var ring = document.createElement("div");
      ring.className = "g3d__ring";
      ring.dataset.dir = (r % 2 === 0) ? "fwd" : "rev";
      var dur = 50 + r * 9;
      ring.style.animationDuration = dur + "s";
      ring.style.top = (r * geo.gap) + "px";

      var angleStep = 360 / count;
      var half = (angleStep / 2) * (Math.PI / 180);
      var radius = Math.round((geo.cw / 2) / Math.tan(half));

      for (var i = 0; i < count; i++) {
        var p = PHOTOS[idx % PHOTOS.length];
        idx++;
        var card = document.createElement("div");
        card.className = "g3d__card";
        card.style.setProperty("--cw", geo.cw + "px");
        card.style.setProperty("--ch", geo.ch + "px");
        card.style.setProperty("--ang", (angleStep * i) + "deg");
        card.style.setProperty("--rad", radius + "px");
        card.dataset.index = String((idx - 1) % PHOTOS.length);

        var img = document.createElement("img");
        img.src = THUMB_DIR + p.f;
        img.alt = "Foto del álbum de boda";
        img.decoding = "async";
        card.appendChild(img);
        ring.appendChild(card);
      }
      scene.appendChild(ring);
    }

    // silo total y posición inicial de cámara (centrada un poco por debajo del medio)
    siloHeight = (ringsCount - 1) * geo.gap;
    panY = -Math.min(siloHeight, geo.gap * Math.min(3, ringsCount - 1));
    applyTransform();
  }

  function buildSparkles() {
    sparkWrap.innerHTML = "";
    if (prefersReduced) return;
    var n = 22;
    for (var i = 0; i < n; i++) {
      var s = document.createElement("span");
      s.className = "g3d__spark";
      s.style.left = (Math.random() * 100) + "%";
      s.style.top = (40 + Math.random() * 55) + "%";
      var dur = 9 + Math.random() * 10;
      s.style.animationDuration = dur + "s";
      s.style.animationDelay = (-Math.random() * dur) + "s";
      sparkWrap.appendChild(s);
    }
  }

  /* =======================================================================
     CÁMARA: rotación + paneo vertical, arrastre + idle auto-rotate
     ===================================================================== */
  var rotY = -20;
  var tiltX = -8;
  var panY = 0;
  var siloHeight = 0;

  var dragging = false;
  var lastX = 0, lastY = 0, moved = 0;
  var idleSpin = !prefersReduced;
  var idleTimer = null;
  var rafId = null;

  /* ---------- entrada "vuelo hacia el cilindro" ---------- */
  var ENTRANCE_MS = 1250;
  var entrance = 1;       // 0 = recién disparada, 1 = ya en su sitio
  var entranceStart = 0;
  // easeOutQuart: arranque rápido y frenado continuo, sin tirones a medio camino
  function easeEntrance(t) { return 1 - Math.pow(1 - t, 4); }

  function applyTransform() {
    var warp = 1 - entrance;
    var extraZ = -2100 * warp;
    var extraScale = 1 - 0.62 * warp;
    scene.style.transform =
      "translate(-50%,-50%) translateY(" + panY + "px) " +
      "translateZ(" + extraZ + "px) scale(" + extraScale.toFixed(3) + ") " +
      "rotateX(" + tiltX + "deg) rotateY(" + rotY + "deg)";
    // solo transform + opacity (baratos, van por GPU): nada de "filter" animado
    // por frame, que en 170 fotos provoca tirones reales en el móvil
    scene.style.opacity = warp > 0 ? String(0.25 + 0.75 * entrance) : "";
  }

  function clampPan(v) {
    return Math.max(-siloHeight - geo.gap * 0.4, Math.min(geo.gap * 0.4, v));
  }

  function tick() {
    var now = performance.now();
    var warp = 1 - entrance;
    if (entrance < 1) {
      var t = Math.min(1, (now - entranceStart) / ENTRANCE_MS);
      entrance = easeEntrance(t);
      warp = 1 - entrance;
    }
    // gira SIEMPRE que esté entrando (nunca estático) y además en el idle
    // normal; así el paralaje se ve desde el primer frame y no hay un
    // salto de "quieto" a "girando" que rompa la sensación de cilindro
    if (!dragging && (warp > 0 || idleSpin)) {
      rotY += 0.045 + 0.5 * warp;
      applyTransform();
    } else if (warp > 0) {
      applyTransform();
    }
    rafId = requestAnimationFrame(tick);
  }

  function flashPulse() {
    var flash = $("flash");
    if (!flash || prefersReduced) return;
    try {
      flash.animate(
        [{ opacity: 0 }, { opacity: .85, offset: .18 }, { opacity: 0 }],
        { duration: 480, easing: "ease-out" }
      );
    } catch (e) {}
  }

  function playEntrance() {
    if (prefersReduced) {
      entrance = 1;
      albumScreen.classList.add("is-open");
      applyTransform();
      return;
    }
    flashPulse();
    entrance = 0;
    entranceStart = performance.now();
    applyTransform();
    albumScreen.classList.remove("is-open");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { albumScreen.classList.add("is-open"); });
    });
  }

  function startLoop() {
    if (rafId) return;
    rafId = requestAnimationFrame(tick);
  }
  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function pauseIdleFor(ms) {
    idleSpin = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { if (!prefersReduced) idleSpin = true; }, ms);
  }

  function onDown(e) {
    if (showingGrid) return;
    e.preventDefault();
    dragging = true;
    moved = 0;
    stage.classList.add("is-dragging");
    var pt = point(e);
    lastX = pt.x; lastY = pt.y;
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function onMove(e) {
    if (!dragging) return;
    var pt = point(e);
    var dx = pt.x - lastX, dy = pt.y - lastY;
    lastX = pt.x; lastY = pt.y;
    moved += Math.abs(dx) + Math.abs(dy);
    rotY += dx * 0.35;
    tiltX = Math.max(-24, Math.min(6, tiltX - dy * 0.06));
    panY = clampPan(panY + dy * 0.9);
    applyTransform();
  }
  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");
    pauseIdleFor(1400);
    if (moved < 6) {
      // pointer capture retargets e.target to the stage itself, so hit-test
      // the actual point on screen to find which card was tapped
      var pt = point(e);
      var hit = document.elementFromPoint(pt.x, pt.y);
      var card = hit && hit.closest ? hit.closest(".g3d__card") : null;
      if (card) openLightbox(parseInt(card.dataset.index, 10));
    }
  }
  function point(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function panStep(dir) {
    pauseIdleFor(1600);
    panY = clampPan(panY + dir * geo.gap);
    applyTransform();
  }

  /* =======================================================================
     CUADRÍCULA ALTERNATIVA
     ===================================================================== */
  function buildGrid() {
    if (grid.childElementCount) return;
    PHOTOS.forEach(function (p, i) {
      var fig = document.createElement("button");
      fig.type = "button";
      fig.className = "g3d__gitem";
      var img = document.createElement("img");
      img.src = THUMB_DIR + p.f;
      img.alt = "Foto del álbum de boda";
      img.loading = "lazy";
      img.decoding = "async";
      fig.appendChild(img);
      fig.addEventListener("click", function () { openLightbox(i); });
      grid.appendChild(fig);
    });
  }

  function toggleView() {
    showingGrid = !showingGrid;
    if (showingGrid) {
      buildGrid();
      grid.hidden = false;
      stage.hidden = true;
      toggleBtn.textContent = "◎ Galaxia";
      idleSpin = false;
    } else {
      grid.hidden = true;
      stage.hidden = false;
      toggleBtn.textContent = "▦ Cuadrícula";
      if (!prefersReduced) idleSpin = true;
    }
  }

  /* =======================================================================
     VISOR CON NAVEGACIÓN
     ===================================================================== */
  var lbIndex = 0;

  function openLightbox(i) {
    lbIndex = ((i % PHOTOS.length) + PHOTOS.length) % PHOTOS.length;
    renderLb();
    lb.hidden = false;
  }
  function closeLightbox() { lb.hidden = true; lbImg.src = ""; }
  function renderLb() {
    var p = PHOTOS[lbIndex];
    lbImg.classList.remove("is-in");
    var next = new Image();
    next.onload = function () {
      lbImg.src = next.src;
      requestAnimationFrame(function () { lbImg.classList.add("is-in"); });
    };
    next.src = FULL_DIR + p.f;
    lbCount.textContent = (lbIndex + 1) + " / " + PHOTOS.length;
  }
  function lbStep(dir) { openLightbox(lbIndex + dir); }

  var lbTouchX = null;
  lb.addEventListener("touchstart", function (e) {
    lbTouchX = e.touches[0].clientX;
  }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (lbTouchX == null) return;
    var dx = e.changedTouches[0].clientX - lbTouchX;
    if (Math.abs(dx) > 40) lbStep(dx < 0 ? 1 : -1);
    lbTouchX = null;
  }, { passive: true });

  /* =======================================================================
     ARRANQUE (bajo demanda, al abrir el álbum por primera vez)
     ===================================================================== */
  function ensureBuilt() {
    if (built) return;
    built = true;
    countEl.textContent = String(PHOTOS.length);
    buildScene();
    buildSparkles();
    startLoop();

    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("pointerleave", function (e) { if (dragging) onUp(e); });

    upBtn.addEventListener("click", function () { panStep(1); });
    downBtn.addEventListener("click", function () { panStep(-1); });
    toggleBtn.addEventListener("click", toggleView);

    $("g3dLbClose").addEventListener("click", closeLightbox);
    $("g3dLbPrev").addEventListener("click", function () { lbStep(-1); });
    $("g3dLbNext").addEventListener("click", function () { lbStep(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });

    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") lbStep(-1);
      else if (e.key === "ArrowRight") lbStep(1);
    });

    window.addEventListener("resize", function () {
      if (!built) return;
      buildScene();
    });
  }

  var albumBtn = $("albumBtn");
  var albumScreen = $("albumScreen");
  var albumClose = $("albumClose");

  if (albumBtn) {
    albumBtn.addEventListener("click", function () {
      ensureBuilt();
      startLoop();
      playEntrance();
    });
  }
  if (albumClose) {
    albumClose.addEventListener("click", function () {
      closeLightbox();
      stopLoop();
      albumScreen.classList.remove("is-open");
    });
  }
})();
