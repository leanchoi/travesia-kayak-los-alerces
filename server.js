/* ==========================================================================
   TRAVESÍA DE KAYAK PARQUE NACIONAL LOS ALERCES - FCE UNPSJB
   Backend Express Server & REST API with SQLite Database
   ========================================================================== */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 80;
const JWT_SECRET = process.env.JWT_SECRET || 'unpsjb_fce_travesia_los_alerces_key_2026';

// Middleware
app.use(cors());
// 8 MB: el comprobante de pago viaja como data URL dentro del JSON.
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

// Ensure database directory exists
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'travesia.db');
const db = new sqlite3.Database(dbPath);

// Initialize Database Schemas and Seed Data
db.serialize(() => {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'EDITOR',
            permissions TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Dynamic Config Table (Precios, promociones, leyendas de pago)
    db.run(`
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            actualizado_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Enrollments table (Inscripciones de Remeros)
    db.run(`
        CREATE TABLE IF NOT EXISTS enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            nombre TEXT NOT NULL,
            apellido TEXT NOT NULL,
            dni TEXT NOT NULL,
            email TEXT NOT NULL,
            telefono TEXT NOT NULL,
            localidad TEXT NOT NULL,
            tipo_kayak TEXT NOT NULL,
            experiencia TEXT NOT NULL,
            contacto_emergencia TEXT NOT NULL,
            observaciones TEXT,
            estado TEXT DEFAULT 'PENDIENTE',
            creado_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Columnas agregadas progresivamente
    [
        "ALTER TABLE enrollments ADD COLUMN declaracion_salud INTEGER DEFAULT 0",
        "ALTER TABLE enrollments ADD COLUMN comprobante TEXT",
        "ALTER TABLE enrollments ADD COLUMN comprobante_nombre TEXT",
        "ALTER TABLE users ADD COLUMN permissions TEXT"
    ].forEach(sql => db.run(sql, () => {}));

    // Beneficios / promociones de prestadores
    db.run(`
        CREATE TABLE IF NOT EXISTS benefits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prestador TEXT NOT NULL,
            rubro TEXT NOT NULL,
            descripcion TEXT NOT NULL,
            oferta TEXT NOT NULL,
            detalle TEXT,
            codigo TEXT,
            vigencia TEXT,
            logo_url TEXT,
            enlace TEXT,
            orden INTEGER DEFAULT 0,
            activo INTEGER DEFAULT 1,
            creado_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            actualizado_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Blog / Noticias table
    db.run(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            resumen TEXT NOT NULL,
            contenido TEXT NOT NULL,
            imagen_url TEXT,
            categoria TEXT DEFAULT 'Novedades',
            publicado INTEGER DEFAULT 1,
            creado_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            actualizado_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Seed Config de Precio por defecto
    const defaultConfigs = [
        ['precio_monto', '100.000'],
        ['precio_texto', 'Cien mil pesos'],
        ['precio_instrucciones', 'El costo de inscripción para la Travesía en Kayaks 2026 es de $100.000 (Cien mil pesos). Adjuntá la foto o captura legible del comprobante de transferencia bancaria de la reserva o pago completo.']
    ];

    defaultConfigs.forEach(([key, val]) => {
        db.run("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)", [key, val]);
    });

    // Default Super Admin Permissions
    const fullPermissions = JSON.stringify({
        ver_inscriptos: true,
        gestionar_inscriptos: true,
        gestion_noticias: true,
        gestion_beneficios: true,
        gestion_usuarios: true
    });

    // Seed/Update Admin User
    db.get("SELECT * FROM users WHERE email = 'admin@economicasunp.edu.ar' OR email = 'admin' OR name LIKE '%Cardacci%'", (err, row) => {
        const hashed = bcrypt.hashSync('admin123', 10);
        if (!row) {
            db.run("INSERT INTO users (email, password, name, role, permissions) VALUES (?, ?, ?, ?, ?)", [
                'admin@economicasunp.edu.ar', hashed, 'Administrador (Admin)', 'ADMIN', fullPermissions
            ]);
            console.log('👤 Usuario Admin creado: admin@economicasunp.edu.ar / admin123');
        } else {
            // Update existing admin account to 'admin' / 'admin@economicasunp.edu.ar' and full permissions
            db.run("UPDATE users SET email = 'admin@economicasunp.edu.ar', name = 'Administrador (Admin)', role = 'ADMIN', permissions = ? WHERE id = ?", [
                fullPermissions, row.id
            ]);
            console.log('👤 Usuario Admin actualizado a: Administrador (Admin) con email admin@economicasunp.edu.ar / admin');
        }
    });

    // Seed de beneficios de ejemplo
    db.get("SELECT COUNT(*) as count FROM benefits", (err, row) => {
        if (!err && row && row.count === 0) {
            const seed = [
                ['Esquel Outdoors', 'Equipamiento outdoor',
                 'Todo para la travesía en un solo lugar: kayaks, chalecos, bolsas estancas, camping y pesca.',
                 '20% OFF en alquiler de kayaks',
                 'Válido sobre el alquiler de K1, K2 y sit on top durante los días de la travesía. Reservá con 48 h de anticipación.',
                 'TRAVESIA26', 'Hasta el 13/12/2026', 'assets/auspiciantes/esquel-outdoors.webp', '', 1],
                ['Don Chiquino', 'Restaurante · Pastas',
                 'Pastas artesanales, carnes, postres y vinos en pleno centro de Esquel.',
                 'Postre y café de cortesía',
                 'Presentando el código de inscripción, por persona, en el menú de la noche.',
                 'REMEROS26', 'Diciembre 2026', 'assets/auspiciantes/don-chiquino.webp', '', 2],
                ['La Pulpería de Don Chiquino', 'Parrilla',
                 'Parrilla argentina con opciones veganas y ambiente acogedor.',
                 '2x1 en entradas',
                 'De domingo a jueves, para grupos de hasta seis personas. No acumulable con otras promociones.',
                 'PULPERIA2X1', 'Diciembre 2026', 'assets/auspiciantes/la-pulperia.webp', '', 3],
                ['La Fiambrería de Esquel', 'Fiambrería · Vinoteca',
                 'Fiambres, quesos y vinoteca para armar la picada del campamento.',
                 '15% OFF en picadas armadas',
                 'Sobre picadas para dos o más personas. Ideal para la noche de Bahía Rosales.',
                 'PICADA15', 'Hasta el 13/12/2026', 'assets/auspiciantes/la-fiambreria.webp', '', 4],
                ['Esquel Pádel', 'Complejo deportivo',
                 'Canchas sintéticas techadas, vestuarios y quincho para tercer tiempo.',
                 '15% OFF en alquiler de canchas',
                 'Válido para turnos diurnos y nocturnos durante toda la semana de la travesía.',
                 'PADEL26', 'Diciembre 2026', 'assets/auspiciantes/esquel-padel.webp', '', 5],
                ['Alerce Studio', 'Fotografía · Audiovisual',
                 'Fotografía de aventura, cobertura de eventos y registros en alta resolución.',
                 '10% OFF en paquetes de fotos personalizadas',
                 'Descuento exclusivo en el pack de fotos de alta resolución de tu paso por el Río Arrayanes.',
                 'FOTOALERCES', 'Hasta el 20/12/2026', 'assets/auspiciantes/alerce-studio.webp', '', 6]
            ];

            const stmt = db.prepare(`INSERT INTO benefits (prestador, rubro, descripcion, oferta, detalle, codigo, vigencia, logo_url, enlace, orden)
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            seed.forEach(item => stmt.run(item));
            stmt.finalize();
            console.log('🎁 Beneficios iniciales cargados con éxito.');
        }
    });

    // Seed de artículos de blog
    db.get("SELECT COUNT(*) as count FROM posts", (err, row) => {
        if (!err && row && row.count === 0) {
            const post1Title = 'Abierta la inscripción para la VIII Travesía en Kayaks del Parque Nacional Los Alerces';
            const post1Slug = 'abierta-inscripcion-viii-travesia-kayaks-2026';
            const post1Resumen = 'La Facultad de Ciencias Económicas (UNPSJB Sede Esquel) confirmó las fechas oficiales para la edición 2026. Los cupos son limitados a 100 embarcaciones.';
            const post1Contenido = 'La Facultad de Ciencias Económicas de la Universidad Nacional de la Patagonia San Juan Bosco (UNPSJB), Sede Esquel, anuncia la apertura del proceso de inscripción para la VIII Edición de la Travesía en Kayaks del Parque Nacional Los Alerces, a realizarse en diciembre de 2026.\n\nEl evento reunirá a navegantes de todo el país en un recorrido no competitivo de 20 kilómetros que une el Lago Verde, el Río Arrayanes, Hostería Cumehué y el Camping Agreste Bahía Rosales.\n\nLos interesados pueden completar el formulario oficial de inscripción en este portal.';

            const post2Title = 'La VII Travesía reunió a 42 remeros en las aguas del Río Arrayanes';
            const post2Slug = 'vii-travesia-reunio-42-remeros-rio-arrayanes';
            const post2Resumen = 'Resumen completo de la jornada de 20 km entre el Lago Verde, el Río Arrayanes, la playa de Hostería Cumehué y el Camping Agreste Bahía Rosales.';
            const post2Contenido = 'Organizada por la Facultad de Ciencias Económicas de la UNPSJB, la séptima edición de la Travesía en Kayaks del Parque Nacional Los Alerces fue una experiencia inolvidable que reunió a 42 remeros y 33 embarcaciones en un recorrido único por los paisajes más emblemáticos de la cordillera.\n\nAventura, placer, naturaleza, atención y seguridad se combinaron para dar forma a un evento que dejó huella en cada participante.';

            db.run(`INSERT INTO posts (titulo, slug, resumen, contenido, imagen_url, categoria, publicado) VALUES (?, ?, ?, ?, ?, ?, 1)`, [
                post1Title, post1Slug, post1Resumen, post1Contenido, 'assets/gallery-2.jpg', 'Oficial'
            ]);
            db.run(`INSERT INTO posts (titulo, slug, resumen, contenido, imagen_url, categoria, publicado) VALUES (?, ?, ?, ?, ?, ?, 1)`, [
                post2Title, post2Slug, post2Resumen, post2Contenido, 'assets/gallery-1.jpg', 'Prensa'
            ]);
            console.log('📰 Artículos iniciales de blog creados.');
        }
    });
});

// Middleware for JWT Authentication
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Acceso no autorizado. Token faltante.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido o expirado.' });
        req.user = user;
        next();
    });
}

// Helper middleware for Granular Permissions Check
function checkPermission(requiredPermission) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'No autenticado' });
        if (req.user.role === 'ADMIN') return next(); // Super admin bypass

        const perms = req.user.permissions || {};
        if (perms[requiredPermission] === true) {
            return next();
        }
        return res.status(403).json({ error: `Permiso insuficiente: requiere '${requiredPermission}'` });
    };
}

// --------------------------------------------------------------------------
// PUBLIC REST API ENDPOINTS
// --------------------------------------------------------------------------

// Public Price & Instructions Endpoint
app.get('/api/config/precio', (req, res) => {
    db.all("SELECT key, value FROM config WHERE key IN ('precio_monto', 'precio_texto', 'precio_instrucciones')", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error leyendo precio de inscripción' });
        const configMap = {};
        (rows || []).forEach(r => configMap[r.key] = r.value);
        res.json({
            monto: configMap.precio_monto || '100.000',
            texto: configMap.precio_texto || 'Cien mil pesos',
            instrucciones: configMap.precio_instrucciones || 'El costo de inscripción para la Travesía en Kayaks 2026 es de $100.000 (Cien mil pesos). Adjuntá el comprobante de transferencia bancaria.'
        });
    });
});

// 1. Submit Registration (Formulario de Inscripción)
app.post('/api/inscribirse', (req, res) => {
    const { nombre, apellido, dni, email, telefono, localidad, tipoKayak, experiencia,
            contactoEmergencia, observaciones, declaracionSalud, comprobante, comprobanteNombre } = req.body;

    if (!nombre || !apellido || !dni || !email || !telefono) {
        return res.status(400).json({ error: 'Nombre, Apellido, DNI, Email y Teléfono son campos obligatorios.' });
    }

    if (!declaracionSalud) {
        return res.status(400).json({ error: 'Falta aceptar la declaración de aptitud física y salud.' });
    }

    if (!comprobante) {
        return res.status(400).json({ error: 'El adjunto del comprobante de transferencia es obligatorio.' });
    }

    const code = 'KA-' + Math.floor(100000 + Math.random() * 900000);

    const query = `
        INSERT INTO enrollments (code, nombre, apellido, dni, email, telefono, localidad, tipo_kayak, experiencia, contacto_emergencia, observaciones, declaracion_salud, comprobante, comprobante_nombre, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE')
    `;

    db.run(query, [code, nombre, apellido, dni, email, telefono, localidad || 'Esquel', tipoKayak || 'K1', experiencia || 'Principiante', contactoEmergencia || 'N/D', observaciones || '', 1, comprobante || '', comprobanteNombre || ''], function(err) {
        if (err) {
            console.error('Error insertando inscripción:', err);
            return res.status(500).json({ error: 'Error al registrar la inscripción. Intente nuevamente.' });
        }
        res.status(201).json({
            message: 'Inscripción registrada con éxito',
            code,
            id: this.lastID,
            nombre: `${nombre} ${apellido}`,
            estado: 'PENDIENTE'
        });
    });
});

// 2. Public Blog Posts List
app.get('/api/blog', (req, res) => {
    db.all("SELECT id, titulo, slug, resumen, imagen_url, categoria, creado_at FROM posts WHERE publicado = 1 ORDER BY creado_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error consultando artículos' });
        res.json(rows || []);
    });
});

// 3. Public Blog Post Detail
app.get('/api/blog/:slug', (req, res) => {
    db.get("SELECT * FROM posts WHERE slug = ? AND publicado = 1", [req.params.slug], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Artículo no encontrado' });
        res.json(row);
    });
});

// 4. Beneficios públicos (sólo los activos)
app.get('/api/beneficios', (req, res) => {
    db.all("SELECT id, prestador, rubro, descripcion, oferta, detalle, codigo, vigencia, logo_url, enlace FROM benefits WHERE activo = 1 ORDER BY orden ASC, id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error consultando beneficios' });
        res.json(rows || []);
    });
});

// --------------------------------------------------------------------------
// ADMIN / BACK-END REST API ENDPOINTS
// --------------------------------------------------------------------------

app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email/Usuario y contraseña requeridos' });

    // Allow login by email or username 'admin'
    const loginQuery = (email === 'admin' || email === 'admin@economicasunp.edu.ar')
        ? "SELECT * FROM users WHERE email = 'admin@economicasunp.edu.ar' OR email = 'admin'"
        : "SELECT * FROM users WHERE email = ?";

    db.get(loginQuery, [email], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Credenciales inválidas' });

        const isValid = bcrypt.compareSync(password, user.password);
        if (!isValid) return res.status(401).json({ error: 'Credenciales inválidas' });

        let perms = {};
        try { perms = JSON.parse(user.permissions || '{}'); } catch(e){}

        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: perms
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: payload });
    });
});

app.get('/api/admin/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// ── Inscriptos / Enrollments ─────────────────────────────────────────────
app.get('/api/admin/inscripciones', authenticateToken, checkPermission('ver_inscriptos'), (req, res) => {
    const { search, estado } = req.query;
    let query = "SELECT * FROM enrollments WHERE 1=1";
    let params = [];

    if (estado && estado !== 'TODOS') {
        query += " AND estado = ?";
        params.push(estado);
    }

    if (search) {
        query += " AND (nombre LIKE ? OR apellido LIKE ? OR dni LIKE ? OR code LIKE ? OR email LIKE ?)";
        const term = `%${search}%`;
        params.push(term, term, term, term, term);
    }

    query += " ORDER BY id DESC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error obteniendo inscripciones' });
        res.json(rows || []);
    });
});

app.patch('/api/admin/inscripciones/:id', authenticateToken, checkPermission('gestionar_inscriptos'), (req, res) => {
    const { estado } = req.body;
    const validStates = ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'CONFIRMADA', 'CANCELADA'];
    if (!validStates.includes((estado || '').toUpperCase())) {
        return res.status(400).json({ error: 'Estado inválido. Debe ser PENDIENTE, APROBADO o RECHAZADO.' });
    }

    const stateUpper = estado.toUpperCase();
    db.run("UPDATE enrollments SET estado = ? WHERE id = ?", [stateUpper, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Error actualizando estado' });
        res.json({ message: 'Estado actualizado', id: req.params.id, estado: stateUpper });
    });
});

app.delete('/api/admin/inscripciones/:id', authenticateToken, checkPermission('gestionar_inscriptos'), (req, res) => {
    db.run("DELETE FROM enrollments WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Error eliminando registro' });
        res.json({ message: 'Inscripción eliminada', id: req.params.id });
    });
});

// Excel Export Endpoint (.xlsx)
app.get(['/api/admin/inscriptos/export-excel', '/api/admin/inscripciones/export-excel', '/api/admin/inscripciones/export'], authenticateToken, checkPermission('ver_inscriptos'), (req, res) => {
    db.all("SELECT * FROM enrollments ORDER BY id DESC", [], async (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error generando reporte Excel' });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Travesía Los Alerces UNPSJB';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Inscriptos 2026', {
            views: [{ showGridLines: true }]
        });

        worksheet.columns = [
            { header: 'Código', key: 'code', width: 14 },
            { header: 'Nombre', key: 'nombre', width: 18 },
            { header: 'Apellido', key: 'apellido', width: 18 },
            { header: 'DNI', key: 'dni', width: 14 },
            { header: 'Email', key: 'email', width: 26 },
            { header: 'Teléfono', key: 'telefono', width: 16 },
            { header: 'Localidad', key: 'localidad', width: 18 },
            { header: 'Tipo Kayak', key: 'tipo_kayak', width: 14 },
            { header: 'Experiencia', key: 'experiencia', width: 18 },
            { header: 'Contacto Emergencia', key: 'contacto_emergencia', width: 24 },
            { header: 'Observaciones', key: 'observaciones', width: 28 },
            { header: 'Declaración Salud', key: 'declaracion_salud', width: 18 },
            { header: 'Comprobante', key: 'comprobante', width: 16 },
            { header: 'Estado', key: 'estado', width: 14 },
            { header: 'Fecha Registro', key: 'creado_at', width: 20 }
        ];

        // Header styling
        const headerRow = worksheet.getRow(1);
        headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF003366' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 26;

        (rows || []).forEach((r, idx) => {
            const row = worksheet.addRow({
                code: r.code || '',
                nombre: r.nombre || '',
                apellido: r.apellido || '',
                dni: r.dni || '',
                email: r.email || '',
                telefono: r.telefono || '',
                localidad: r.localidad || '',
                tipo_kayak: r.tipo_kayak || '',
                experiencia: r.experiencia || '',
                contacto_emergencia: r.contacto_emergencia || '',
                observaciones: r.observaciones || '',
                declaracion_salud: r.declaracion_salud ? 'Aceptada' : 'No aceptada',
                comprobante: r.comprobante ? 'Adjunto' : 'Pendiente',
                estado: r.estado || 'PENDIENTE',
                creado_at: r.creado_at || ''
            });

            row.alignment = { vertical: 'middle' };
            row.height = 20;

            if (idx % 2 === 1) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF4F6F8' }
                };
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Inscriptos_Travesia_Los_Alerces_2026.xlsx"');

        await workbook.xlsx.write(res);
        res.end();
    });
});

// ── Dynamic Config (Precios & Promociones) ──────────────────────────────────
app.get('/api/admin/config', authenticateToken, (req, res) => {
    db.all("SELECT key, value FROM config", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error consultando configuración' });
        const configMap = {};
        (rows || []).forEach(r => configMap[r.key] = r.value);
        res.json(configMap);
    });
});

app.put('/api/admin/config', authenticateToken, (req, res) => {
    const { precio_monto, precio_texto, precio_instrucciones } = req.body;

    const stmt = db.prepare("INSERT OR REPLACE INTO config (key, value, actualizado_at) VALUES (?, ?, CURRENT_TIMESTAMP)");
    if (precio_monto !== undefined) stmt.run('precio_monto', String(precio_monto));
    if (precio_texto !== undefined) stmt.run('precio_texto', String(precio_texto));
    if (precio_instrucciones !== undefined) stmt.run('precio_instrucciones', String(precio_instrucciones));
    stmt.finalize();

    res.json({ message: 'Configuración actualizada con éxito' });
});

// ── Blog / Noticias ABM ───────────────────────────────────────────────────
app.get('/api/admin/posts', authenticateToken, checkPermission('gestion_noticias'), (req, res) => {
    db.all("SELECT * FROM posts ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error consultando artículos de admin' });
        res.json(rows || []);
    });
});

app.post('/api/admin/posts', authenticateToken, checkPermission('gestion_noticias'), (req, res) => {
    const { titulo, resumen, contenido, imagenUrl, categoria, publicado } = req.body;
    if (!titulo || !contenido) return res.status(400).json({ error: 'Título y contenido requeridos' });

    const slug = titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);
    const pubStatus = publicado ? 1 : 0;

    db.run("INSERT INTO posts (titulo, slug, resumen, contenido, imagen_url, categoria, publicado) VALUES (?, ?, ?, ?, ?, ?, ?)", [
        titulo, slug, resumen || '', contenido, imagenUrl || 'assets/gallery-1.jpg', categoria || 'Novedades', pubStatus
    ], function(err) {
        if (err) return res.status(500).json({ error: 'Error creando artículo' });
        res.status(201).json({ message: 'Artículo creado', id: this.lastID, slug });
    });
});

app.put('/api/admin/posts/:id', authenticateToken, checkPermission('gestion_noticias'), (req, res) => {
    const { titulo, resumen, contenido, imagenUrl, categoria, publicado } = req.body;

    db.run("UPDATE posts SET titulo = ?, resumen = ?, contenido = ?, imagen_url = ?, categoria = ?, publicado = ?, actualizado_at = CURRENT_TIMESTAMP WHERE id = ?", [
        titulo, resumen, contenido, imagenUrl, categoria, publicado ? 1 : 0, req.params.id
    ], function(err) {
        if (err) return res.status(500).json({ error: 'Error actualizando artículo' });
        res.json({ message: 'Artículo actualizado', id: req.params.id });
    });
});

app.delete('/api/admin/posts/:id', authenticateToken, checkPermission('gestion_noticias'), (req, res) => {
    db.run("DELETE FROM posts WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Error eliminando artículo' });
        res.json({ message: 'Artículo eliminado', id: req.params.id });
    });
});

// ── Beneficios · ABM completo ───────────────────────────────────────────────
app.get('/api/admin/beneficios', authenticateToken, checkPermission('gestion_beneficios'), (req, res) => {
    db.all("SELECT * FROM benefits ORDER BY orden ASC, id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error consultando beneficios' });
        res.json(rows || []);
    });
});

app.post('/api/admin/beneficios', authenticateToken, checkPermission('gestion_beneficios'), (req, res) => {
    const { prestador, rubro, descripcion, oferta, detalle, codigo, vigencia, logoUrl, enlace, orden, activo } = req.body;
    if (!prestador || !oferta) return res.status(400).json({ error: 'Prestador y oferta son requeridos' });

    db.run(`INSERT INTO benefits (prestador, rubro, descripcion, oferta, detalle, codigo, vigencia, logo_url, enlace, orden, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [prestador, rubro || '', descripcion || '', oferta, detalle || '', codigo || '', vigencia || '',
         logoUrl || '', enlace || '', Number(orden) || 0, activo ? 1 : 0],
        function(err) {
            if (err) return res.status(500).json({ error: 'Error creando beneficio' });
            res.status(201).json({ message: 'Beneficio creado', id: this.lastID });
        });
});

app.put('/api/admin/beneficios/:id', authenticateToken, checkPermission('gestion_beneficios'), (req, res) => {
    const { prestador, rubro, descripcion, oferta, detalle, codigo, vigencia, logoUrl, enlace, orden, activo } = req.body;

    db.run(`UPDATE benefits SET prestador = ?, rubro = ?, descripcion = ?, oferta = ?, detalle = ?,
            codigo = ?, vigencia = ?, logo_url = ?, enlace = ?, orden = ?, activo = ?,
            actualizado_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [prestador, rubro || '', descripcion || '', oferta, detalle || '', codigo || '', vigencia || '',
         logoUrl || '', enlace || '', Number(orden) || 0, activo ? 1 : 0, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Error actualizando beneficio' });
            res.json({ message: 'Beneficio actualizado', id: req.params.id });
        });
});

app.delete('/api/admin/beneficios/:id', authenticateToken, checkPermission('gestion_beneficios'), (req, res) => {
    db.run("DELETE FROM benefits WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Error eliminando beneficio' });
        res.json({ message: 'Beneficio eliminado', id: req.params.id });
    });
});

// ── Usuarios & Permisos ABM ────────────────────────────────────────────────
app.get('/api/admin/users', authenticateToken, checkPermission('gestion_usuarios'), (req, res) => {
    db.all("SELECT id, email, name, role, permissions, created_at FROM users ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error obteniendo usuarios' });
        const parsedRows = (rows || []).map(r => {
            let perms = {};
            try { perms = JSON.parse(r.permissions || '{}'); } catch(e){}
            return { ...r, permissions: perms };
        });
        res.json(parsedRows);
    });
});

app.post('/api/admin/users', authenticateToken, checkPermission('gestion_usuarios'), (req, res) => {
    const { email, password, name, role, permissions } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Email/Usuario, contraseña y nombre son requeridos' });

    const hashed = bcrypt.hashSync(password, 10);
    const permsJson = JSON.stringify(permissions || {
        ver_inscriptos: true,
        gestionar_inscriptos: false,
        gestion_noticias: true,
        gestion_beneficios: false,
        gestion_usuarios: false
    });

    db.run("INSERT INTO users (email, password, name, role, permissions) VALUES (?, ?, ?, ?, ?)", [
        email, hashed, name, role || 'EDITOR', permsJson
    ], function(err) {
        if (err) return res.status(500).json({ error: 'Error creando usuario o el email ya existe' });
        res.status(201).json({ message: 'Usuario creado con éxito', id: this.lastID, email, name });
    });
});

app.put('/api/admin/users/:id', authenticateToken, checkPermission('gestion_usuarios'), (req, res) => {
    const { email, password, name, role, permissions } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'Email y nombre son requeridos' });

    const permsJson = JSON.stringify(permissions || {});

    if (password && password.trim()) {
        const hashed = bcrypt.hashSync(password, 10);
        db.run("UPDATE users SET email = ?, password = ?, name = ?, role = ?, permissions = ? WHERE id = ?", [
            email, hashed, name, role || 'EDITOR', permsJson, req.params.id
        ], function(err) {
            if (err) return res.status(500).json({ error: 'Error actualizando usuario' });
            res.json({ message: 'Usuario actualizado con éxito' });
        });
    } else {
        db.run("UPDATE users SET email = ?, name = ?, role = ?, permissions = ? WHERE id = ?", [
            email, name, role || 'EDITOR', permsJson, req.params.id
        ], function(err) {
            if (err) return res.status(500).json({ error: 'Error actualizando usuario' });
            res.json({ message: 'Usuario actualizado con éxito' });
        });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, checkPermission('gestion_usuarios'), (req, res) => {
    // Prevent deleting main admin
    db.get("SELECT email FROM users WHERE id = ?", [req.params.id], (err, user) => {
        if (user && (user.email === 'admin@economicasunp.edu.ar' || user.email === 'admin')) {
            return res.status(400).json({ error: 'No se puede eliminar el usuario administrador principal.' });
        }
        db.run("DELETE FROM users WHERE id = ?", [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: 'Error eliminando usuario' });
            res.json({ message: 'Usuario eliminado' });
        });
    });
});

// Serve Static Web Frontend
app.use(express.static(__dirname));

// Fallback to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor Travesía Los Alerces (UNPSJB FCE) ejecutándose en el puerto ${PORT}`);
});
