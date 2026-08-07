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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
        if (!err && row.count === 0) {
            const adminEmail = 'admin@economicasunp.edu.ar';
            const adminPass = 'admin123';
            const hashed = bcrypt.hashSync(adminPass, 10);
            db.run("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)", [
                adminEmail, hashed, 'Cr. Adrián Cardacci (Admin)', 'ADMIN'
            ]);
            console.log('👤 Usuario Admin inicial creado: admin@economicasunp.edu.ar / admin123');
        }
    });

    // Seed initial blog posts if none exist
    db.get("SELECT COUNT(*) as count FROM posts", (err, row) => {
        if (!err && row.count === 0) {
            const post1Slug = 'confirmada-proxima-edicion-diciembre-2026';
            const post1Title = 'Confirmada la próxima Bajada de Kayak: 12 y 13 de Diciembre de 2026';
            const post1Resumen = 'Tras el rotundo éxito de abril, la Facultad de Ciencias Económicas de la UNPSJB abre las pre-inscripciones para la travesía de verano en Los Alerces.';
            const post1Contenido = 'La Facultad de Ciencias Económicas de la Universidad Nacional de la Patagonia San Juan Bosco (UNPSJB) Sede Esquel se complace en anunciar oficialmente la fecha de la próxima edición de la Travesía y Bajada de Kayak en el Parque Nacional Los Alerces. El evento se llevará a cabo los días 12 y 13 de Diciembre de 2026.\n\nContaremos con clínicas previas de remo, acompañamiento de seguridad con Prefectura Naval Argentina y logística integral desde Lago Verde hasta Bahía Rosales.';
            
            const post2Slug = 'balance-historico-edicion-abril-2026';
            const post2Title = 'Balance de la 7ª Edición: 42 remeros recuperaron una tradición histórica';
            const post2Resumen = 'Resumen completo de la jornada de 20 km entre el Lago Verde y el Lago Futalaufquen organizada por la FCE UNPSJB.';
            const post2Contenido = 'Con la participación de 42 remeros y remeras universitarios y vecinos de la Comarca del Ande, se llevó a cabo exitosamente el retorno formal de la Bajada de Kayak en el Parque Nacional Los Alerces. El trayecto se desarrolló en condiciones de agua cristalina y bajo estrictos protocolos de impacto ambiental cero.';

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
    const { nombre, apellido, dni, email, telefono, localidad, tipoKayak, experiencia, contactoEmergencia, observaciones } = req.body;

    if (!nombre || !apellido || !dni || !email || !telefono) {
        return res.status(400).json({ error: 'Nombre, Apellido, DNI, Email y Teléfono son campos obligatorios.' });
    }

    // Generate unique registration code
    const code = 'KA-' + Math.floor(100000 + Math.random() * 900000);

    const query = `
        INSERT INTO enrollments (code, nombre, apellido, dni, email, telefono, localidad, tipo_kayak, experiencia, contacto_emergencia, observaciones, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE')
    `;

    db.run(query, [code, nombre, apellido, dni, email, telefono, localidad || 'Esquel', tipoKayak || 'Simple', experiencia || 'Principiante', contactoEmergencia || 'N/D', observaciones || ''], function(err) {
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
        res.json(rows);
    });
});

// 3. Public Blog Post Detail
app.get('/api/blog/:slug', (req, res) => {
    db.get("SELECT * FROM posts WHERE slug = ? AND publicado = 1", [req.params.slug], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Artículo no encontrado' });
        res.json(row);
    });
});

// --------------------------------------------------------------------------
// ADMIN / BACK-END REST API ENDPOINTS
// --------------------------------------------------------------------------

// Login Endpoint
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

// Verify Token Endpoint
app.get('/api/admin/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Manage Enrollments: List, Filter, Search, Order
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
        res.json(rows);
    });
});

// Update Enrollment Status
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

// Delete Enrollment
app.delete('/api/admin/inscripciones/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM enrollments WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Error eliminando registro' });
        res.json({ message: 'Inscripción eliminada', id: req.params.id });
    });
});

// CSV Export of Enrollments
app.get('/api/admin/inscripciones/export', authenticateToken, (req, res) => {
    db.all("SELECT * FROM enrollments ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error generando CSV' });

        let csv = 'Código,Nombre,Apellido,DNI,Email,Teléfono,Localidad,Tipo Kayak,Experiencia,Contacto Emergencia,Estado,Fecha\n';
        rows.forEach(r => {
            csv += `"${r.code}","${r.nombre}","${r.apellido}","${r.dni}","${r.email}","${r.telefono}","${r.localidad}","${r.tipo_kayak}","${r.experiencia}","${r.contacto_emergencia}","${r.estado}","${r.creado_at}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="inscripciones_travesia_los_alerces.csv"');
        res.send(csv);
    });
});

// Manage Blog Posts (Admin): List All
app.get('/api/admin/posts', authenticateToken, (req, res) => {
    db.all("SELECT * FROM posts ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error consultando artículos de admin' });
        res.json(rows);
    });
});

// Create Post
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

// Update Post
app.put('/api/admin/posts/:id', authenticateToken, (req, res) => {
    const { titulo, resumen, contenido, imagenUrl, categoria, publicado } = req.body;

    db.run("UPDATE posts SET titulo = ?, resumen = ?, contenido = ?, imagen_url = ?, categoria = ?, publicado = ?, actualizado_at = CURRENT_TIMESTAMP WHERE id = ?", [
        titulo, resumen, contenido, imagenUrl, categoria, publicado ? 1 : 0, req.params.id
    ], function(err) {
        if (err) return res.status(500).json({ error: 'Error actualizando artículo' });
        res.json({ message: 'Artículo actualizado', id: req.params.id });
    });
});

// Delete Post
app.delete('/api/admin/posts/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM posts WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Error eliminando artículo' });
        res.json({ message: 'Artículo eliminado', id: req.params.id });
    });
});

// Manage Users (Admin)
app.get('/api/admin/users', authenticateToken, (req, res) => {
    db.all("SELECT id, email, name, role, created_at FROM users ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error obteniendo usuarios' });
        res.json(rows);
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

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor Travesía Los Alerces (UNPSJB FCE) ejecutándose en el puerto ${PORT}`);
});
