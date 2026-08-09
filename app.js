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
    ['.voice', 70], ['.wall__tile', 40]
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
     5 · FOTOGRAFÍAS Y RECURSOS
     ------------------------------------------------------------------------ */
  function watchImage(img) {
    const frame = img.closest('.plate, .person__plate');
    if (!frame) return;
    const fail = () => frame.classList.add('is-empty');
    img.addEventListener('error', fail);
    if (img.complete && img.naturalWidth === 0) fail();
  }
  $$('.plate img, .person__plate img').forEach(watchImage);

  /* ------------------------------------------------------------------------
     6 · VIDEO YOUTUBE
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
     7 · DIÁLOGOS NATIVOS (<dialog>)
     ------------------------------------------------------------------------ */
  const lock = (on) => document.body.classList.toggle('is-locked', on);

  function wireDialog(dlg) {
    if (!dlg) return;
    $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => lock(false));
  }

  const patronsDialog = $('#patronsDialog');
  wireDialog(patronsDialog);
  $('#openPatrons')?.addEventListener('click', () => { lock(true); patronsDialog.showModal(); });

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
      plate.tabIndex = 0;
      plate.setAttribute('role', 'button');
      plate.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  /* ------------------------------------------------------------------------
     8 · PUBLIC BLOG LOADER
     ------------------------------------------------------------------------ */
  const publicBlogGrid = $('#publicBlogGrid');
  const postReaderDialog = $('#postReaderDialog');
  const readPostCategoryTitle = $('#readPostCategoryTitle');
  const readPostBody = $('#readPostBody');
  wireDialog(postReaderDialog);

  function loadPublicBlogPosts() {
    if (!publicBlogGrid) return;
    fetch(`${API_BASE}/api/blog`)
      .then(res => res.json())
      .then(posts => {
        if (posts.length === 0) {
          publicBlogGrid.innerHTML = `<p style="grid-column:1/-1; color: var(--ink-2);">No hay noticias publicadas por el momento.</p>`;
          return;
        }
        publicBlogGrid.innerHTML = posts.map(p => `
          <article class="news-card">
            ${p.imagen_url ? `<img src="${p.imagen_url}" alt="${p.titulo}" class="news-card__img" loading="lazy">` : ''}
            <div class="news-card__body">
              <div class="news-card__meta">
                <span class="news-card__tag">${p.categoria}</span>
                <span>${new Date(p.creado_at).toLocaleDateString('es-AR')}</span>
              </div>
              <h3 class="news-card__title">${p.titulo}</h3>
              <p class="news-card__excerpt">${p.resumen}</p>
              <button class="btn btn--ghost btn--sm news-card__btn" onclick="openBlogPostSlug('${p.slug}')">
                Leer nota completa <svg class="ic" aria-hidden="true"><use href="#i-arrow-right"/></svg>
              </button>
            </div>
          </article>
        `).join('');
      })
      .catch(() => {
        publicBlogGrid.innerHTML = `<p style="grid-column:1/-1; color: var(--ember);">Error al cargar las noticias.</p>`;
      });
  }

  window.openBlogPostSlug = function(slug) {
    fetch(`${API_BASE}/api/blog/${slug}`)
      .then(res => res.json())
      .then(post => {
        readPostCategoryTitle.textContent = `${post.categoria} · ${new Date(post.creado_at).toLocaleDateString('es-AR')}`;
        readPostBody.innerHTML = `
          <h2 style="font-family: var(--serif); font-size: 1.6rem; margin-bottom: 1rem;">${post.titulo}</h2>
          ${post.imagen_url ? `<img src="${post.imagen_url}" alt="${post.titulo}" style="width:100%; max-height:300px; object-fit:cover; border-radius:4px; margin-bottom:1rem;">` : ''}
          <p style="font-weight:600; color: var(--lake); margin-bottom:1rem;">${post.resumen}</p>
          <div style="color: var(--ink-2); font-size: .95rem; line-height: 1.7; white-space: pre-line;">${post.contenido}</div>
        `;
        lock(true);
        postReaderDialog.showModal();
      });
  };

  loadPublicBlogPosts();

  /* ------------------------------------------------------------------------
     9 · INSCRIPCIÓN Y PRE-REGISTRO DE REMEROS
     ------------------------------------------------------------------------ */
  const enrollDialog = $('#enrollDialog');
  wireDialog(enrollDialog);

  const openEnrollHeaderBtn = $('#openEnrollHeaderBtn');
  const openEnrollHeroBtn = $('#openEnrollHeroBtn');
  const openEnrollFormBtn = $('#openEnrollFormBtn');
  const enrollmentForm = $('#enrollmentForm');
  const enrollSuccessBox = $('#enrollSuccessBox');
  const successCodeTag = $('#successCodeTag');

  function openEnrollmentModal() {
    if (!enrollDialog) return;
    enrollmentForm.style.display = 'grid';
    enrollSuccessBox.style.display = 'none';
    enrollmentForm.reset();
    lock(true);
    enrollDialog.showModal();
  }

  [openEnrollHeaderBtn, openEnrollHeroBtn, openEnrollFormBtn].forEach(btn => {
    btn?.addEventListener('click', openEnrollmentModal);
  });

  if (enrollmentForm) {
    enrollmentForm.addEventListener('submit', (e) => {
      e.preventDefault();
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
        observaciones: $('#regObservaciones').value.trim()
      };

      fetch(`${API_BASE}/api/inscribirse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Pre-Inscripción';

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
        submitBtn.textContent = 'Enviar Pre-Inscripción';
        alert('Error de red. Intente nuevamente.');
      });
    });
  }

  /* ------------------------------------------------------------------------
     10 · ACCESO ADMIN Y CANDADO EN FOOTER
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
  const adminExportCsvBtn = $('#adminExportCsvBtn');

  let authToken = localStorage.getItem('unpsjb_admin_token') || null;

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
    localStorage.removeItem('unpsjb_admin_token');
    adminDashboardDialog.close();
  });

  function verifyTokenAndOpenDashboard() {
    fetch(`${API_BASE}/api/admin/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        adminUserTag.textContent = `Conectado como: ${data.user.name} (${data.user.role})`;
        openAdminDashboard();
      } else {
        authToken = null;
        localStorage.removeItem('unpsjb_admin_token');
        lock(true);
        adminLoginDialog.showModal();
      }
    })
    .catch(() => {
      authToken = null;
      localStorage.removeItem('unpsjb_admin_token');
      lock(true);
      adminLoginDialog.showModal();
    });
  }

  /* ------------------------------------------------------------------------
     11 · TABLERO BACKEND ADMIN
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
      } else if (tab === 'usuarios') {
        $('#dashTabUsuarios').classList.add('active');
        loadAdminUsers();
      }
    });
  });

  function loadAdminInscripciones() {
    if (!authToken || !adminInscripcionesTbody) return;
    const search = adminSearchInscripciones.value.trim();
    const estado = adminFilterEstado.value;

    fetch(`${API_BASE}/api/admin/inscripciones?search=${encodeURIComponent(search)}&estado=${encodeURIComponent(estado)}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(data => {
      countInscripciones.textContent = data.length;
      if (data.length === 0) {
        adminInscripcionesTbody.innerHTML = `<tr><td colspan="8" style="padding: 1rem; text-align: center; color: var(--ink-3);">No se encontraron inscripciones.</td></tr>`;
        return;
      }

      adminInscripcionesTbody.innerHTML = data.map(item => `
        <tr>
          <td><strong class="text-ember">${item.code}</strong></td>
          <td><strong>${item.nombre} ${item.apellido}</strong></td>
          <td>${item.dni}</td>
          <td><div>${item.email}</div><small class="text-muted">${item.telefono}</small></td>
          <td>${item.localidad}</td>
          <td><div>${item.tipo_kayak}</div><small class="text-muted">${item.experiencia}</small></td>
          <td><span class="status-pill pill-${item.estado.toLowerCase()}">${item.estado}</span></td>
          <td>
            <button class="action-btn" onclick="updateEnrollStatus(${item.id}, 'CONFIRMADA')">Confirmar</button>
            <button class="action-btn" onclick="updateEnrollStatus(${item.id}, 'CANCELADA')">Cancelar</button>
            <button class="action-btn" onclick="deleteEnroll(${item.id})" style="color: var(--ember);">Eliminar</button>
          </td>
        </tr>
      `).join('');
    });
  }

  adminSearchInscripciones?.addEventListener('input', loadAdminInscripciones);
  adminFilterEstado?.addEventListener('change', loadAdminInscripciones);

  adminExportCsvBtn?.addEventListener('click', () => {
    fetch(`${API_BASE}/api/admin/inscripciones/export`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inscripciones_travesia_los_alerces.csv';
      a.click();
    });
  });

  window.updateEnrollStatus = function(id, nuevoEstado) {
    fetch(`${API_BASE}/api/admin/inscripciones/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ estado: nuevoEstado })
    })
    .then(res => res.json())
    .then(() => loadAdminInscripciones());
  };

  window.deleteEnroll = function(id) {
    if (!confirm('¿Eliminar esta inscripción?')) return;
    fetch(`${API_BASE}/api/admin/inscripciones/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(() => loadAdminInscripciones());
  };

  // BLOG ADMIN
  const adminBlogTbody = $('#adminBlogTbody');
  const postEditorDialog = $('#postEditorDialog');
  wireDialog(postEditorDialog);
  const openNewPostModalBtn = $('#openNewPostModalBtn');
  const postForm = $('#postForm');

  function loadAdminBlogPosts() {
    if (!authToken || !adminBlogTbody) return;
    fetch(`${API_BASE}/api/admin/posts`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(posts => {
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
        imagenUrl: $('#postImagenUrl').value.trim(),
        resumen: $('#postResumen').value.trim(),
        contenido: $('#postContenido').value.trim(),
        publicado: $('#postPublicado').checked
      };

      const method = id ? 'PUT' : 'POST';
      const url = id ? `${API_BASE}/api/admin/posts/${id}` : `${API_BASE}/api/admin/posts`;

      fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
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
    fetch(`${API_BASE}/api/admin/posts`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(posts => {
      const p = posts.find(item => item.id === id);
      if (!p) return;
      $('#postId').value = p.id;
      $('#postTitulo').value = p.titulo;
      $('#postCategoria').value = p.categoria;
      $('#postImagenUrl').value = p.imagen_url || '';
      $('#postResumen').value = p.resumen;
      $('#postContenido').value = p.contenido;
      $('#postPublicado').checked = !!p.publicado;
      $('#postEditorTitle').textContent = 'Editar Noticia';
      lock(true);
      postEditorDialog.showModal();
    });
  };

  window.deletePostAdmin = function(id) {
    if (!confirm('¿Eliminar esta noticia?')) return;
    fetch(`${API_BASE}/api/admin/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(() => {
      loadAdminBlogPosts();
      loadPublicBlogPosts();
    });
  };

  // ADMIN USERS
  const adminUsuariosTbody = $('#adminUsuariosTbody');
  const openNewUserModalBtn = $('#openNewUserModalBtn');

  function loadAdminUsers() {
    if (!authToken || !adminUsuariosTbody) return;
    fetch(`${API_BASE}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(users => {
      adminUsuariosTbody.innerHTML = users.map(u => `
        <tr>
          <td><strong>${u.name}</strong></td>
          <td>${u.email}</td>
          <td><span class="status-pill pill-confirmada">${u.role}</span></td>
          <td>${new Date(u.created_at).toLocaleDateString('es-AR')}</td>
          <td>
            <button class="action-btn" onclick="deleteUserAdmin(${u.id})" style="color: var(--ember);">Borrar</button>
          </td>
        </tr>
      `).join('');
    });
  }

  openNewUserModalBtn?.addEventListener('click', () => {
    const email = prompt('Email del nuevo usuario:');
    if (!email) return;
    const password = prompt('Contraseña para ' + email + ':');
    if (!password) return;
    const name = prompt('Nombre completo:');
    if (!name) return;

    fetch(`${API_BASE}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ email, password, name, role: 'EDITOR' })
    })
    .then(res => res.json())
    .then(data => {
      if (data.id) {
        alert('Usuario creado con éxito');
        loadAdminUsers();
      } else {
        alert(data.error || 'Error al crear usuario.');
      }
    });
  });

  window.deleteUserAdmin = function(id) {
    if (!confirm('¿Eliminar este usuario?')) return;
    fetch(`${API_BASE}/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(() => loadAdminUsers());
  };

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
