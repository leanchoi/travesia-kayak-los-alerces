<?php
/* ==========================================================================
   TRAVESÍA EN KAYAK LOS ALERCES 2026 - FCE UNPSJB
   Base de Datos & Conexión PDO (MySQL con fallback a SQLite)
   ========================================================================== */

// ── CONFIGURACIÓN DE BASE DE DATOS PARA HOSTINGER ──────────────────────────
// Completá estos datos con los que te da Hostinger en:
// Panel Hostinger -> Bases de datos -> Crear nueva base de datos MySQL
define('DB_HOST', 'localhost');
define('DB_NAME', '');      // Ej: u123456789_travesia (Dejá vacío para usar SQLite automático)
define('DB_USER', '');      // Ej: u123456789_admin
define('DB_PASS', '');      // Tu contraseña de base de datos
define('DB_PORT', '3306');

// Clave secreta para tokens JWT
define('JWT_SECRET', 'unpsjb_fce_travesia_los_alerces_key_2026_hostinger');

function getDB() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    try {
        if (!empty(DB_NAME) && !empty(DB_USER)) {
            // Conexión MySQL Hostinger
            $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            $isMySQL = true;
        } else {
            // Fallback automático a SQLite local si no configuró MySQL todavía
            $dbDir = __DIR__ . '/../data';
            if (!is_dir($dbDir)) {
                @mkdir($dbDir, 0755, true);
            }
            $pdo = new PDO('sqlite:' . $dbDir . '/travesia.db');
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $isMySQL = false;
        }

        initTables($pdo, $isMySQL);
        return $pdo;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error de conexión a la base de datos: ' . $e->getMessage()]);
        exit;
    }
}

function initTables($pdo, $isMySQL) {
    $pk = $isMySQL ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $textType = $isMySQL ? 'LONGTEXT' : 'TEXT';
    $timestamp = $isMySQL ? 'DATETIME DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP';

    // 1. Users
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id $pk,
            email VARCHAR(190) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'EDITOR',
            permissions $textType,
            created_at $timestamp
        )
    ");

    // 2. Config
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS config (
            cfg_key VARCHAR(100) PRIMARY KEY,
            cfg_value $textType NOT NULL,
            actualizado_at $timestamp
        )
    ");

    // 3. Enrollments
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS enrollments (
            id $pk,
            code VARCHAR(50) UNIQUE NOT NULL,
            nombre VARCHAR(150) NOT NULL,
            apellido VARCHAR(150) NOT NULL,
            dni VARCHAR(50) NOT NULL,
            email VARCHAR(150) NOT NULL,
            telefono VARCHAR(100) NOT NULL,
            localidad VARCHAR(150) NOT NULL,
            tipo_kayak VARCHAR(100) NOT NULL,
            experiencia VARCHAR(100) NOT NULL,
            contacto_emergencia VARCHAR(255) NOT NULL,
            observaciones $textType,
            declaracion_salud INT DEFAULT 1,
            declaracion_imagen INT DEFAULT 1,
            comprobante $textType,
            comprobante_nombre VARCHAR(255),
            estado VARCHAR(50) DEFAULT 'PENDIENTE',
            creado_at $timestamp
        )
    ");

    // 4. Posts
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS posts (
            id $pk,
            titulo VARCHAR(255) NOT NULL,
            slug VARCHAR(190) UNIQUE NOT NULL,
            resumen $textType,
            contenido $textType NOT NULL,
            imagen_url $textType,
            categoria VARCHAR(100) DEFAULT 'Novedades',
            publicado INT DEFAULT 1,
            creado_at $timestamp,
            actualizado_at $timestamp
        )
    ");

    // 5. Benefits
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS benefits (
            id $pk,
            prestador VARCHAR(255) NOT NULL,
            rubro VARCHAR(150) NOT NULL,
            descripcion $textType,
            oferta $textType NOT NULL,
            detalle $textType,
            codigo VARCHAR(100),
            vigencia VARCHAR(150),
            logo_url $textType,
            enlace $textType,
            orden INT DEFAULT 0,
            activo INT DEFAULT 1,
            creado_at $timestamp,
            actualizado_at $timestamp
        )
    ");

    // Seed Config por defecto
    $defaultConfigs = [
        'precio_monto' => '100.000',
        'precio_texto' => 'Cien mil pesos',
        'precio_instrucciones' => 'El costo de inscripción para la Travesía en Kayaks 2026 es de $100.000 (Cien mil pesos). Adjuntá la foto o captura legible del comprobante de transferencia bancaria de la reserva o pago completo.',
        'cupo_maximo' => '100',
        'inscripciones_habilitadas' => '1',
        'mensaje_cierre' => 'Cupos completos para la edición 2026. Muchas gracias a todos los remeros por sumarse a la travesía. Seguinos en nuestras redes oficiales para novedades o lista de espera.'
    ];

    $cfgStmt = $pdo->prepare("SELECT COUNT(*) as count FROM config WHERE cfg_key = ?");
    $insertCfg = $pdo->prepare("INSERT INTO config (cfg_key, cfg_value) VALUES (?, ?)");
    foreach ($defaultConfigs as $k => $v) {
        $cfgStmt->execute([$k]);
        if ($cfgStmt->fetch()['count'] == 0) {
            $insertCfg->execute([$k, $v]);
        }
    }

    // Seed Admin User
    $adminCheck = $pdo->prepare("SELECT id FROM users WHERE email = 'admin@economicasunp.edu.ar' OR email = 'admin'");
    $adminCheck->execute();
    $fullPerms = json_encode([
        'ver_inscriptos' => true,
        'gestionar_inscriptos' => true,
        'gestion_noticias' => true,
        'gestion_beneficios' => true,
        'gestion_usuarios' => true
    ]);

    if (!$adminCheck->fetch()) {
        $hash = password_hash('admin123', PASSWORD_BCRYPT);
        $ins = $pdo->prepare("INSERT INTO users (email, password, name, role, permissions) VALUES (?, ?, ?, ?, ?)");
        $ins->execute(['admin@economicasunp.edu.ar', $hash, 'Administrador (Admin)', 'ADMIN', $fullPerms]);
    }

    // Seed Beneficios de muestra
    $benCheck = $pdo->query("SELECT COUNT(*) as count FROM benefits")->fetch();
    if ($benCheck['count'] == 0) {
        $seedBens = [
            ['Esquel Outdoors', 'Equipamiento outdoor', 'Todo para la travesía en un solo lugar: kayaks, chalecos, bolsas estancas, camping y pesca.', '20% OFF en alquiler de kayaks', 'Válido sobre el alquiler de K1, K2 y sit on top durante los días de la travesía. Reservá con 48 h de anticipación.', 'TRAVESIA26', 'Hasta el 13/12/2026', 'assets/auspiciantes/esquel-outdoors.webp', '', 1],
            ['Don Chiquino', 'Restaurante · Pastas', 'Pastas artesanales, carnes, postres y vinos en pleno centro de Esquel.', 'Postre y café de cortesía', 'Presentando el código de inscripción, por persona, en el menú de la noche.', 'REMEROS26', 'Diciembre 2026', 'assets/auspiciantes/don-chiquino.webp', '', 2],
            ['La Pulpería de Don Chiquino', 'Parrilla', 'Parrilla argentina con opciones veganas y ambiente acogedor.', '2x1 en entradas', 'De domingo a jueves, para grupos de hasta seis personas.', 'PULPERIA2X1', 'Diciembre 2026', 'assets/auspiciantes/la-pulperia.webp', '', 3],
            ['La Fiambrería de Esquel', 'Fiambrería · Vinoteca', 'Fiambres, quesos y vinoteca para armar la picada del campamento.', '15% OFF en picadas armadas', 'En tablas medianas y grandes abonando en efectivo o transferencia.', 'TABLA26', 'Hasta el 15/12/2026', 'assets/auspiciantes/la-fiambreria.webp', '', 4]
        ];

        $insBen = $pdo->prepare("INSERT INTO benefits (prestador, rubro, descripcion, oferta, detalle, codigo, vigencia, logo_url, enlace, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        foreach ($seedBens as $b) {
            $insBen->execute($b);
        }
    }
}
