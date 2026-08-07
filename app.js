/* ==========================================================================
   TRAVESÍA Y BAJADA DE KAYAK · PARQUE NACIONAL LOS ALERCES
   FCE UNPSJB Sede Esquel

   Sin dependencias. Todo lo que toca el scroll pasa por un único
   requestAnimationFrame; los diálogos usan <dialog> nativo, así que el foco
   y la tecla Escape los maneja el navegador.
   ========================================================================== */
(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------------
     1 · SCROLL: barra de progreso. Un solo escritor, un solo rAF.
     ------------------------------------------------------------------------ */
  const progress = $('#progress');
  let ticking = false;

  function onFrame() {
    ticking = false;
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    if (progress) {
      progress.style.setProperty('--p', max > 0 ? (doc.scrollTop / max).toFixed(4) : 0);
    }
  }

  function requestFrame() {
    if (!ticking) { ticking = true; requestAnimationFrame(onFrame); }
  }

  addEventListener('scroll', requestFrame, { passive: true });
  addEventListener('resize', requestFrame, { passive: true });
  onFrame();

  /* ------------------------------------------------------------------------
     2 · NAVEGACIÓN: menú móvil y sección activa
     ------------------------------------------------------------------------ */
  const nav = $('#nav');
  const navToggle = $('#navToggle');

  if (nav && navToggle) {
    const setNav = (open) => {
      nav.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    };

    navToggle.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setNav(false); navToggle.focus(); } });
  }

  // Sección activa: se marca la que cruza el centro de la ventana.
  const navLinks = $$('.nav a');
  const sections = navLinks
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => {
          a.classList.toggle('is-current', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach((s) => spy.observe(s));
  }

  /* ------------------------------------------------------------------------
     3 · CARTOGRAFÍA: el trazado se dibuja al entrar en pantalla
     ------------------------------------------------------------------------ */
  const routemap = $('#routemap');
  const routePath = $('#rmRoute');

  if (routemap && routePath) {
    // La longitud real del trazo alimenta el dash-offset del CSS.
    const len = Math.ceil(routePath.getTotalLength());
    routePath.style.setProperty('--len', len);

    const draw = () => routemap.classList.add('is-drawn');

    if (calm.matches || !('IntersectionObserver' in window)) {
      draw();
    } else {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { draw(); obs.disconnect(); }
        });
      }, { threshold: 0.35 });
      io.observe(routemap);
    }

    // Resaltado cruzado entre la lista de tramos y los hitos del croquis.
    const link = (stage) => {
      const id = stage.dataset.node;
      const node = $(`.rm-node[data-node="${id}"]`, routemap);
      if (!node) return;
      const on  = () => { node.classList.add('is-lit'); stage.classList.add('is-lit'); };
      const off = () => { node.classList.remove('is-lit'); stage.classList.remove('is-lit'); };
      stage.addEventListener('mouseenter', on);
      stage.addEventListener('mouseleave', off);
      stage.addEventListener('focusin', on);
      stage.addEventListener('focusout', off);
    };
    $$('.stage[data-node]').forEach(link);
  }

  /* ------------------------------------------------------------------------
     4 · APARICIONES AL SCROLL
     ------------------------------------------------------------------------ */
  const revealTargets = [
    ['.cover__body', 0], ['.chart', 90],
    ['.head', 0], ['.stage', 60], ['.note', 0],
    ['.article__body', 0], ['.article__aside', 90],
    ['.film', 0], ['.plate', 55], ['.linkrow', 0],
    ['.person', 0], ['.commissions > div', 55],
    ['.voice', 70], ['.patrons__list', 0]
  ];

  if (!calm.matches && 'IntersectionObserver' in window) {
    const revealer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealTargets.forEach(([sel, step]) => {
      $$(sel).forEach((el, i) => {
        el.setAttribute('data-reveal', '');
        if (step) el.style.setProperty('--d', `${Math.min(i * step, 400)}ms`);
        revealer.observe(el);
      });
    });
  }

  /* ------------------------------------------------------------------------
     5 · FOTOGRAFÍAS AUSENTES
     El repositorio todavía no trae assets/. En vez de mostrar el ícono de
     imagen rota, la lámina cae a un estado vacío diseñado. Cuando los
     archivos se suban, se muestran solos: no hay que tocar nada.
     ------------------------------------------------------------------------ */
  function watchImage(img) {
    const frame = img.closest('.plate, .person__plate');
    if (!frame) return;
    const fail = () => frame.classList.add('is-empty');
    img.addEventListener('error', fail);
    // Puede haber fallado antes de que corriera este script.
    if (img.complete && img.naturalWidth === 0) fail();
  }
  $$('.plate img, .person__plate img').forEach(watchImage);

  /* ------------------------------------------------------------------------
     6 · VIDEO: fachada liviana
     El reproductor de YouTube (≈1 MB) sólo se carga si alguien lo pide.
     ------------------------------------------------------------------------ */
  const film = $('#film');
  if (film) {
    const btn = $('.film__btn', film);
    btn?.addEventListener('click', () => {
      const id = film.dataset.video;
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
      frame.title = 'Video de la Travesía de Kayak en el Parque Nacional Los Alerces';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      film.appendChild(frame);
      btn.remove();
    }, { once: true });
  }

  /* ------------------------------------------------------------------------
     7 · DIÁLOGOS
     <dialog> nativo: atrapa el foco, cierra con Escape y devuelve el foco
     al elemento que lo abrió. No hace falta reimplementar nada de eso.
     ------------------------------------------------------------------------ */
  const lock = (on) => document.body.classList.toggle('is-locked', on);

  function wireDialog(dlg) {
    if (!dlg) return;
    $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
    // Clic fuera del contenido.
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => lock(false));
  }

  const patronsDialog = $('#patronsDialog');
  wireDialog(patronsDialog);
  $('#openPatrons')?.addEventListener('click', () => { lock(true); patronsDialog.showModal(); });

  /* ------------------------------------------------------------------------
     8 · VISOR DE FOTOGRAFÍAS
     ------------------------------------------------------------------------ */
  const viewer = $('#viewer');
  const viewerImg = $('#viewerImg');
  const viewerCap = $('#viewerCap');
  wireDialog(viewer);

  if (viewer && viewerImg) {
    let shots = [];
    let at = 0;

    const paint = () => {
      const shot = shots[at];
      if (!shot) return;
      viewerImg.src = shot.src;
      viewerImg.alt = shot.alt;
      viewerCap.textContent = shot.caption;
    };

    const step = (delta) => {
      if (shots.length < 2) return;
      at = (at + delta + shots.length) % shots.length;
      paint();
    };

    $$('[data-step]', viewer).forEach((b) => {
      b.addEventListener('click', () => step(Number(b.dataset.step)));
    });

    viewer.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); step(-1); }
    });

    $$('.plate').forEach((plate) => {
      const open = () => {
        if (plate.classList.contains('is-empty')) return;

        // Sólo entran al visor las láminas que realmente tienen foto.
        const live = $$('.plate').filter((p) => !p.classList.contains('is-empty'));
        shots = live.map((p) => ({
          src: p.dataset.full,
          alt: $('img', p)?.alt || '',
          caption: p.dataset.caption || ''
        }));
        at = Math.max(0, live.indexOf(plate));

        paint();
        lock(true);
        viewer.showModal();
      };

      plate.addEventListener('click', open);
      // Accesible por teclado sin convertirlo en botón (rompería el figure).
      plate.tabIndex = 0;
      plate.setAttribute('role', 'button');
      plate.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  /* ------------------------------------------------------------------------
     9 · AÑO EN EL PIE
     ------------------------------------------------------------------------ */
  const legal = $('.foot__legal');
  if (legal) {
    const year = new Date().getFullYear();
    if (year > 2026) legal.textContent = legal.textContent.replace('© 2026', `© 2026–${year}`);
  }

})();
