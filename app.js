/* =========================================================================
   Boda de Toñi y Rocío · lógica de la web
   - Bienvenida una vez por visita (sessionStorage)
   - Identificador anónimo del invitado (localStorage) + firma opcional
   - Subida directa a Cloudinary con "unsigned upload preset"
   - Cada invitado ve SOLO sus fotos (guardadas en su navegador)
   - Borrado real durante los primeros N minutos; después "quitar de mi galería"
   ========================================================================= */

(function () {
  "use strict";

  var CFG = window.BODA_CONFIG || {};
  var LEAD = CFG.welcomeLead || "nos casamos";
  var HARD_MS = (CFG.hardDeleteMinutes || 10) * 60 * 1000;
  var CONFIGURED =
    CFG.cloudName && CFG.cloudName !== "TU_CLOUD_NAME" &&
    CFG.uploadPreset && CFG.uploadPreset !== "TU_UPLOAD_PRESET";

  var K_GUEST = "boda_tr_guest_v1";
  var K_PHOTOS = "boda_tr_photos_v1";
  var K_WELCOMED = "boda_tr_welcomed_v1";
  var K_SIGN_ASKED = "boda_tr_sign_asked_v1";

  var $ = function (id) { return document.getElementById(id); };
  var prefersReduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- almacenamiento seguro ---------- */
  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  /* ---------- invitado ---------- */
  var guest = load(K_GUEST, null);
  if (!guest || !guest.id) {
    guest = { id: newId(), name: "", nextFrame: 24 };
    save(K_GUEST, guest);
  }
  if (typeof guest.nextFrame !== "number") guest.nextFrame = 24;

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "g-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  // nombre -> texto seguro para etiqueta / nombre de archivo de Cloudinary
  function slug(s) {
    var out = (s || "");
    try { out = out.normalize("NFD").replace(/\p{Diacritic}/gu, ""); } catch (e) {}
    return out
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30);
  }

  var photos = load(K_PHOTOS, []);

  /* =======================================================================
     BIENVENIDA
     ===================================================================== */
  function setupWelcome() {
    var welcome = $("welcome");
    $("welcomeLead").textContent = LEAD;
    $("welcomeDate").textContent = CFG.date || "";

    var already = false;
    try { already = sessionStorage.getItem(K_WELCOMED) === "1"; } catch (e) {}

    if (already) {
      welcome.remove();
      openApp();
      return;
    }

    // flash de cámara + revelado
    if (!prefersReduced) {
      var flash = $("flash");
      try {
        flash.animate(
          [{ opacity: 0 }, { opacity: 0.92, offset: 0.12 }, { opacity: 0 }],
          { duration: 520, easing: "ease-out" }
        );
      } catch (e) {}
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { welcome.classList.add("is-developing"); });
    });

    var done = false;
    function dismiss() {
      if (done) return;
      done = true;
      try { sessionStorage.setItem(K_WELCOMED, "1"); } catch (e) {}
      welcome.classList.add("is-leaving");
      openApp();
      setTimeout(function () { welcome.remove(); }, 650);
    }

    welcome.addEventListener("click", dismiss);
    welcome.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") dismiss();
    });
    welcome.tabIndex = 0;
    welcome.focus();
    setTimeout(dismiss, prefersReduced ? 2600 : 4800);
  }

  /* =======================================================================
     APP
     ===================================================================== */
  function openApp() {
    var app = $("app");
    app.hidden = false;

    $("footMin").textContent = String(CFG.hardDeleteMinutes || 10);

    if (!CONFIGURED) $("configWarn").hidden = false;

    var camInput = $("fileInput");
    var galInput = $("galleryInput");
    var shutter = $("shutter");

    function busy() { return shutter.getAttribute("aria-busy") === "true"; }

    shutter.addEventListener("click", function () {
      if (!busy()) camInput.click();
    });
    $("galleryBtn").addEventListener("click", function () {
      if (!busy()) galInput.click();
    });

    function onPick(inp) {
      return function () {
        var files = Array.prototype.slice.call(inp.files || []);
        inp.value = "";
        if (files.length) handleFiles(files);
      };
    }
    camInput.addEventListener("change", onPick(camInput));
    galInput.addEventListener("change", onPick(galInput));

    $("albumBtn").addEventListener("click", function () { $("albumScreen").hidden = false; });
    $("albumClose").addEventListener("click", function () { $("albumScreen").hidden = true; });

    $("viewerClose").addEventListener("click", closeViewer);
    $("viewer").addEventListener("click", function (e) {
      if (e.target === $("viewer")) closeViewer();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeViewer();
        $("albumScreen").hidden = true;
      }
    });

    setupSign();
    renderCount();
    renderStrip();
  }

  /* ---------- firma opcional ---------- */
  function setupSign() {
    var card = $("signCard");
    var toggle = $("signToggle");
    var nameInput = $("nameInput");
    var asked = false;
    try { asked = localStorage.getItem(K_SIGN_ASKED) === "1"; } catch (e) {}

    function openCard() {
      nameInput.value = guest.name || "";
      card.hidden = false;
      toggle.hidden = true;
      try { nameInput.focus(); } catch (e) {}
    }

    function closeCard() {
      card.hidden = true;
      toggle.hidden = false;
      toggle.textContent = guest.name
        ? "Firmas como " + guest.name + " · cambiar"
        : "Firmar mis fotos";
    }

    // estado inicial: pide firmar la primera vez; después, siempre queda el enlace
    if (!asked && !guest.name) openCard();
    else closeCard();

    // tras subir fotos, refresca el enlace por si acaso
    window._maybeShowSign = function () { if (card.hidden) closeCard(); };

    toggle.addEventListener("click", openCard);

    $("nameSave").addEventListener("click", function () {
      guest.name = nameInput.value.trim().slice(0, 40);
      save(K_GUEST, guest);
      try { localStorage.setItem(K_SIGN_ASKED, "1"); } catch (e) {}
      closeCard();
      toast(guest.name ? "Firmarás como " + guest.name : "Firma quitada");
    });

    $("nameSkip").addEventListener("click", function () {
      try { localStorage.setItem(K_SIGN_ASKED, "1"); } catch (e) {}
      closeCard();
    });
  }

  /* =======================================================================
     SUBIDA
     ===================================================================== */
  function handleFiles(files) {
    if (!CONFIGURED) {
      toast("La web aún no está conectada a Cloudinary.");
      return;
    }
    var images = files.filter(function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|heic|heif|webp)$/i.test(f.name); });
    if (!images.length) {
      toast("Elige fotos, por favor.");
      return;
    }

    var shutter = $("shutter");
    shutter.setAttribute("aria-busy", "true");
    $("galleryBtn").disabled = true;
    var text = $("captureText");
    var total = images.length;
    var ok = 0;

    var chain = Promise.resolve();
    images.forEach(function (file, i) {
      chain = chain.then(function () {
        text.textContent = total > 1 ? ("Subiendo " + (i + 1) + " de " + total + "…") : "Subiendo…";
        return processFile(file).then(uploadOne).then(function (res) {
          addPhoto(res);
          ok++;
        }).catch(function (err) {
          console.error("[boda] fallo al subir", err);
        });
      });
    });

    chain.then(function () {
      shutter.removeAttribute("aria-busy");
      $("galleryBtn").disabled = false;
      text.textContent = "Hacer foto";
      renderCount();
      if (window._maybeShowSign) window._maybeShowSign();
      if (ok === total) toast(total === 1 ? "¡Foto subida!" : "¡" + ok + " fotos subidas!");
      else if (ok > 0) toast("Subidas " + ok + " de " + total + ". Reinténtalo con el resto.");
      else toast("No se pudo subir. Revisa la conexión e inténtalo otra vez.");
    });
  }

  /* reduce la foto en el móvil antes de subir (rápido y ahorra espacio) */
  function processFile(file) {
    var max = CFG.maxDimension || 1920;
    var q = CFG.quality || 0.82;

    if (!window.createImageBitmap) return Promise.resolve(file);

    return createImageBitmap(file, { imageOrientation: "from-image" })
      .then(function (bmp) {
        var w = bmp.width, h = bmp.height;
        var longest = Math.max(w, h);
        if (longest > max) {
          var s = max / longest;
          w = Math.round(w * s);
          h = Math.round(h * s);
        }
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(bmp, 0, 0, w, h);
        if (bmp.close) bmp.close();
        return new Promise(function (resolve) {
          canvas.toBlob(function (blob) {
            if (!blob) { resolve(file); return; }
            var name = (file.name || "foto").replace(/\.[^.]+$/, "") + ".jpg";
            resolve(new File([blob], name, { type: "image/jpeg" }));
          }, "image/jpeg", q);
        });
      })
      .catch(function () { return file; });
  }

  function uploadOne(file) {
    var fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", CFG.uploadPreset);
    if (CFG.folder) fd.append("folder", CFG.folder);

    var nameSlug = slug(guest.name);
    var tags = "invitado," + guest.id;
    if (nameSlug) tags += "," + nameSlug;
    fd.append("tags", tags);

    if (guest.name) fd.append("context", "guest=" + guest.name.replace(/[|=]/g, " "));
    if (nameSlug) {
      fd.append("public_id", nameSlug + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6));
    }

    var url = "https://api.cloudinary.com/v1_1/" + CFG.cloudName + "/auto/upload";
    return fetch(url, { method: "POST", body: fd }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error(res.status + " " + t); });
      return res.json();
    });
  }

  function addPhoto(res) {
    var frameNo = guest.nextFrame++;
    save(K_GUEST, guest);
    var rec = {
      id: res.public_id,
      url: res.secure_url,
      deleteToken: res.delete_token || null,
      uploadedAt: Date.now(),
      n: frameNo
    };
    photos.unshift(rec);
    save(K_PHOTOS, photos);
    prependFrame(rec);
  }

  /* =======================================================================
     RENDER
     ===================================================================== */
  function tx(url, t) {
    return url.indexOf("/upload/") > -1 ? url.replace("/upload/", "/upload/" + t + "/") : url;
  }
  function thumbOf(url) { return tx(url, "c_fill,g_auto,w_600,h_600,q_auto,f_auto"); }
  function bigOf(url) { return tx(url, "c_limit,w_1400,q_auto,f_auto"); }

  function renderCount() {
    var n = photos.length;
    var el = $("count");
    if (n === 0) el.textContent = "Aún no has subido fotos";
    else if (n === 1) el.textContent = "1 foto tuya en la colección";
    else el.textContent = n + " fotos tuyas en la colección";
  }

  function renderStrip() {
    var strip = $("strip");
    strip.innerHTML = "";
    photos.forEach(function (rec) { strip.appendChild(buildFrame(rec)); });
  }

  function prependFrame(rec) {
    var strip = $("strip");
    strip.insertBefore(buildFrame(rec), strip.firstChild);
  }

  function buildFrame(rec) {
    var fig = document.createElement("figure");
    fig.className = "frame";
    fig.dataset.id = rec.id;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "frame__btn";
    btn.setAttribute("aria-label", "Ver foto número " + rec.n);
    var img = document.createElement("img");
    img.className = "frame__img";
    img.loading = "lazy";
    img.alt = "Foto número " + rec.n;
    img.src = thumbOf(rec.url);
    btn.appendChild(img);
    btn.addEventListener("click", function () { openViewer(bigOf(rec.url)); });
    fig.appendChild(btn);

    var cap = document.createElement("figcaption");
    cap.className = "frame__cap";

    var no = document.createElement("span");
    no.className = "frame__no";
    no.textContent = "Nº " + rec.n;
    cap.appendChild(no);

    var hard = Date.now() - rec.uploadedAt < HARD_MS && rec.deleteToken;
    if (!hard) {
      var saved = document.createElement("span");
      saved.className = "frame__saved";
      saved.textContent = "en el álbum";
      cap.appendChild(saved);
    }

    var del = document.createElement("button");
    del.type = "button";
    del.className = "frame__del";
    del.textContent = "quitar";
    del.addEventListener("click", function () { askRemove(fig, rec); });
    cap.appendChild(del);

    fig.appendChild(cap);
    return fig;
  }

  /* =======================================================================
     QUITAR / BORRAR
     ===================================================================== */
  function askRemove(fig, rec) {
    if (fig.querySelector(".frame__confirm")) return;
    var hard = Date.now() - rec.uploadedAt < HARD_MS && rec.deleteToken;

    var box = document.createElement("div");
    box.className = "frame__confirm";
    var p = document.createElement("p");
    p.textContent = hard
      ? "Se borrará esta foto por completo. ¿Seguro?"
      : "Se quitará de tu galería. La foto seguirá guardada para el álbum de Toñi y Rocío.";
    box.appendChild(p);

    var row = document.createElement("div");
    row.className = "frame__confirm-row";
    var yes = document.createElement("button");
    yes.className = "btn-yes";
    yes.textContent = hard ? "Borrar" : "Quitar";
    var no = document.createElement("button");
    no.className = "btn-no";
    no.textContent = "Cancelar";
    row.appendChild(yes);
    row.appendChild(no);
    box.appendChild(row);
    fig.appendChild(box);

    no.addEventListener("click", function () { box.remove(); });
    yes.addEventListener("click", function () {
      yes.disabled = true;
      no.disabled = true;
      if (hard) {
        hardDelete(rec.deleteToken).then(function (okServer) {
          dropRecord(fig, rec);
          toast(okServer ? "Foto eliminada" : "Quitada de tu galería");
        });
      } else {
        dropRecord(fig, rec);
        toast("Quitada de tu galería");
      }
    });
  }

  function hardDelete(token) {
    var url = "https://api.cloudinary.com/v1_1/" + CFG.cloudName + "/delete_by_token";
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token })
    }).then(function (res) { return res.ok; }).catch(function () { return false; });
  }

  function dropRecord(fig, rec) {
    photos = photos.filter(function (p) { return p.id !== rec.id; });
    save(K_PHOTOS, photos);
    fig.classList.add("is-going");
    setTimeout(function () { fig.remove(); renderCount(); }, 380);
  }

  /* =======================================================================
     VISOR
     ===================================================================== */
  function openViewer(src) {
    var v = $("viewer");
    $("viewerImg").src = src;
    v.hidden = false;
  }
  function closeViewer() {
    var v = $("viewer");
    if (v.hidden) return;
    v.hidden = true;
    $("viewerImg").src = "";
  }

  /* =======================================================================
     TOAST
     ===================================================================== */
  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(function () { t.classList.add("is-on"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove("is-on");
      setTimeout(function () { t.hidden = true; }, 300);
    }, 2800);
  }

  /* ---------- arranque ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupWelcome);
  } else {
    setupWelcome();
  }
})();
