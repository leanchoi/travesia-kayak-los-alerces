-- ============================================================================
-- BASE DE DATOS MYSQL PARA HOSTINGER
-- Proyecto: Travesía y Bajada de Kayak Los Alerces 2026 - FCE UNPSJB
-- ============================================================================

-- 1. Tabla de Usuarios Administradores
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(190) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'EDITOR',
  `permissions` LONGTEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuario Administrador Inicial: admin@economicasunp.edu.ar / admin123 (o usuario 'admin')
INSERT INTO `users` (`email`, `password`, `name`, `role`, `permissions`)
VALUES ('admin@economicasunp.edu.ar', '$2y$10$tMh4Gf9vK2c7fJd6YpL.U.B8n3b7Ew9oF6y9Z8c7fJd6YpL.U.B8n', 'Administrador (Admin)', 'ADMIN', '{\"ver_inscriptos\":true,\"gestionar_inscriptos\":true,\"gestion_noticias\":true,\"gestion_beneficios\":true,\"gestion_usuarios\":true}')
ON DUPLICATE KEY UPDATE `role` = 'ADMIN';

-- 2. Tabla de Configuración Dinámica (Precios, Cupos, Promociones y Convocatoria)
CREATE TABLE IF NOT EXISTS `config` (
  `cfg_key` VARCHAR(100) PRIMARY KEY,
  `cfg_value` LONGTEXT NOT NULL,
  `actualizado_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `config` (`cfg_key`, `cfg_value`) VALUES
('precio_monto', '100.000'),
('precio_texto', 'Cien mil pesos'),
('precio_instrucciones', 'El costo de inscripción para la Travesía en Kayaks 2026 es de $100.000 (Cien mil pesos). Adjuntá la foto o captura legible del comprobante de transferencia bancaria de la reserva o pago completo.'),
('cupo_maximo', '100'),
('inscripciones_habilitadas', '1'),
('mensaje_cierre', 'Cupos completos para la edición 2026. Muchas gracias a todos los remeros por sumarse a la travesía. Seguinos en nuestras redes oficiales para novedades o lista de espera.')
ON DUPLICATE KEY UPDATE `cfg_value` = VALUES(`cfg_value`);

-- 3. Tabla de Inscripciones de Remeros
CREATE TABLE IF NOT EXISTS `enrollments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `nombre` VARCHAR(150) NOT NULL,
  `apellido` VARCHAR(150) NOT NULL,
  `dni` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `telefono` VARCHAR(100) NOT NULL,
  `localidad` VARCHAR(150) NOT NULL,
  `tipo_kayak` VARCHAR(100) NOT NULL,
  `experiencia` VARCHAR(100) NOT NULL,
  `contacto_emergencia` VARCHAR(255) NOT NULL,
  `observaciones` LONGTEXT,
  `declaracion_salud` INT DEFAULT 1,
  `declaracion_imagen` INT DEFAULT 1,
  `comprobante` LONGTEXT,
  `comprobante_nombre` VARCHAR(255),
  `estado` VARCHAR(50) DEFAULT 'PENDIENTE',
  `creado_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de Artículos del Blog / Noticias
CREATE TABLE IF NOT EXISTS `posts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `titulo` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(190) NOT NULL UNIQUE,
  `resumen` LONGTEXT,
  `contenido` LONGTEXT NOT NULL,
  `imagen_url` LONGTEXT,
  `categoria` VARCHAR(100) DEFAULT 'Novedades',
  `publicado` INT DEFAULT 1,
  `creado_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `actualizado_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla de Beneficios para Remeros
CREATE TABLE IF NOT EXISTS `benefits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `prestador` VARCHAR(255) NOT NULL,
  `rubro` VARCHAR(150) NOT NULL,
  `descripcion` LONGTEXT,
  `oferta` LONGTEXT NOT NULL,
  `detalle` LONGTEXT,
  `codigo` VARCHAR(100),
  `vigencia` VARCHAR(150),
  `logo_url` LONGTEXT,
  `enlace` LONGTEXT,
  `orden` INT DEFAULT 0,
  `activo` INT DEFAULT 1,
  `creado_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `actualizado_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `benefits` (`prestador`, `rubro`, `descripcion`, `oferta`, `detalle`, `codigo`, `vigencia`, `logo_url`, `enlace`, `orden`, `activo`) VALUES
('Esquel Outdoors', 'Equipamiento outdoor', 'Todo para la travesía en un solo lugar: kayaks, chalecos, bolsas estancas, camping y pesca.', '20% OFF en alquiler de kayaks', 'Válido sobre el alquiler de K1, K2 y sit on top durante los días de la travesía. Reservá con 48 h de anticipación.', 'TRAVESIA26', 'Hasta el 13/12/2026', 'assets/auspiciantes/esquel-outdoors.webp', '', 1, 1),
('Don Chiquino', 'Restaurante · Pastas', 'Pastas artesanales, carnes, postres y vinos en pleno centro de Esquel.', 'Postre y café de cortesía', 'Presentando el código de inscripción, por persona, en el menú de la noche.', 'REMEROS26', 'Diciembre 2026', 'assets/auspiciantes/don-chiquino.webp', '', 2, 1),
('La Pulpería de Don Chiquino', 'Parrilla', 'Parrilla argentina con opciones veganas y ambiente acogedor.', '2x1 en entradas', 'De domingo a jueves, para grupos de hasta seis personas. No acumulable con otras promociones.', 'PULPERIA2X1', 'Diciembre 2026', 'assets/auspiciantes/la-pulperia.webp', '', 3, 1),
('La Fiambrería de Esquel', 'Fiambrería · Vinoteca', 'Fiambres, quesos y vinoteca para armar la picada del campamento.', '15% OFF en picadas armadas', 'En tablas medianas y grandes abonando en efectivo o transferencia.', 'TABLA26', 'Hasta el 15/12/2026', 'assets/auspiciantes/la-fiambreria.webp', '', 4, 1)
ON DUPLICATE KEY UPDATE `orden` = VALUES(`orden`);
