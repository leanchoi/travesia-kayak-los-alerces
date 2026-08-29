/* ==========================================================================
   TRAVESÍA Y BAJADA DE KAYAK · PARQUE NACIONAL LOS ALERCES
   FCE UNPSJB Sede Esquel
   Application & Admin Dashboard JavaScript Controller
   ========================================================================== */
(() => {
  'use strict';

  const API_BASE = '';

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

    const link = (stage) => {
      const id = stage.dataset.node;
      const pt = id ? $(`#rmPt-${id}`) : null;
      return { stage, pt };
    };

    const pairs = $$('.stage').map(link).filter((p) => p.pt);

    const activate = (targetPt) => {
      pairs.forEach(({ stage, pt }) => {
        const active = pt === targetPt;
        pt.classList.toggle('is-active', active);
        stage.classList.toggle('is-active', active);
      });
    };

    pairs.forEach(({ stage, pt }) => {
      const onEnter = () => activate(pt);
      stage.addEventListener('mouseenter', onEnter);
      stage.addEventListener('focusin', onEnter);
      pt.addEventListener('mouseenter', onEnter);
    });
  }

  /* ------------------------------------------------------------------------
     4 · VIDEO COMPONENT: Autoplay on scroll & Sticky Behavior (Desktop only)
     ------------------------------------------------------------------------ */
  const galleryVideo = $('#galleryVideo');
  if (galleryVideo && 'IntersectionObserver' in window) {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) {
      const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            galleryVideo.play().catch(() => {});
          } else {
            galleryVideo.pause();
          }
        });
      }, { threshold: 0.35 });

      videoObserver.observe(galleryVideo);
    }
  }

  /* ------------------------------------------------------------------------
     5 · MODALES Y ACCESIBILIDAD: patrón común dialog.showModal()
     ------------------------------------------------------------------------ */
  let scrollY = 0;

  const lock = (on) => {
    if (on) {
      scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    }
  };

  function wireDialog(dlg) {
    if (!dlg) return;
    dlg.addEventListener('close', () => lock(false));
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) {
        dlg.close();
      }
    });
  }

  /* ------------------------------------------------------------------------
     6 · CARRUSEL POR AÑO (galería histórica)
     ------------------------------------------------------------------------ */
  const yearDialog = $('#yearDialog');
  wireDialog(yearDialog);

  const archive = {
    '1997': {
      title: 'Edición 1997 · La bajada pionera',
      lede: 'Imágenes históricas del primer descenso universitario en el Río Arrayanes, que sentó las bases institucionales de la travesía.',
      items: [
        { src: 'assets/anios/1997-01.jpg', cap: 'Acreditación y preparativos en la orilla del Lago Verde (1997).' },
        { src: 'assets/anios/1997-02.jpg', cap: 'Primer grupo de remeros ingresando al cauce del Río Arrayanes (1997).' }
      ]
    },
    '2026': {
      title: 'Edición VII · Noviembre 2026',
      lede: 'Fotografías del cruce del Lago Verde, el tramo técnico por el Arrayanes y la llegada al Camping Agreste Bahía Rosales.',
      items: [
        { src: 'assets/anios/2026-04-01.jpg', cap: 'Formación de kayaks en aguas transparentes del Lago Verde (2026).' },
        { src: 'assets/anios/2026-04-02.jpg', cap: 'Parada técnica y almuerzo de camaradería en Hostería Cumehué (2026).' }
      ]
    }
  };

  let currentYearItems = [];
  let currentYearIdx = 0;

  function renderYearSlide(idx) {
    const track = $('#yearTrack');
    const dots = $('#yearDots');
    if (!track || !currentYearItems.length) return;

    currentYearIdx = (idx + currentYearItems.length) % currentYearItems.length;
    const item = currentYearItems[currentYearIdx];

    track.innerHTML = `
      <figure class="reel__slide">
        <img src="${item.src}" alt="${item.cap}">
        <figcaption class="reel__cap">${item.cap}</figcaption>
      </figure>
    `;

    if (dots) {
      dots.innerHTML = currentYearItems.map((_, i) =>
        `<button class="reel__dot ${i === currentYearIdx ? 'is-active' : ''}" data-idx="${i}" aria-label="Ir a foto ${i + 1}"></button>`
      ).join('');
    }
  }

  $$('.history-card').forEach(card => {
    card.addEventListener('click', () => {
      const year = card.dataset.year;
      const data = archive[year];
      if (!data || !yearDialog) return;

      $('#yearTitle').textContent = data.title;
      $('#yearLede').textContent  = data.lede;
      currentYearItems = data.items;
      renderYearSlide(0);

      lock(true);
      yearDialog.showModal();
    });
  });

  $('#yearDots')?.addEventListener('click', (e) => {
    const dot = e.target.closest('.reel__dot');
    if (dot) renderYearSlide(Number(dot.dataset.idx));
  });

  $$('[data-reel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = Number(btn.dataset.reel);
      renderYearSlide(currentYearIdx + step);
    });
  });

  /* ------------------------------------------------------------------------
     7 · VISOR DE IMÁGENES (Lector de fotos)
     ------------------------------------------------------------------------ */
  const viewer = $('#viewer');
  wireDialog(viewer);

  let viewerItems = [];
  let viewerIdx = 0;

  function openViewer(items, startIdx = 0) {
    if (!viewer || !items.length) return;
    viewerItems = items;
    viewerIdx = startIdx;
    showViewerSlide(startIdx);
    lock(true);
    viewer.showModal();
  }

  function showViewerSlide(idx) {
    viewerIdx = (idx + viewerItems.length) % viewerItems.length;
    const item = viewerItems[viewerIdx];
    const img = $('#viewerImg');
    const cap = $('#viewerCap');
    if (img) { img.src = item.src; img.alt = item.cap || ''; }
    if (cap) { cap.textContent = item.cap || ''; }
  }

  $$('[data-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      showViewerSlide(viewerIdx + Number(btn.dataset.step));
    });
  });

  $$('.gallery-grid figure').forEach((fig, idx, arr) => {
    fig.addEventListener('click', () => {
      const items = Array.from(arr).map(f => ({
        src: f.querySelector('img')?.src,
        cap: f.querySelector('figcaption')?.textContent
      }));
      openViewer(items, idx);
    });
  });

  /* ------------------------------------------------------------------------
     8 · BLOG Y NOTICIAS
     ------------------------------------------------------------------------ */
  const postReaderDialog = $('#postReaderDialog');
  wireDialog(postReaderDialog);

  function loadPublicBlogPosts() {
    const newsGrid = $('#newsGrid');
    if (!newsGrid) return;

    fetch(`${API_BASE}/api/blog`)
      .then(res => res.json())
      .then(posts => {
        if (!posts || posts.length === 0) {
          newsGrid.innerHTML = '<p class="text-muted">Próximamente publicaremos novedades oficiales de la VIII edición.</p>';
          return;
        }

        newsGrid.innerHTML = posts.map(p => `
          <article class="news-card">
            <div class="news-card__img-container">
              <img src="${p.imagen_url || 'assets/gallery-1.jpg'}" alt="${p.titulo}" class="news-card__img" loading="lazy">
            </div>
            <div class="news-card__body">
              <span class="news-card__tag">${p.categoria || 'Novedades'}</span>
              <h3 class="news-card__title">${p.titulo}</h3>
              <p class="news-card__desc">${p.resumen}</p>
              <button class="btn btn--ghost btn--sm read-post-btn" data-slug="${p.slug}">
                Leer artículo completo
              </button>
            </div>
          </article>
        `).join('');

        $$('.read-post-btn', newsGrid).forEach(btn => {
          btn.addEventListener('click', () => openPostReader(btn.dataset.slug));
        });
      })
      .catch(() => {
        newsGrid.innerHTML = '<p class="text-muted">No se pudieron cargar las noticias en este momento.</p>';
      });
  }

  function openPostReader(slug) {
    fetch(`${API_BASE}/api/blog/${slug}`)
      .then(res => res.json())
      .then(post => {
        if (!post) return;
        $('#readPostCategoryTitle').textContent = `${post.categoria || 'Noticia'} · Travesía Los Alerces`;
        const body = $('#readPostBody');
        body.innerHTML = `
          <article class="post-detail">
            ${post.imagen_url ? `<div class="news-card__img-container" style="max-height:360px;margin-bottom:1.2rem;"><img src="${post.imagen_url}" alt="${post.titulo}" style="width:100%;height:100%;object-fit:contain;border-radius:4px;"></div>` : ''}
            <h1 class="post-detail__title" style="font-family:var(--serif);font-size:1.8rem;margin-bottom:0.8rem;line-height:1.15;">${post.titulo}</h1>
            <p class="text-muted" style="font-size:0.85rem;margin-bottom:1.5rem;">Publicado el ${new Date(post.creado_at).toLocaleDateString('es-AR')}</p>
            <div class="post-detail__content" style="white-space:pre-line;line-height:1.65;font-size:1rem;color:var(--ink-2);">${post.contenido}</div>
          </article>
        `;
        lock(true);
        postReaderDialog.showModal();
      });
  }

  loadPublicBlogPosts();

  /* ------------------------------------------------------------------------
     9 · FORMULARIO DE INSCRIPCIÓN Y PRECIO DINÁMICO
     ------------------------------------------------------------------------ */
  const enrollDialog = $('#enrollDialog');
  wireDialog(enrollDialog);

  const openEnrollHeaderBtn    = $('#openEnrollHeaderBtn');
  const openEnrollHeroBtn      = $('#openEnrollHeroBtn');
  const openEnrollFormBtn      = $('#openEnrollFormBtn');
  const openEnrollNavBtn       = $('#openEnrollNavBtn');
  const openEnrollMobileBarBtn = $('#openEnrollMobileBarBtn');
  const mobileBottomBar        = $('#mobileBottomBar');

  const enrollmentForm    = $('#enrollmentForm');
  const enrollSuccessBox  = $('#enrollSuccessBox');
  const successCodeTag    = $('#successCodeTag');

  let comprobante = null;

  // Cargar precio de inscripción dinámico y estado de cupo desde API
  function loadDynamicEnrollPrice() {
    fetch(`${API_BASE}/api/config/precio`)
      .then(res => res.json())
      .then(data => {
        if (!data) return;
        const montoEl        = $('#priceNoticeMonto');
        const textoEl        = $('#priceNoticeTexto');
        const instEl         = $('#priceNoticeInstrucciones');
        const barPriceEl     = $('#mobileBarPrice');
        const closedBanner   = $('#enrollClosedBanner');
        const closedMsg      = $('#enrollClosedMessage');
        const closedTitle    = $('#enrollClosedTitle');
        const openDesc       = $('#enrollOpenDesc');
        const enrollForm     = $('#enrollmentForm');
        const heroBtn        = $('#openEnrollHeroBtn');
        const heroSubEl      = heroBtn ? heroBtn.querySelector('.btn__sub') : null;

        const displayMonto = `$${data.monto || '100.000'}`;
        if (montoEl)    montoEl.textContent    = displayMonto;
        if (barPriceEl) barPriceEl.textContent = displayMonto;
        if (textoEl)    textoEl.textContent    = `(${data.texto || 'Cien mil pesos'})`;
        if (instEl)     instEl.textContent     = data.instrucciones || `El costo de inscripción para la Travesía en Kayaks 2026 es de ${displayMonto} (${data.texto}). Adjuntá el comprobante.`;

        // Si la convocatoria está deshabilitada o el cupo se completó
        if (data.habilitadas === false) {
          if (closedBanner) {
            closedBanner.style.display = 'block';
            if (data.motivoCierre === 'cupo_completo') {
              if (closedTitle) closedTitle.textContent = '🚫 Cupo Máximo Completo';
            } else {
              if (closedTitle) closedTitle.textContent = '🔒 Convocatoria Temporalmente Pausada';
            }
            if (closedMsg && data.mensajeCierre) closedMsg.textContent = data.mensajeCierre;
          }
          if (openDesc) openDesc.style.display = 'none';
          if (enrollForm) enrollForm.style.display = 'none';
          if (heroSubEl) heroSubEl.textContent = '🚫 Cupos completos';
        } else {
          if (closedBanner) closedBanner.style.display = 'none';
          if (openDesc) openDesc.style.display = 'block';
          if (enrollForm) enrollForm.style.display = 'block';
          if (heroSubEl) heroSubEl.textContent = `${displayMonto} · ${data.texto || 'Inscripción abierta'}`;
        }
      })
      .catch(() => {});
  }

  loadDynamicEnrollPrice();

  function openEnrollmentModal() {
    if (!enrollDialog) return;
    enrollmentForm?.reset();
    if (enrollmentForm) enrollmentForm.style.display = 'block';
    if (enrollSuccessBox) enrollSuccessBox.style.display = 'none';
    const nameEl = $('#regComprobanteName');
    if (nameEl) nameEl.textContent = 'Adjuntar foto del comprobante *';
    comprobante = null;
    loadDynamicEnrollPrice();
    // Cerrar menú móvil si estaba abierto
    if (nav && nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      navToggle?.setAttribute('aria-expanded', 'false');
    }
    lock(true);
    enrollDialog.showModal();
  }

  // Barra de acción rápida móvil al scrollear
  if (mobileBottomBar) {
    const coverEl = $('.cover');
    if (coverEl && 'IntersectionObserver' in window) {
      const barObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          // Si el hero NO intersecta (ya bajó en la página), mostrar la barra
          mobileBottomBar.classList.toggle('is-visible', !entry.isIntersecting);
        });
      }, { threshold: 0.1 });
      barObserver.observe(coverEl);
    } else {
      window.addEventListener('scroll', () => {
        mobileBottomBar.classList.toggle('is-visible', window.scrollY > 400);
      }, { passive: true });
    }
  }

  const fileInput = $('#regComprobante');
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const nameEl = $('#regComprobanteName');
    if (nameEl) nameEl.textContent = `📁 ${file.name}`;

    const reader = new FileReader();
    reader.onload = () => {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          const max = 1400;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const cv = document.createElement('canvas');
          cv.width = Math.round(img.width * scale);
          cv.height = Math.round(img.height * scale);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          comprobante = { nombre: file.name, data: cv.toDataURL('image/jpeg', 0.82) };
        };
        img.onerror = () => { comprobante = { nombre: file.name, data: reader.result }; };
        img.src = reader.result;
      } else {
        comprobante = { nombre: file.name, data: reader.result };
      }
    };
    reader.readAsDataURL(file);
  });

  [openEnrollHeaderBtn, openEnrollHeroBtn, openEnrollFormBtn, openEnrollNavBtn, openEnrollMobileBarBtn].forEach(btn => {
    btn?.addEventListener('click', openEnrollmentModal);
  });

  if (enrollmentForm) {
    enrollmentForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!enrollmentForm.checkValidity()) {
        const first = enrollmentForm.querySelector(':invalid');
        first?.reportValidity();
        first?.focus({ preventScroll: true });
        return;
      }

      const submitBtn = $('#submitEnrollBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';

      const payload = {
        nombre: $('#regNombre').value.trim(),
        apellido: $('#regApellido').value.trim(),
        dni: $('#regDni').value.trim(),
        email: $('#regEmail').value.trim(),
        telefono: $('#regTelefono').value.trim(),
        localidad: $('#regLocalidad').value.trim(),
        tipoKayak: $('#regTipoKayak').value,
        experiencia: $('#regExperiencia').value,
        contactoEmergencia: $('#regContactoEmergencia').value.trim(),
        observaciones: $('#regObservaciones').value.trim(),
        declaracionSalud: $('#regDeclaracionSalud').checked ? 1 : 0,
        declaracionImagen: $('#regDeclaracionImagen')?.checked ? 1 : 0,
        comprobanteNombre: comprobante?.nombre || '',
        comprobante: comprobante?.data || ''
      };

      fetch(`${API_BASE}/api/inscribirse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Inscripción';

        if (data.code) {
          enrollmentForm.style.display = 'none';
          successCodeTag.textContent = data.code;
          enrollSuccessBox.style.display = 'block';
        } else {
          alert(data.error || 'Error al procesar inscripción.');
        }
      })
      .catch(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Inscripción';
        alert('Error de red. Intente nuevamente.');
      });
    });
  }

  /* ------------------------------------------------------------------------
     10 · ACCESO ADMIN Y BACK-END DASHBOARD
     ------------------------------------------------------------------------ */
  const adminLockBtn = $('#adminLockBtn');
  const adminLoginDialog = $('#adminLoginDialog');
  wireDialog(adminLoginDialog);

  const adminLoginForm = $('#adminLoginForm');
  const loginErrorAlert = $('#loginErrorAlert');

  const adminDashboardDialog = $('#adminDashboardDialog');
  wireDialog(adminDashboardDialog);

  const adminUserTag = $('#adminUserTag');
  const adminLogoutBtn = $('#adminLogoutBtn');
  const adminExportExcelBtn = $('#adminExportExcelBtn');

  let authToken = localStorage.getItem('unpsjb_admin_token') || null;
  let currentUserPermissions = {};

  adminLockBtn?.addEventListener('click', () => {
    if (authToken) {
      verifyTokenAndOpenDashboard();
    } else {
      loginErrorAlert.style.display = 'none';
      adminLoginForm.reset();
      lock(true);
      adminLoginDialog.showModal();
    }
  });

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#adminEmail').value.trim();
      const password = $('#adminPassword').value.trim();

      fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          authToken = data.token;
          currentUserPermissions = data.user.permissions || {};
          localStorage.setItem('unpsjb_admin_token', authToken);
          adminLoginDialog.close();
          adminUserTag.textContent = `Conectado como: ${data.user.name} (${data.user.role})`;
          openAdminDashboard();
        } else {
          loginErrorAlert.textContent = data.error || 'Credenciales inválidas.';
          loginErrorAlert.style.display = 'block';
        }
      });
    });
  }

  adminLogoutBtn?.addEventListener('click', () => {
    authToken = null;
    currentUserPermissions = {};
    localStorage.removeItem('unpsjb_admin_token');
    adminDashboardDialog.close();
  });

  function adminFetch(url, options = {}) {
    const opts = Object.assign({}, options);
    opts.headers = Object.assign({}, opts.headers || {});
    if (authToken) {
      opts.headers['Authorization'] = `Bearer ${authToken}`;
      opts.headers['X-Auth-Token'] = authToken;
    }
    const sep = url.includes('?') ? '&' : '?';
    const authUrl = authToken ? `${url}${sep}token=${encodeURIComponent(authToken)}` : url;
    return fetch(authUrl, opts);
  }

  function verifyTokenAndOpenDashboard() {
    adminFetch(`${API_BASE}/api/admin/me`)
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        currentUserPermissions = data.user.permissions || {};
        adminUserTag.textContent = `Conectado como: ${data.user.name} (${data.user.role})`;
        openAdminDashboard();
      } else {
        authToken = null;
        currentUserPermissions = {};
        localStorage.removeItem('unpsjb_admin_token');
        lock(true);
        adminLoginDialog.showModal();
      }
    })
    .catch(() => {
      authToken = null;
      currentUserPermissions = {};
      localStorage.removeItem('unpsjb_admin_token');
      lock(true);
      adminLoginDialog.showModal();
    });
  }

  /* ------------------------------------------------------------------------
     11 · TABLERO BACKEND ADMIN Y PERMISOS
     ------------------------------------------------------------------------ */
  const dashTabBtns = $$('.dash-tab-btn');
  const dashContents = $$('.dash-content');
  const adminInscripcionesTbody = $('#adminInscripcionesTbody');
  const countInscripciones = $('#countInscripciones');
  const adminSearchInscripciones = $('#adminSearchInscripciones');
  const adminFilterEstado = $('#adminFilterEstado');

  function openAdminDashboard() {
    lock(true);
    adminDashboardDialog.showModal();
    
    // Select first accessible tab
    dashTabBtns.forEach(b => b.classList.remove('active'));
    dashContents.forEach(c => c.classList.remove('active'));

    $('#tabBtnInscripciones')?.classList.add('active');
    $('#dashTabInscripciones')?.classList.add('active');
    loadAdminInscripciones();
  }

  dashTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.dashTab;
      dashTabBtns.forEach(b => b.classList.remove('active'));
      dashContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');

      if (tab === 'inscripciones') {
        $('#dashTabInscripciones').classList.add('active');
        loadAdminInscripciones();
      } else if (tab === 'blog') {
        $('#dashTabBlog').classList.add('active');
        loadAdminBlogPosts();
      } else if (tab === 'beneficios') {
        $('#dashTabBeneficios').classList.add('active');
        loadAdminBeneficios();
      } else if (tab === 'usuarios') {
        $('#dashTabUsuarios').classList.add('active');
        loadAdminUsers();
      } else if (tab === 'config') {
        $('#dashTabConfig').classList.add('active');
        loadAdminConfig();
      }
    });
  });

  /* ------------------------------------------------------------------------
     11a · INSCRIPCIONES (Visualización, Estado Pendiente/Aprobado/Rechazado)
     ------------------------------------------------------------------------ */
  function loadAdminInscripciones() {
    if (!authToken || !adminInscripcionesTbody) return;
    const search = adminSearchInscripciones ? adminSearchInscripciones.value.trim() : '';
    const estado = adminFilterEstado ? adminFilterEstado.value : 'TODOS';

    adminFetch(`${API_BASE}/api/admin/inscripciones?search=${encodeURIComponent(search)}&estado=${encodeURIComponent(estado)}`)
    .then(res => res.json())
    .then(data => {
      if (countInscripciones) countInscripciones.textContent = Array.isArray(data) ? data.length : 0;
      if (!Array.isArray(data) || data.length === 0) {
        adminInscripcionesTbody.innerHTML = `<tr><td colspan="9" style="padding: 1rem; text-align: center; color: var(--ink-3);">No se encontraron inscripciones.</td></tr>`;
        return;
      }

      adminInscripcionesTbody.innerHTML = data.map(item => {
        const estLower = (item.estado || 'PENDIENTE').toLowerCase();
        let pillClass = 'pill-pendiente';
        if (estLower === 'aprobado' || estLower === 'confirmada') pillClass = 'pill-confirmada';
        if (estLower === 'rechazado' || estLower === 'cancelada') pillClass = 'pill-pendiente';

        const comprobanteBtn = item.comprobante ? 
          `<button class="btn btn--ghost btn--sm" onclick="viewReceipt('${item.code}')">📷 Ver adjunto</button>` : 
          `<span class="text-muted" style="font-size:0.8rem">Sin adjunto</span>`;

        return `
          <tr>
            <td><strong class="text-ember">${item.code}</strong></td>
            <td><strong>${item.nombre} ${item.apellido}</strong></td>
            <td>${item.dni}</td>
            <td><div>${item.email}</div><small class="text-muted">${item.telefono}</small></td>
            <td>${item.localidad}</td>
            <td><div>${item.tipo_kayak}</div><small class="text-muted">${item.experiencia}</small></td>
            <td>${comprobanteBtn}</td>
            <td><span class="status-pill ${pillClass}">${item.estado}</span></td>
            <td>
              <div style="display:flex; gap:4px; flex-wrap:wrap;">
                ${item.estado !== 'APROBADO' ? `<button class="action-btn" onclick="updateEnrollStatus(${item.id}, 'APROBADO')" style="color:var(--lake);">Aprobar</button>` : ''}
                ${item.estado !== 'PENDIENTE' ? `<button class="action-btn" onclick="updateEnrollStatus(${item.id}, 'PENDIENTE')">Pendiente</button>` : ''}
                ${item.estado !== 'RECHAZADO' ? `<button class="action-btn" onclick="updateEnrollStatus(${item.id}, 'RECHAZADO')" style="color:var(--ember);">Rechazar</button>` : ''}
                <button class="action-btn" onclick="deleteEnroll(${item.id})" style="color: red;">Borrar</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    })
    .catch(() => {
      adminInscripcionesTbody.innerHTML = `<tr><td colspan="9" style="padding: 1rem; text-align: center; color: var(--ember);">Acceso denegado o error de carga.</td></tr>`;
    });
  }

  adminSearchInscripciones?.addEventListener('input', loadAdminInscripciones);
  adminFilterEstado?.addEventListener('change', loadAdminInscripciones);

  window.viewReceipt = function(code) {
    adminFetch(`${API_BASE}/api/admin/inscripciones?search=${encodeURIComponent(code)}&estado=TODOS`)
    .then(res => res.json())
    .then(data => {
      const item = Array.isArray(data) ? data.find(i => i.code === code) : null;
      if (item && item.comprobante) {
        const w = window.open("");
        w.document.write(`<title>Comprobante ${code}</title><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#111;"><img src="${item.comprobante}" style="max-width:100%;max-height:100vh;object-fit:contain;"></body>`);
      } else {
        alert('No se encontró el comprobante adjunto.');
      }
    });
  };

  // EXPORTAR EXCEL (.csv compatible Excel)
  adminExportExcelBtn?.addEventListener('click', () => {
    adminFetch(`${API_BASE}/api/admin/inscripciones/export/excel`)
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Inscriptos_Travesia_Los_Alerces_2026.csv';
      a.click();
    })
    .catch(() => alert('Error al generar el archivo Excel.'));
  });

  window.updateEnrollStatus = function(id, nuevoEstado) {
    adminFetch(`${API_BASE}/api/admin/inscripciones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) alert(data.error);
      loadAdminInscripciones();
    });
  };

  window.deleteEnroll = function(id) {
    if (!confirm('¿Eliminar esta inscripción permanentemente?')) return;
    adminFetch(`${API_BASE}/api/admin/inscripciones/${id}`, {
      method: 'DELETE'
    })
    .then(res => res.json())
    .then(() => loadAdminInscripciones());
  };

  /* ------------------------------------------------------------------------
     11c · BENEFICIOS Y PROMOCIONES
     ------------------------------------------------------------------------ */
  const benefitDialog = $('#benefitEditorDialog');
  const benefitForm = $('#benefitForm');
  const beneficiosTbody = $('#adminBeneficiosTbody');
  wireDialog(benefitDialog);

  const benFields = {
    id: '#benId', prestador: '#benPrestador', rubro: '#benRubro',
    descripcion: '#benDescripcion', oferta: '#benOferta', detalle: '#benDetalle',
    codigo: '#benCodigo', vigencia: '#benVigencia', logoUrl: '#benLogo',
    enlace: '#benEnlace', orden: '#benOrden', activo: '#benActivo'
  };

  const benLogoFile = $('#benLogoFile');
  const benLogoPreviewWrap = $('#benLogoPreviewWrap');
  const benLogoPreview = $('#benLogoPreview');
  const benRemoveLogoBtn = $('#benRemoveLogoBtn');
  const benLogoInput = $('#benLogo');

  benLogoFile?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (benLogoInput) benLogoInput.value = evt.target.result;
      if (benLogoPreview) benLogoPreview.src = evt.target.result;
      if (benLogoPreviewWrap) benLogoPreviewWrap.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  });

  benRemoveLogoBtn?.addEventListener('click', () => {
    if (benLogoInput) benLogoInput.value = '';
    if (benLogoFile) benLogoFile.value = '';
    if (benLogoPreview) benLogoPreview.src = '';
    if (benLogoPreviewWrap) benLogoPreviewWrap.style.display = 'none';
  });

  benLogoInput?.addEventListener('input', () => {
    const val = benLogoInput.value.trim();
    if (val) {
      if (benLogoPreview) benLogoPreview.src = val;
      if (benLogoPreviewWrap) benLogoPreviewWrap.style.display = 'flex';
    } else {
      if (benLogoPreviewWrap) benLogoPreviewWrap.style.display = 'none';
    }
  });

  function openBenefitEditor(b) {
    if (!benefitDialog) return;
    $('#benefitEditorTitle').textContent = b ? 'Editar beneficio' : 'Nuevo beneficio';
    $(benFields.id).value        = b?.id ?? '';
    $(benFields.prestador).value = b?.prestador ?? '';
    $(benFields.rubro).value     = b?.rubro ?? '';
    $(benFields.descripcion).value = b?.descripcion ?? '';
    $(benFields.oferta).value    = b?.oferta ?? '';
    $(benFields.detalle).value   = b?.detalle ?? '';
    $(benFields.codigo).value    = b?.codigo ?? '';
    $(benFields.vigencia).value  = b?.vigencia ?? '';
    $(benFields.logoUrl).value   = b?.logo_url ?? '';
    $(benFields.enlace).value    = b?.enlace ?? '';
    $(benFields.orden).value     = b?.orden ?? 0;
    $(benFields.activo).value    = String(b?.activo ?? 1);

    if (b?.logo_url) {
      if (benLogoPreview) benLogoPreview.src = b.logo_url;
      if (benLogoPreviewWrap) benLogoPreviewWrap.style.display = 'flex';
    } else {
      if (benLogoPreviewWrap) benLogoPreviewWrap.style.display = 'none';
      if (benLogoFile) benLogoFile.value = '';
    }

    lock(true);
    benefitDialog.showModal();
  }

  $('#openNewBenefitBtn')?.addEventListener('click', () => openBenefitEditor(null));

  function loadAdminBeneficios() {
    if (!authToken || !beneficiosTbody) return;
    fetch(`${API_BASE}/api/admin/beneficios`, { headers: { 'Authorization': `Bearer ${authToken}` } })
      .then(res => res.json())
      .then(rows => {
        const list = Array.isArray(rows) ? rows : [];
        const count = $('#countBeneficios');
        if (count) count.textContent = list.length;

        if (!list.length) {
          beneficiosTbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:28px 0;color:var(--ink-3)">Todavía no hay beneficios cargados.</td></tr>';
          return;
        }

        beneficiosTbody.innerHTML = '';
        list.forEach(b => {
          const tr = document.createElement('tr');
          const cells = [b.orden, b.prestador, b.rubro || '—', b.oferta, b.codigo || '—', b.vigencia || '—'];
          cells.forEach(v => {
            const td = document.createElement('td');
            td.textContent = v;
            tr.appendChild(td);
          });

          const tdEstado = document.createElement('td');
          const tag = document.createElement('span');
          tag.className = 'status-pill ' + (b.activo ? 'pill-confirmada' : 'pill-pendiente');
          tag.textContent = b.activo ? 'Visible' : 'Oculto';
          tdEstado.appendChild(tag);
          tr.appendChild(tdEstado);

          const tdAcc = document.createElement('td');
          const edit = document.createElement('button');
          edit.className = 'btn btn--ghost btn--sm';
          edit.type = 'button';
          edit.textContent = 'Editar';
          edit.addEventListener('click', () => openBenefitEditor(b));

          const del = document.createElement('button');
          del.className = 'btn btn--ghost btn--sm btn--danger';
          del.type = 'button';
          del.textContent = 'Eliminar';
          del.addEventListener('click', () => {
            if (!confirm(`¿Eliminar el beneficio de ${b.prestador}?`)) return;
            fetch(`${API_BASE}/api/admin/beneficios/${b.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${authToken}` }
            }).then(() => loadAdminBeneficios());
          });

          tdAcc.append(edit, del);
          tr.appendChild(tdAcc);
          beneficiosTbody.appendChild(tr);
        });
      })
      .catch(() => {
        beneficiosTbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:28px 0;color:var(--ember)">No se pudieron cargar los beneficios.</td></tr>';
      });
  }

  benefitForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $(benFields.id).value;
    const payload = {
      prestador: $(benFields.prestador).value.trim(),
      rubro: $(benFields.rubro).value.trim(),
      descripcion: $(benFields.descripcion).value.trim(),
      oferta: $(benFields.oferta).value.trim(),
      detalle: $(benFields.detalle).value.trim(),
      codigo: $(benFields.codigo).value.trim(),
      vigencia: $(benFields.vigencia).value.trim(),
      logoUrl: $(benFields.logoUrl).value.trim(),
      enlace: $(benFields.enlace).value.trim(),
      orden: Number($(benFields.orden).value) || 0,
      activo: $(benFields.activo).value === '1'
    };

    fetch(`${API_BASE}/api/admin/beneficios${id ? '/' + id : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(() => {
        benefitDialog.close();
        loadAdminBeneficios();
      })
      .catch(() => alert('No se pudo guardar el beneficio.'));
  });

  /* ------------------------------------------------------------------------
     11d · BLOG ADMIN
     ------------------------------------------------------------------------ */
  const adminBlogTbody = $('#adminBlogTbody');
  const postEditorDialog = $('#postEditorDialog');
  wireDialog(postEditorDialog);
  const openNewPostModalBtn = $('#openNewPostModalBtn');
  const postForm = $('#postForm');

  const postImageFile = $('#postImageFile');
  const postImgPreviewWrap = $('#postImgPreviewWrap');
  const postImgPreview = $('#postImgPreview');
  const postRemoveImgBtn = $('#postRemoveImgBtn');
  const postImagenUrl = $('#postImagenUrl');

  postImageFile?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (postImagenUrl) postImagenUrl.value = evt.target.result;
      if (postImgPreview) postImgPreview.src = evt.target.result;
      if (postImgPreviewWrap) postImgPreviewWrap.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  });

  postRemoveImgBtn?.addEventListener('click', () => {
    if (postImagenUrl) postImagenUrl.value = '';
    if (postImageFile) postImageFile.value = '';
    if (postImgPreview) postImgPreview.src = '';
    if (postImgPreviewWrap) postImgPreviewWrap.style.display = 'none';
  });

  postImagenUrl?.addEventListener('input', () => {
    const val = postImagenUrl.value.trim();
    if (val) {
      if (postImgPreview) postImgPreview.src = val;
      if (postImgPreviewWrap) postImgPreviewWrap.style.display = 'flex';
    } else {
      if (postImgPreviewWrap) postImgPreviewWrap.style.display = 'none';
    }
  });

  function loadAdminBlogPosts() {
    if (!authToken || !adminBlogTbody) return;
    adminFetch(`${API_BASE}/api/admin/posts`)
    .then(res => res.json())
    .then(posts => {
      if (!Array.isArray(posts)) return;
      adminBlogTbody.innerHTML = posts.map(p => `
        <tr>
          <td><strong>${p.titulo}</strong></td>
          <td><span class="news-card__tag">${p.categoria}</span></td>
          <td>${new Date(p.creado_at).toLocaleDateString('es-AR')}</td>
          <td>${p.publicado ? '<span class="status-pill pill-confirmada">Publicado</span>' : '<span class="status-pill pill-pendiente">Borrador</span>'}</td>
          <td>
            <button class="action-btn" onclick="editPostAdmin(${p.id})">Editar</button>
            <button class="action-btn" onclick="deletePostAdmin(${p.id})" style="color: var(--ember);">Borrar</button>
          </td>
        </tr>
      `).join('');
    });
  }

  openNewPostModalBtn?.addEventListener('click', () => {
    $('#postEditorTitle').textContent = 'Nueva Publicación';
    postForm.reset();
    $('#postId').value = '';
    if (postImgPreview) postImgPreview.src = '';
    if (postImgPreviewWrap) postImgPreviewWrap.style.display = 'none';
    if (postImageFile) postImageFile.value = '';
    lock(true);
    postEditorDialog.showModal();
  });

  if (postForm) {
    postForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('#postId').value;
      const payload = {
        titulo: $('#postTitulo').value.trim(),
        categoria: $('#postCategoria').value,
        imagenUrl: (postImagenUrl ? postImagenUrl.value.trim() : '') || 'assets/gallery-1.jpg',
        resumen: $('#postResumen').value.trim(),
        contenido: $('#postContenido').value.trim(),
        publicado: $('#postPublicado').checked
      };

      const method = id ? 'PUT' : 'POST';
      const url = id ? `${API_BASE}/api/admin/posts/${id}` : `${API_BASE}/api/admin/posts`;

      adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(() => {
        postEditorDialog.close();
        loadAdminBlogPosts();
        loadPublicBlogPosts();
      });
    });
  }

  window.editPostAdmin = function(id) {
    adminFetch(`${API_BASE}/api/admin/posts`)
    .then(res => res.json())
    .then(posts => {
      const p = Array.isArray(posts) ? posts.find(item => item.id === id) : null;
      if (!p) return;
      $('#postId').value = p.id;
      $('#postTitulo').value = p.titulo;
      $('#postCategoria').value = p.categoria;
      if (postImagenUrl) postImagenUrl.value = p.imagen_url || '';
      $('#postResumen').value = p.resumen;
      $('#postContenido').value = p.contenido;
      $('#postPublicado').checked = !!p.publicado;
      $('#postEditorTitle').textContent = 'Editar Noticia';

      if (p.imagen_url) {
        if (postImgPreview) postImgPreview.src = p.imagen_url;
        if (postImgPreviewWrap) postImgPreviewWrap.style.display = 'flex';
      } else {
        if (postImgPreviewWrap) postImgPreviewWrap.style.display = 'none';
        if (postImageFile) postImageFile.value = '';
      }

      lock(true);
      postEditorDialog.showModal();
    });
  };

  window.deletePostAdmin = function(id) {
    if (!confirm('¿Eliminar esta noticia?')) return;
    adminFetch(`${API_BASE}/api/admin/posts/${id}`, {
      method: 'DELETE'
    })
    .then(res => res.json())
    .then(() => {
      loadAdminBlogPosts();
      loadPublicBlogPosts();
    });
  };

  /* ------------------------------------------------------------------------
     11e · USUARIOS ADMIN Y PERMISOS GRANULARES
     ------------------------------------------------------------------------ */
  const adminUsuariosTbody = $('#adminUsuariosTbody');
  const openNewUserModalBtn = $('#openNewUserModalBtn');
  const userEditorDialog = $('#userEditorDialog');
  wireDialog(userEditorDialog);
  const userForm = $('#userForm');

  function loadAdminUsers() {
    if (!authToken || !adminUsuariosTbody) return;
    adminFetch(`${API_BASE}/api/admin/users`)
    .then(res => res.json())
    .then(users => {
      if (!Array.isArray(users)) return;
      adminUsuariosTbody.innerHTML = users.map(u => {
        const perms = u.permissions || {};
        const permTags = [];
        if (perms.ver_inscriptos) permTags.push('🔍 Ver inscriptos');
        if (perms.gestionar_inscriptos) permTags.push('✅ Gestionar inscriptos');
        if (perms.gestion_noticias) permTags.push('📰 Noticias');
        if (perms.gestion_beneficios) permTags.push('🎁 Beneficios');
        if (perms.gestion_usuarios) permTags.push('⚙️ Usuarios');

        const permsHtml = permTags.length ? permTags.map(t => `<span class="news-card__tag" style="margin:1px;font-size:0.7rem;">${t}</span>`).join(' ') : '<span class="text-muted">Sin permisos asignados</span>';

        return `
          <tr>
            <td><strong>${u.name}</strong></td>
            <td>${u.email}</td>
            <td><span class="status-pill ${u.role === 'ADMIN' ? 'pill-confirmada' : 'pill-pendiente'}">${u.role}</span></td>
            <td><div style="display:flex;flex-wrap:wrap;gap:2px;">${permsHtml}</div></td>
            <td>${new Date(u.created_at).toLocaleDateString('es-AR')}</td>
            <td>
              <button class="action-btn" onclick="openEditUserModal(${u.id})">Editar</button>
              ${(u.email !== 'admin@economicasunp.edu.ar' && u.email !== 'admin') ? `<button class="action-btn" onclick="deleteUserAdmin(${u.id})" style="color: var(--ember);">Borrar</button>` : ''}
            </td>
          </tr>
        `;
      }).join('');
    });
  }

  let cachedAdminUsers = [];

  function openUserModal(user = null) {
    if (!userEditorDialog) return;
    $('#userEditorTitle').textContent = user ? `Editar Usuario: ${user.name}` : 'Crear Nuevo Usuario Administrador';
    $('#usrId').value = user ? user.id : '';
    $('#usrName').value = user ? user.name : '';
    $('#usrEmail').value = user ? user.email : '';
    $('#usrPassword').value = '';
    $('#usrRole').value = user ? user.role : 'EDITOR';

    const p = user ? (user.permissions || {}) : {
      ver_inscriptos: true,
      gestionar_inscriptos: false,
      gestion_noticias: true,
      gestion_beneficios: false,
      gestion_usuarios: false
    };

    $('#permVerInscriptos').checked = !!p.ver_inscriptos;
    $('#permGestionarInscriptos').checked = !!p.gestionar_inscriptos;
    $('#permGestionNoticias').checked = !!p.gestion_noticias;
    $('#permGestionBeneficios').checked = !!p.gestion_beneficios;
    $('#permGestionUsuarios').checked = !!p.gestion_usuarios;

    lock(true);
    userEditorDialog.showModal();
  }

  openNewUserModalBtn?.addEventListener('click', () => openUserModal(null));

  window.openEditUserModal = function(id) {
    adminFetch(`${API_BASE}/api/admin/users`)
    .then(res => res.json())
    .then(users => {
      const u = Array.isArray(users) ? users.find(item => item.id === id) : null;
      if (u) openUserModal(u);
    });
  };

  if (userForm) {
    userForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('#usrId').value;
      const payload = {
        name: $('#usrName').value.trim(),
        email: $('#usrEmail').value.trim(),
        password: $('#usrPassword').value.trim(),
        role: $('#usrRole').value,
        permissions: {
          ver_inscriptos: $('#permVerInscriptos').checked,
          gestionar_inscriptos: $('#permGestionarInscriptos').checked,
          gestion_noticias: $('#permGestionNoticias').checked,
          gestion_beneficios: $('#permGestionBeneficios').checked,
          gestion_usuarios: $('#permGestionUsuarios').checked
        }
      };

      const method = id ? 'PUT' : 'POST';
      const url = id ? `${API_BASE}/api/admin/users/${id}` : `${API_BASE}/api/admin/users`;

      adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
        } else {
          userEditorDialog.close();
          loadAdminUsers();
        }
      });
    });
  }

  window.deleteUserAdmin = function(id) {
    if (!confirm('¿Eliminar este usuario administrador?')) return;
    adminFetch(`${API_BASE}/api/admin/users/${id}`, {
      method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) alert(data.error);
      loadAdminUsers();
    });
  };

  /* ------------------------------------------------------------------------
     11f · CONFIGURACIÓN DE PRECIOS, CUPOS, PROMOCIONES & TOGGLE CONVOCATORIA
     ------------------------------------------------------------------------ */
  const adminConfigForm             = $('#adminConfigForm');
  const cfgInscripcionesHabilitadas = $('#cfgInscripcionesHabilitadas');
  const cfgToggleStatusTag          = $('#cfgToggleStatusTag');
  const cfgCupoMaximo               = $('#cfgCupoMaximo');
  const cfgMensajeCierre            = $('#cfgMensajeCierre');
  const cfgPrecioMonto              = $('#cfgPrecioMonto');
  const cfgPrecioTexto              = $('#cfgPrecioTexto');
  const cfgPrecioInstrucciones      = $('#cfgPrecioInstrucciones');
  const configSuccessAlert          = $('#configSuccessAlert');

  // Preview elements
  const previewPrecioMonto         = $('#previewPrecioMonto');
  const previewPrecioTexto         = $('#previewPrecioTexto');
  const previewPrecioInstrucciones = $('#previewPrecioInstrucciones');

  // Metrics
  const cfgMetricInscriptos   = $('#cfgMetricInscriptos');
  const cfgMetricDetalle      = $('#cfgMetricDetalle');
  const cfgMetricCupo         = $('#cfgMetricCupo');
  const cfgMetricDisponibles  = $('#cfgMetricDisponibles');

  const btnQuickGoToConfig    = $('#btnQuickGoToConfig');
  btnQuickGoToConfig?.addEventListener('click', () => {
    dashTabBtns.forEach(b => b.classList.remove('active'));
    dashContents.forEach(c => c.classList.remove('active'));
    $('#tabBtnConfig')?.classList.add('active');
    $('#dashTabConfig')?.classList.add('active');
    loadAdminConfig();
  });

  function updateLivePreview() {
    const monto = cfgPrecioMonto ? cfgPrecioMonto.value.trim() : '100.000';
    const texto = cfgPrecioTexto ? cfgPrecioTexto.value.trim() : 'Cien mil pesos';
    const inst  = cfgPrecioInstrucciones ? cfgPrecioInstrucciones.value.trim() : '';

    if (previewPrecioMonto) previewPrecioMonto.textContent = `$${monto}`;
    if (previewPrecioTexto) previewPrecioTexto.textContent = `(${texto})`;
    if (previewPrecioInstrucciones) {
      previewPrecioInstrucciones.textContent = inst || `El costo de inscripción para la Travesía en Kayaks 2026 es de $${monto} (${texto}). Adjuntá el comprobante.`;
    }

    if (cfgInscripcionesHabilitadas && cfgToggleStatusTag) {
      if (cfgInscripcionesHabilitadas.checked) {
        cfgToggleStatusTag.className = 'status-tag status-tag--open';
        cfgToggleStatusTag.textContent = '🟢 Inscripciones HABILITADAS y recibiendo postulaciones en la web';
      } else {
        cfgToggleStatusTag.className = 'status-tag status-tag--closed';
        cfgToggleStatusTag.textContent = '🔴 Inscripciones PAUSADAS / CERRADAS manualmente (formulario bloqueado en la web)';
      }
    }
  }

  [cfgPrecioMonto, cfgPrecioTexto, cfgPrecioInstrucciones].forEach(input => {
    input?.addEventListener('input', updateLivePreview);
  });
  cfgInscripcionesHabilitadas?.addEventListener('change', updateLivePreview);

  function loadAdminConfig() {
    if (!authToken) return;
    adminFetch(`${API_BASE}/api/admin/config`)
    .then(res => res.json())
    .then(cfg => {
      if (!cfg) return;

      if (cfgMetricInscriptos) cfgMetricInscriptos.textContent = cfg.totalInscriptos ?? '0';
      if (cfgMetricDetalle) cfgMetricDetalle.textContent = `${cfg.inscriptosAprobados || 0} aprobados · ${cfg.inscriptosPendientes || 0} pendientes`;
      if (cfgMetricCupo) cfgMetricCupo.textContent = cfg.cupo_maximo || '100';

      const cupoMax = parseInt(cfg.cupo_maximo || '100', 10);
      const total = parseInt(cfg.totalInscriptos || '0', 10);
      const libres = Math.max(0, cupoMax - total);
      if (cfgMetricDisponibles) {
        cfgMetricDisponibles.textContent = libres;
        cfgMetricDisponibles.style.color = libres > 0 ? 'var(--lake)' : 'var(--ember)';
      }

      if (cfgInscripcionesHabilitadas) {
        cfgInscripcionesHabilitadas.checked = (cfg.inscripciones_habilitadas === '1');
      }
      if (cfgCupoMaximo) cfgCupoMaximo.value = cfg.cupo_maximo || '100';
      if (cfgMensajeCierre) cfgMensajeCierre.value = cfg.mensaje_cierre || '';
      if (cfgPrecioMonto) cfgPrecioMonto.value = cfg.precio_monto || '100.000';
      if (cfgPrecioTexto) cfgPrecioTexto.value = cfg.precio_texto || 'Cien mil pesos';
      if (cfgPrecioInstrucciones) cfgPrecioInstrucciones.value = cfg.precio_instrucciones || '';

      updateLivePreview();
    })
    .catch(() => {});
  }

  if (adminConfigForm) {
    adminConfigForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = {
        precio_monto: cfgPrecioMonto.value.trim(),
        precio_texto: cfgPrecioTexto.value.trim(),
        precio_instrucciones: cfgPrecioInstrucciones.value.trim(),
        cupo_maximo: cfgCupoMaximo.value.trim(),
        inscripciones_habilitadas: cfgInscripcionesHabilitadas.checked ? '1' : '0',
        mensaje_cierre: cfgMensajeCierre.value.trim()
      };

      adminFetch(`${API_BASE}/api/admin/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
        } else {
          if (configSuccessAlert) {
            configSuccessAlert.style.display = 'block';
            setTimeout(() => { configSuccessAlert.style.display = 'none'; }, 3500);
          }
          loadAdminConfig();
          loadDynamicEnrollPrice();
        }
      })
      .catch(() => {
        alert('Error al guardar la configuración.');
      });
    });
  }

  /* ------------------------------------------------------------------------
     12 · AÑO EN EL PIE
     ------------------------------------------------------------------------ */
  const legal = $('.foot__legal');
  if (legal) {
    const year = new Date().getFullYear();
    if (year > 2026) {
      const node = [...legal.childNodes].find(
        (n) => n.nodeType === Node.TEXT_NODE && n.nodeValue.includes('© 2026')
      );
      if (node) node.nodeValue = node.nodeValue.replace('© 2026', `© 2026–${year}`);
    }
  }

})();
