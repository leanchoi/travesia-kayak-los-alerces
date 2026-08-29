# 🛶 Despliegue en Hostinger - Travesía Kayak Los Alerces 2026

Este proyecto está optimizado para funcionar directamente en el servicio de **Web Hosting de Hostinger (PHP / HTML / MySQL)** mediante la herramienta integrada **GIT de Hostinger**.

---

## 🚀 Pasos para Publicar en Hostinger

### 1. Conectar el Repositorio de GitHub en Hostinger
1. Ingresá a tu panel **hPanel de Hostinger**.
2. Seleccioná el sitio web o dominio donde querés alojar la página.
3. En el menú lateral izquierdo, buscá la sección **Avanzado** -> **Git**.
4. Completá los campos:
   - **URL del repositorio:** `https://github.com/leanchoi/travesia-kayak-hostinger.git`
   - **Rama (Branch):** `main`
   - **Directorio de instalación:** dejalo vacío o `/` (para que se instale directamente en `public_html`).
5. Hacé clic en **Crear** y luego en **Desplegar (Deploy)**.

---

### 2. Base de Datos MySQL (Opcional pero Recomendado para Producción)

El proyecto viene con **soporte automático dual**:
- Si no configurás MySQL, utiliza automáticamente una base local **SQLite** sin necesidad de tocar nada.
- Si querés conectar tu base de datos **MySQL de Hostinger**, seguí estos 2 pasos:

#### Paso A: Crear la Base en Hostinger
1. En tu hPanel, andá a **Bases de datos** -> **Bases de datos MySQL**.
2. Creá una base nueva, por ejemplo:
   - Nombre de la base: `u123456789_travesia`
   - Usuario: `u123456789_admin`
   - Contraseña: `TuContraseñaSegura123`

#### Paso B: Cargar los datos en `api/db.php`
Abrí el archivo `api/db.php` (desde GitHub o desde el Administrador de Archivos de Hostinger) y completá las líneas:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'u123456789_travesia');  // Tu nombre de base de datos
define('DB_USER', 'u123456789_admin');     // Tu usuario de base de datos
define('DB_PASS', 'TuContraseñaSegura123'); // Tu contraseña
```

*(Opcional: Si querés importar la estructura inicial manualmente, podés importar el archivo `database_schema_hostinger.sql` desde **phpMyAdmin**).*

---

## 🔑 Acceso al Panel de Administración

Una vez desplegada la web, podés entrar al panel de administración:
1. Tocá el ícono del candado 🔒 en el pie de página (o ingresá con tu usuario).
2. Credenciales por defecto:
   - **Usuario / Email:** `admin` o `admin@economicasunp.edu.ar`
   - **Contraseña:** `admin123`

---

## 🔄 Flujo de Actualizaciones Futuras con Antigravity

Cada vez que me pidas un cambio o mejora:
1. Yo actualizo y subo los cambios directamente al repositorio de GitHub `leanchoi/travesia-kayak-hostinger`.
2. En tu panel de Hostinger (sección **Git**), simplemente hacés clic en **Implementar (Deploy)** (o podés configurar el Webhook automático para que se actualice solo al hacer push).
