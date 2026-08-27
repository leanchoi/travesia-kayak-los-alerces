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

const app = express();
const PORT = process.env.PORT || 80;
const JWT_SECRET = process.env.JWT_SECRET || 'unpsjb_fce_travesia_los_alerces_key_2026';

// Middleware
app.use(cors());
// 8 MB: el comprobante de pago viaja como data URL dentro del JSON. El cliente
// ya reduce las fotos antes de mandarlas, pero un PDF puede pesar más que el
// límite de 100 kb que trae express por defecto.
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

    // Columnas agregadas después de la primera versión. Se aplican sobre bases
    // ya creadas; si la columna existe, SQLite devuelve error y se ignora.
    [
        "ALTER TABLE enrollments ADD COLUMN declaracion_salud INTEGER DEFAULT 0",
        "ALTER TABLE enrollments ADD COLUMN comprobante TEXT",
        "ALTER TABLE enrollments ADD COLUMN comprobante_nombre TEXT"
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

    // Seed default admin if none exists
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (!err && row && row.count === 0) {
            const adminEmail = 'admin@economicasunp.edu.ar';
            const adminPass = 'admin123';
            const hashed = bcrypt.hashSync(adminPass, 10);
            db.run("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)", [
                adminEmail, hashed, 'Cr. Adrián Cardacci (Admin)', 'ADMIN'
            ]);
            console.log('👤 Usuario Admin inicial creado: admin@economicasunp.edu.ar / admin123');
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
                 'Canchas de pádel, alquiler de paletas y clases para todos los niveles.',
                 'Primer turno de cancha sin cargo',
                 'Un turno de 90 minutos por inscripción, sujeto a disponibilidad. Para los días previos a la travesía.',
                 'PADEL1', 'Diciembre 2026', 'assets/auspiciantes/esquel-padel.webp', '', 5],
                ['El Rastro · Mercado de Regalos', 'Regalería',
                 'Mates, termos y regalería para llevarse algo de la Comarca.',
                 '10% OFF en mates y termos',
                 'Presentando el código de inscripción en el local. No acumulable con liquidaciones.',
                 'RASTRO10', 'Hasta el 31/12/2026', 'assets/auspiciantes/el-rastro.webp', '', 6]
            ];
            const stmt = db.prepare(`INSERT INTO benefits
                (prestador, rubro, descripcion, oferta, detalle, codigo, vigencia, logo_url, enlace, orden, activo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`);
            seed.forEach(r => stmt.run(r));
            stmt.finalize();
            console.log('🎟️  Beneficios de ejemplo creados.');
        }
    });

    // Seed initial blog posts if none exist
    db.get("SELECT COUNT(*) as count FROM posts", (err, row) => {
        if (!err && row && row.count === 0) {
            const post1Title = 'Reseña – Próxima Bajada en Kayaks PNLA 2026';
            const post1Slug = 'resena-proxima-bajada-en-kayaks-pnla-2026';
            const post1Resumen = 'De acuerdo con lo previsto en la edición realizada en abril, y a pedido de los propios participantes, nos complace anunciar que la próxima Bajada en Kayaks del Parque Nacional Los Alerces se llevará a cabo los días 12 y 13 de diciembre de 2026.';
            const post1Contenido = 'De acuerdo con lo previsto en la edición realizada en abril, y a pedido de los propios participantes, nos complace anunciar que la próxima Bajada en Kayaks del Parque Nacional Los Alerces se llevará a cabo los días 12 y 13 de diciembre de 2026.\n\nEl rotundo éxito alcanzado en la última edición —por su organización, seguridad, atención y el entusiasmo compartido— nos impulsa a consolidar esta actividad año tras año, transformándola en una tradición que fortalece la identidad institucional y comunitaria.\n\nNuestra intención es seguir promoviendo la pertenencia, empatía, atracción, admiración, compromiso y orgullo hacia nuestra Comarca Andina, destacando su belleza natural y el espíritu colaborativo que caracteriza a quienes la habitan y la disfrutan.\n\nLa Facultad de Ciencias Económicas de la UNPSJB – Sede Esquel reafirma así su compromiso con el desarrollo de actividades que integran deporte, naturaleza y comunidad, generando espacios de encuentro que trascienden lo académico y fortalecen los lazos sociales y territoriales.';

            const post2Title = 'Balance de la VII Edición: 42 remeros y 33 embarcaciones recorrieron el PNLA';
            const post2Slug = 'balance-vii-edicion-42-remeros-33-embarcaciones-pnla';
            const post2Resumen = 'Resumen completo de la jornada de 20 km entre el Lago Verde, el Río Arrayanes, la playa de Hostería Cumehué y el Camping Agreste Bahía Rosales.';
            const post2Contenido = 'Organizada por la Facultad de Ciencias Económicas de la Universidad Nacional de la Patagonia San Juan Bosco (UNPSJB), la séptima edición de la Travesía en Kayaks del Parque Nacional Los Alerces fue una experiencia inolvidable que reunió a 42 remeros y 33 embarcaciones en un recorrido único por los paisajes más emblemáticos de la cordillera.\n\nEl recorrido constó de cuatro hitos centrales:\n• Inicio en el Lago Verde, rodeado de aguas cristalinas.\n• Descenso por el majestuoso Río Arrayanes, un verdadero espectáculo natural.\n• Paso por la playa de la Hostería Cumehué, donde la camaradería se hizo sentir.\n• Llegada al Camping Agreste Bahía Rosales, coronando una jornada de aventura y emoción.\n\nAventura, placer, naturaleza, atención y seguridad se combinaron para dar forma a un evento que dejó huella en cada participante.';

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

// --------------------------------------------------------------------------
// PUBLIC REST API ENDPOINTS
// --------------------------------------------------------------------------

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
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Credenciales inválidas' });

        const isValid = bcrypt.compareSync(password, user.password);
        if (!isValid) return res.status(401).json({ error: 'Credenciales inválidas' });

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    });
});

app.get('/api/admin/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

app.get('/api/admin/inscripciones', authenticateToken, (req, res) => {
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

app.patch('/api/admin/inscripciones/:id', authenticateToken, (req, res) => {
    const { estado } = req.body;
    if (!['PENDIENTE', 'CONFIRMADA', 'CANCELADA'].includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }

    db.run("UPDATE enrollments SET estado = ? WHERE id = ?", [estado, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Error actualizando estado' });
        res.json({ message: 'Estado actualizado', id: req.params.id, estado });
    });
});

app.delete('/api/admin/inscripciones/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM enrollments WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Error eliminando registro' });
        res.json({ message: 'Inscripción eliminada', id: req.params.id });
    });
});

app.get('/api/admin/inscripciones/export', authenticateToken, (req, res) => {
    db.all("SELECT * FROM enrollments ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error generando CSV' });

        let csv = 'Código,Nombre,Apellido,DNI,Email,Teléfono,Localidad,Tipo Kayak,Experiencia,Contacto Emergencia,Estado,Fecha\n';
        (rows || []).forEach(r => {
            csv += `"${r.code}","${r.nombre}","${r.apellido}","${r.dni}","${r.email}","${r.telefono}","${r.localidad}","${r.tipo_kayak}","${r.experiencia}","${r.contacto_emergencia}","${r.estado}","${r.creado_at}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="inscripciones_travesia_los_alerces.csv"');
        res.send(csv);
    });
});

app.get('/api/admin/posts', authenticateToken, (req, res) => {
    db.all("SELECT * FROM posts ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error consultando artículos de admin' });
        res.json(rows || []);
    });
});

app.post('/api/admin/posts', authenticateToken, (req, res) => {
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

app.put('/api/admin/posts/:id', authenticateToken, (req, res) => {
    const { titulo, resumen, contenido, imagenUrl, categoria, publicado } = req.body;

    db.run("UPDATE posts SET titulo = ?, resumen = ?, contenido = ?, imagen_url = ?, categoria = ?, publicado = ?, actualizado_at = CURRENT_TIMESTAMP WHERE id = ?", [
        titulo, resumen, contenido, imagenUrl, categoria, publicado ? 1 : 0, req.params.id
    ], function(err) {
        if (err) return res.status(500).json({ error: 'Error actualizando artículo' });
        res.json({ message: 'Artículo actualizado', id: req.params.id });
    });
});

app.delete('/api/admin/posts/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM posts WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Error eliminando artículo' });
        res.json({ message: 'Artículo eliminado', id: req.params.id });
    });
});

// ── Beneficios · ABM completo ───────────────────────────────────────────────
app.get('/api/admin/beneficios', authenticateToken, (req, res) => {
    db.all("SELECT * FROM benefits ORDER BY orden ASC, id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error consultando beneficios' });
        res.json(rows || []);
    });
});

app.post('/api/admin/beneficios', authenticateToken, (req, res) => {
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

app.put('/api/admin/beneficios/:id', authenticateToken, (req, res) => {
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

app.delete('/api/admin/beneficios/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM benefits WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Error eliminando beneficio' });
        res.json({ message: 'Beneficio eliminado', id: req.params.id });
    });
});

app.get('/api/admin/users', authenticateToken, (req, res) => {
    db.all("SELECT id, email, name, role, created_at FROM users ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error obteniendo usuarios' });
        res.json(rows || []);
    });
});

app.post('/api/admin/users', authenticateToken, (req, res) => {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });

    const hashed = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)", [
        email, hashed, name, role || 'EDITOR'
    ], function(err) {
        if (err) return res.status(500).json({ error: 'Error creando usuario o el email ya existe' });
        res.status(201).json({ message: 'Usuario creado con éxito', id: this.lastID, email, name });
    });
});

app.delete('/api/admin/users/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM users WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Error eliminando usuario' });
        res.json({ message: 'Usuario eliminado' });
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
