<?php
/* ==========================================================================
   TRAVESÍA EN KAYAK LOS ALERCES 2026 - FCE UNPSJB
   API REST Backend en PHP (Hostinger & Apache Compatible)
   ========================================================================== */

require_once __DIR__ . '/db.php';

// Headers CORS y JSON
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Auth-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getJsonInput() {
    $raw = @file_get_contents('php://input');
    if (empty($raw)) return [];
    $decoded = @json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

// ── Simple & Secure JWT Implementation in Pure PHP ─────────────────────────
function createJWT($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload['exp'] = time() + (86400 * 30); // 30 días
    $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    $signature = hash_hmac('sha256', $base64Header . '.' . $base64Payload, JWT_SECRET, true);
    $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    return $base64Header . '.' . $base64Payload . '.' . $base64Signature;
}

function getAuthToken() {
    // 1. Cabeceras HTTP estándar y FastCGI
    $auth = '';
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (!empty($_SERVER['HTTP_X_AUTH_TOKEN'])) {
        $auth = $_SERVER['HTTP_X_AUTH_TOKEN'];
    } elseif (function_exists('getallheaders')) {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? $headers['X-Auth-Token'] ?? '';
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (preg_match('/Bearer\s(\S+)/i', $auth, $m)) {
        return $m[1];
    }
    if (!empty($auth) && substr_count($auth, '.') === 2) {
        return trim($auth);
    }

    // 2. Parámetro GET ?token= o ?auth=
    if (!empty($_GET['token'])) {
        return trim($_GET['token']);
    }
    if (!empty($_GET['auth'])) {
        return trim($_GET['auth']);
    }

    // 3. Fallback en payload JSON si aplica
    $input = getJsonInput();
    if (!empty($input['token'])) {
        return trim($input['token']);
    }

    return '';
}

function verifyJWT() {
    $jwt = getAuthToken();
    if (empty($jwt)) {
        jsonResponse(['error' => 'Token no proporcionado'], 401);
    }
    $tokenParts = explode('.', $jwt);
    if (count($tokenParts) !== 3) {
        jsonResponse(['error' => 'Token inválido'], 401);
    }
    list($header64, $payload64, $sig64) = $tokenParts;
    $validSig = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(hash_hmac('sha256', $header64 . '.' . $payload64, JWT_SECRET, true)));
    if (!hash_equals($validSig, $sig64)) {
        jsonResponse(['error' => 'Firma de token inválida'], 401);
    }
    $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload64)), true);
    if (!$payload || ($payload['exp'] ?? 0) < time()) {
        jsonResponse(['error' => 'Token expirado'], 401);
    }
    return $payload;
}

function checkPermission($reqUser, $permissionKey) {
    if (($reqUser['role'] ?? '') === 'ADMIN') return true;
    $perms = $reqUser['permissions'] ?? [];
    if (is_string($perms)) {
        $perms = json_decode($perms, true) ?: [];
    }
    if (!empty($perms[$permissionKey])) return true;
    jsonResponse(['error' => "Permiso insuficiente: requiere '$permissionKey'"], 403);
}

// ── Routing Logic ──────────────────────────────────────────────────────────
$db = getDB();
$method = strtoupper($_SERVER['REQUEST_METHOD']);
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Normalize path to remove /api or subdirectories
$path = preg_replace('#^.*?api/?#i', '', $uri);
$path = trim($path, '/');
$parts = array_values(array_filter(explode('/', $path), 'strlen'));

// --------------------------------------------------------------------------
// 1. PUBLIC ROUTES
// --------------------------------------------------------------------------

// GET /api/config/precio
if ($path === 'config/precio' && $method === 'GET') {
    $stmt = $db->query("SELECT cfg_key, cfg_value FROM config");
    $configs = [];
    while ($row = $stmt->fetch()) {
        $configs[$row['cfg_key']] = $row['cfg_value'];
    }

    $cupoMaximo = intval($configs['cupo_maximo'] ?? 100);
    $habilitadasManual = (($configs['inscripciones_habilitadas'] ?? '1') !== '0');

    $cntStmt = $db->query("SELECT COUNT(*) as totalInscriptos FROM enrollments WHERE estado != 'RECHAZADO'");
    $totalInscriptos = intval($cntStmt->fetch()['totalInscriptos'] ?? 0);

    $cuposDisponibles = max(0, $cupoMaximo - $totalInscriptos);
    $cupoLleno = $totalInscriptos >= $cupoMaximo;
    $habilitadas = $habilitadasManual && !$cupoLleno;

    $motivoCierre = null;
    if (!$habilitadasManual) $motivoCierre = 'manual';
    elseif ($cupoLleno) $motivoCierre = 'cupo_completo';

    jsonResponse([
        'monto' => $configs['precio_monto'] ?? '100.000',
        'texto' => $configs['precio_texto'] ?? 'Cien mil pesos',
        'instrucciones' => $configs['precio_instrucciones'] ?? 'El costo de inscripción es de $100.000 (Cien mil pesos). Adjuntá el comprobante.',
        'cupoMaximo' => $cupoMaximo,
        'totalInscriptos' => $totalInscriptos,
        'cuposDisponibles' => $cuposDisponibles,
        'habilitadas' => $habilitadas,
        'motivoCierre' => $motivoCierre,
        'mensajeCierre' => $configs['mensaje_cierre'] ?? 'Cupos completos para la edición 2026. Muchas gracias.'
    ]);
}

// POST /api/inscribirse
if ($path === 'inscribirse' && $method === 'POST') {
    $input = getJsonInput();
    $nombre = trim($input['nombre'] ?? '');
    $apellido = trim($input['apellido'] ?? '');
    $dni = trim($input['dni'] ?? '');
    $email = trim($input['email'] ?? '');
    $telefono = trim($input['telefono'] ?? '');
    $localidad = trim($input['localidad'] ?? 'Esquel');
    $tipoKayak = trim($input['tipoKayak'] ?? 'K1');
    $experiencia = trim($input['experiencia'] ?? 'Principiante');
    $contactoEmergencia = trim($input['contactoEmergencia'] ?? 'N/D');
    $observaciones = trim($input['observaciones'] ?? '');
    $declaracionSalud = !empty($input['declaracionSalud']) ? 1 : 0;
    $declaracionImagen = !empty($input['declaracionImagen']) ? 1 : 0;
    $comprobante = $input['comprobante'] ?? '';
    $comprobanteNombre = $input['comprobanteNombre'] ?? '';

    if (!$nombre || !$apellido || !$dni || !$email || !$telefono) {
        jsonResponse(['error' => 'Nombre, Apellido, DNI, Email y Teléfono son obligatorios.'], 400);
    }
    if (!$declaracionSalud) {
        jsonResponse(['error' => 'Falta aceptar la declaración de aptitud física y salud.'], 400);
    }
    if (!$comprobante) {
        jsonResponse(['error' => 'El adjunto del comprobante de transferencia es obligatorio.'], 400);
    }

    // Verificar cupo y habilitación
    $stmt = $db->query("SELECT cfg_key, cfg_value FROM config");
    $cfg = [];
    while ($r = $stmt->fetch()) $cfg[$r['cfg_key']] = $r['cfg_value'];

    if (($cfg['inscripciones_habilitadas'] ?? '1') === '0') {
        jsonResponse(['error' => $cfg['mensaje_cierre'] ?? 'Las inscripciones se encuentran temporalmente cerradas o en pausa.'], 403);
    }

    $cupoMax = intval($cfg['cupo_maximo'] ?? 100);
    $cntStmt = $db->query("SELECT COUNT(*) as count FROM enrollments WHERE estado != 'RECHAZADO'");
    $curCount = intval($cntStmt->fetch()['count'] ?? 0);

    if ($curCount >= $cupoMax) {
        jsonResponse(['error' => "Se ha completado el cupo máximo de inscripciones ($cupoMax participantes)."], 403);
    }

    $code = 'KA-' . mt_rand(100000, 999999);

    $ins = $db->prepare("
        INSERT INTO enrollments (code, nombre, apellido, dni, email, telefono, localidad, tipo_kayak, experiencia, contacto_emergencia, observaciones, declaracion_salud, declaracion_imagen, comprobante, comprobante_nombre, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE')
    ");
    $ins->execute([$code, $nombre, $apellido, $dni, $email, $telefono, $localidad, $tipoKayak, $experiencia, $contactoEmergencia, $observaciones, $declaracionSalud, $declaracionImagen, $comprobante, $comprobanteNombre]);

    jsonResponse([
        'message' => 'Inscripción registrada con éxito',
        'code' => $code,
        'nombre' => "$nombre $apellido",
        'estado' => 'PENDIENTE'
    ], 201);
}

// GET /api/blog
if ($path === 'blog' && $method === 'GET') {
    $stmt = $db->query("SELECT id, titulo, slug, resumen, imagen_url, categoria, creado_at FROM posts WHERE publicado = 1 ORDER BY creado_at DESC");
    jsonResponse($stmt->fetchAll());
}

// GET /api/blog/{slug}
if (count($parts) === 2 && $parts[0] === 'blog' && $method === 'GET') {
    $slug = $parts[1];
    $stmt = $db->prepare("SELECT * FROM posts WHERE slug = ? AND publicado = 1");
    $stmt->execute([$slug]);
    $post = $stmt->fetch();
    if (!$post) jsonResponse(['error' => 'Noticia no encontrada'], 404);
    jsonResponse($post);
}

// GET /api/beneficios
if ($path === 'beneficios' && $method === 'GET') {
    $stmt = $db->query("SELECT id, prestador, rubro, descripcion, oferta, detalle, codigo, vigencia, logo_url, enlace FROM benefits WHERE activo = 1 ORDER BY orden ASC, id ASC");
    jsonResponse($stmt->fetchAll());
}

// --------------------------------------------------------------------------
// 2. ADMIN AUTHENTICATION
// --------------------------------------------------------------------------

// POST /api/admin/login
if ($path === 'admin/login' && $method === 'POST') {
    $input = getJsonInput();
    $email = trim($input['email'] ?? '');
    $pass = $input['password'] ?? '';

    if (!$email || !$pass) jsonResponse(['error' => 'Email y contraseña requeridos'], 400);

    $stmt = ($email === 'admin' || $email === 'admin@economicasunp.edu.ar')
        ? $db->prepare("SELECT * FROM users WHERE email = 'admin@economicasunp.edu.ar' OR email = 'admin'")
        : $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute($stmt->queryString === "SELECT * FROM users WHERE email = ?" ? [$email] : []);
    $user = $stmt->fetch();

    if (!$user || !password_verify($pass, $user['password'])) {
        jsonResponse(['error' => 'Credenciales inválidas'], 401);
    }

    $perms = json_decode($user['permissions'] ?: '{}', true) ?: [];
    $token = createJWT([
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'role' => $user['role'],
        'permissions' => $perms
    ]);

    jsonResponse([
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'name' => $user['name'],
            'role' => $user['role'],
            'permissions' => $perms
        ]
    ]);
}

// --------------------------------------------------------------------------
// 3. PROTECTED ADMIN ROUTES (Require JWT)
// --------------------------------------------------------------------------
$user = verifyJWT();

// GET /api/admin/me
if ($path === 'admin/me' && $method === 'GET') {
    jsonResponse(['user' => $user]);
}

// GET /api/admin/inscripciones
if ($path === 'admin/inscripciones' && $method === 'GET') {
    checkPermission($user, 'ver_inscriptos');
    $search = trim($_GET['search'] ?? '');
    $estado = trim($_GET['estado'] ?? 'TODOS');

    $sql = "SELECT id, code, nombre, apellido, dni, email, telefono, localidad, tipo_kayak, experiencia, contacto_emergencia, observaciones, declaracion_salud, comprobante, comprobante_nombre, estado, creado_at FROM enrollments WHERE 1=1";
    $params = [];

    if ($estado !== 'TODOS' && !empty($estado)) {
        $sql .= " AND estado = ?";
        $params[] = $estado;
    }
    if (!empty($search)) {
        $sql .= " AND (nombre LIKE ? OR apellido LIKE ? OR dni LIKE ? OR code LIKE ? OR email LIKE ?)";
        $term = "%$search%";
        $params = array_merge($params, [$term, $term, $term, $term, $term]);
    }
    $sql .= " ORDER BY id DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

// PUT / PATCH / POST /api/admin/inscripciones/{id}
if (count($parts) >= 3 && $parts[0] === 'admin' && $parts[1] === 'inscripciones' && is_numeric($parts[2]) && in_array($method, ['PUT', 'PATCH', 'POST'])) {
    checkPermission($user, 'gestionar_inscriptos');
    $id = intval($parts[2]);
    $input = getJsonInput();
    $estado = strtoupper(trim($input['estado'] ?? 'PENDIENTE'));
    if (!in_array($estado, ['PENDIENTE', 'APROBADO', 'RECHAZADO'])) {
        jsonResponse(['error' => 'Estado inválido'], 400);
    }
    $stmt = $db->prepare("UPDATE enrollments SET estado = ? WHERE id = ?");
    $stmt->execute([$estado, $id]);
    jsonResponse(['message' => 'Estado actualizado', 'id' => $id, 'estado' => $estado]);
}

// DELETE / POST /api/admin/inscripciones/{id}
if (count($parts) >= 3 && $parts[0] === 'admin' && $parts[1] === 'inscripciones' && is_numeric($parts[2]) && in_array($method, ['DELETE'])) {
    checkPermission($user, 'gestionar_inscriptos');
    $id = intval($parts[2]);
    $stmt = $db->prepare("DELETE FROM enrollments WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['message' => 'Inscripción eliminada', 'id' => $id]);
}

// GET /api/admin/inscripciones/export/excel (CSV nativo con codificación Excel UTF-8 BOM)
if ($path === 'admin/inscripciones/export/excel' && $method === 'GET') {
    checkPermission($user, 'ver_inscriptos');
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="Inscriptos_Travesia_Los_Alerces_2026.csv"');
    
    // UTF-8 BOM para que Excel abra acentos perfectamente
    echo "\xEF\xBB\xBF";
    $output = fopen('php://output', 'w');
    fputcsv($output, ['Código', 'Nombre', 'Apellido', 'DNI', 'Email', 'Teléfono', 'Localidad', 'Kayak', 'Experiencia', 'Contacto Emergencia', 'Observaciones', 'Comprobante', 'Estado', 'Fecha Registro']);

    $stmt = $db->query("SELECT * FROM enrollments ORDER BY id ASC");
    while ($r = $stmt->fetch()) {
        fputcsv($output, [
            $r['code'], $r['nombre'], $r['apellido'], $r['dni'], $r['email'],
            $r['telefono'], $r['localidad'], $r['tipo_kayak'], $r['experiencia'],
            $r['contacto_emergencia'], $r['observaciones'],
            !empty($r['comprobante']) ? 'Adjunto' : 'Pendiente',
            $r['estado'], $r['creado_at']
        ]);
    }
    fclose($output);
    exit;
}

// GET /api/admin/config
if ($path === 'admin/config' && $method === 'GET') {
    $stmt = $db->query("SELECT cfg_key, cfg_value FROM config");
    $map = [];
    while ($r = $stmt->fetch()) $map[$r['cfg_key']] = $r['cfg_value'];

    $cnt = $db->query("SELECT COUNT(*) as total, SUM(CASE WHEN estado = 'APROBADO' THEN 1 ELSE 0 END) as aprobados, SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes FROM enrollments WHERE estado != 'RECHAZADO'")->fetch();

    jsonResponse([
        'precio_monto' => $map['precio_monto'] ?? '100.000',
        'precio_texto' => $map['precio_texto'] ?? 'Cien mil pesos',
        'precio_instrucciones' => $map['precio_instrucciones'] ?? 'El costo de inscripción es de $100.000 (Cien mil pesos)...',
        'cupo_maximo' => $map['cupo_maximo'] ?? '100',
        'inscripciones_habilitadas' => ($map['inscripciones_habilitadas'] ?? '1') !== '0' ? '1' : '0',
        'mensaje_cierre' => $map['mensaje_cierre'] ?? 'Cupos completos para la edición 2026.',
        'totalInscriptos' => intval($cnt['total'] ?? 0),
        'inscriptosAprobados' => intval($cnt['aprobados'] ?? 0),
        'inscriptosPendientes' => intval($cnt['pendientes'] ?? 0)
    ]);
}

// PUT / PATCH / POST /api/admin/config
if ($path === 'admin/config' && in_array($method, ['PUT', 'PATCH', 'POST'])) {
    $input = getJsonInput();
    try {
        foreach (['precio_monto', 'precio_texto', 'precio_instrucciones', 'cupo_maximo', 'inscripciones_habilitadas', 'mensaje_cierre'] as $k) {
            if (isset($input[$k])) {
                $db->prepare("INSERT OR REPLACE INTO config (cfg_key, cfg_value) VALUES (?, ?)")->execute([$k, (string)$input[$k]]);
            }
        }
    } catch (Exception $e) {
        foreach (['precio_monto', 'precio_texto', 'precio_instrucciones', 'cupo_maximo', 'inscripciones_habilitadas', 'mensaje_cierre'] as $k) {
            if (isset($input[$k])) {
                $db->prepare("REPLACE INTO config (cfg_key, cfg_value) VALUES (?, ?)")->execute([$k, (string)$input[$k]]);
            }
        }
    }
    jsonResponse(['message' => 'Configuración actualizada con éxito']);
}

// ABM Blog Noticias
if ($path === 'admin/posts' && $method === 'GET') {
    checkPermission($user, 'gestion_noticias');
    jsonResponse($db->query("SELECT * FROM posts ORDER BY id DESC")->fetchAll());
}
if ($path === 'admin/posts' && $method === 'POST') {
    checkPermission($user, 'gestion_noticias');
    $i = getJsonInput();
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $i['titulo'] ?? 'noticia'), '-')) . '-' . substr(time(), -4);
    $ins = $db->prepare("INSERT INTO posts (titulo, slug, resumen, contenido, imagen_url, categoria, publicado) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $ins->execute([$i['titulo'] ?? '', $slug, $i['resumen'] ?? '', $i['contenido'] ?? '', $i['imagenUrl'] ?? 'assets/gallery-1.jpg', $i['categoria'] ?? 'Novedades', !empty($i['publicado']) ? 1 : 0]);
    jsonResponse(['message' => 'Artículo creado', 'id' => $db->lastInsertId(), 'slug' => $slug], 201);
}
if (count($parts) >= 3 && $parts[0] === 'admin' && $parts[1] === 'posts' && is_numeric($parts[2]) && in_array($method, ['PUT', 'PATCH', 'POST'])) {
    checkPermission($user, 'gestion_noticias');
    $i = getJsonInput();
    $upd = $db->prepare("UPDATE posts SET titulo = ?, resumen = ?, contenido = ?, imagen_url = ?, categoria = ?, publicado = ?, actualizado_at = CURRENT_TIMESTAMP WHERE id = ?");
    $upd->execute([$i['titulo'] ?? '', $i['resumen'] ?? '', $i['contenido'] ?? '', $i['imagenUrl'] ?? '', $i['categoria'] ?? 'Novedades', !empty($i['publicado']) ? 1 : 0, intval($parts[2])]);
    jsonResponse(['message' => 'Artículo actualizado']);
}
if (count($parts) >= 3 && $parts[0] === 'admin' && $parts[1] === 'posts' && is_numeric($parts[2]) && in_array($method, ['DELETE'])) {
    checkPermission($user, 'gestion_noticias');
    $db->prepare("DELETE FROM posts WHERE id = ?")->execute([intval($parts[2])]);
    jsonResponse(['message' => 'Artículo eliminado']);
}

// ABM Beneficios
if ($path === 'admin/beneficios' && $method === 'GET') {
    checkPermission($user, 'gestion_beneficios');
    jsonResponse($db->query("SELECT * FROM benefits ORDER BY orden ASC, id ASC")->fetchAll());
}
if ($path === 'admin/beneficios' && $method === 'POST') {
    checkPermission($user, 'gestion_beneficios');
    $i = getJsonInput();
    $ins = $db->prepare("INSERT INTO benefits (prestador, rubro, descripcion, oferta, detalle, codigo, vigencia, logo_url, enlace, orden, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $ins->execute([$i['prestador'] ?? '', $i['rubro'] ?? '', $i['descripcion'] ?? '', $i['oferta'] ?? '', $i['detalle'] ?? '', $i['codigo'] ?? '', $i['vigencia'] ?? '', $i['logoUrl'] ?? '', $i['enlace'] ?? '', intval($i['orden'] ?? 0), !empty($i['activo']) ? 1 : 0]);
    jsonResponse(['message' => 'Beneficio creado', 'id' => $db->lastInsertId()], 201);
}
if (count($parts) >= 3 && $parts[0] === 'admin' && $parts[1] === 'beneficios' && is_numeric($parts[2]) && in_array($method, ['PUT', 'PATCH', 'POST'])) {
    checkPermission($user, 'gestion_beneficios');
    $i = getJsonInput();
    $upd = $db->prepare("UPDATE benefits SET prestador = ?, rubro = ?, descripcion = ?, oferta = ?, detalle = ?, codigo = ?, vigencia = ?, logo_url = ?, enlace = ?, orden = ?, activo = ?, actualizado_at = CURRENT_TIMESTAMP WHERE id = ?");
    $upd->execute([$i['prestador'] ?? '', $i['rubro'] ?? '', $i['descripcion'] ?? '', $i['oferta'] ?? '', $i['detalle'] ?? '', $i['codigo'] ?? '', $i['vigencia'] ?? '', $i['logoUrl'] ?? '', $i['enlace'] ?? '', intval($i['orden'] ?? 0), !empty($i['activo']) ? 1 : 0, intval($parts[2])]);
    jsonResponse(['message' => 'Beneficio actualizado']);
}
if (count($parts) >= 3 && $parts[0] === 'admin' && $parts[1] === 'beneficios' && is_numeric($parts[2]) && in_array($method, ['DELETE'])) {
    checkPermission($user, 'gestion_beneficios');
    $db->prepare("DELETE FROM benefits WHERE id = ?")->execute([intval($parts[2])]);
    jsonResponse(['message' => 'Beneficio eliminado']);
}

// ABM Usuarios
if ($path === 'admin/users' && $method === 'GET') {
    checkPermission($user, 'gestion_usuarios');
    $stmt = $db->query("SELECT id, email, name, role, permissions, created_at FROM users ORDER BY id ASC");
    $users = [];
    while ($r = $stmt->fetch()) {
        $r['permissions'] = json_decode($r['permissions'] ?: '{}', true) ?: [];
        $users[] = $r;
    }
    jsonResponse($users);
}
if ($path === 'admin/users' && $method === 'POST') {
    checkPermission($user, 'gestion_usuarios');
    $i = getJsonInput();
    $hash = password_hash($i['password'] ?? 'admin123', PASSWORD_BCRYPT);
    $perms = is_array($i['permissions']) ? json_encode($i['permissions']) : '{}';
    $ins = $db->prepare("INSERT INTO users (email, password, name, role, permissions) VALUES (?, ?, ?, ?, ?)");
    $ins->execute([$i['email'] ?? '', $hash, $i['name'] ?? '', $i['role'] ?? 'EDITOR', $perms]);
    jsonResponse(['message' => 'Usuario creado', 'id' => $db->lastInsertId()], 201);
}
if (count($parts) >= 3 && $parts[0] === 'admin' && $parts[1] === 'users' && is_numeric($parts[2]) && in_array($method, ['PUT', 'PATCH', 'POST'])) {
    checkPermission($user, 'gestion_usuarios');
    $id = intval($parts[2]);
    $i = getJsonInput();
    $perms = is_array($i['permissions']) ? json_encode($i['permissions']) : '{}';
    if (!empty($i['password'])) {
        $hash = password_hash($i['password'], PASSWORD_BCRYPT);
        $upd = $db->prepare("UPDATE users SET email = ?, name = ?, role = ?, permissions = ?, password = ? WHERE id = ?");
        $upd->execute([$i['email'] ?? '', $i['name'] ?? '', $i['role'] ?? 'EDITOR', $perms, $hash, $id]);
    } else {
        $upd = $db->prepare("UPDATE users SET email = ?, name = ?, role = ?, permissions = ? WHERE id = ?");
        $upd->execute([$i['email'] ?? '', $i['name'] ?? '', $i['role'] ?? 'EDITOR', $perms, $id]);
    }
    jsonResponse(['message' => 'Usuario actualizado']);
}
if (count($parts) >= 3 && $parts[0] === 'admin' && $parts[1] === 'users' && is_numeric($parts[2]) && in_array($method, ['DELETE'])) {
    checkPermission($user, 'gestion_usuarios');
    $id = intval($parts[2]);
    $db->prepare("DELETE FROM users WHERE id = ? AND email != 'admin@economicasunp.edu.ar' AND email != 'admin'")->execute([$id]);
    jsonResponse(['message' => 'Usuario eliminado']);
}

// 404 Default
jsonResponse(['error' => "Ruta API no encontrada: $method /api/$path"], 404);
