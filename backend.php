<?php
ini_set('display_errors', 0);
error_reporting(0);
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Content-Type: application/json");

// Función para obtener configuración de BD
function getDbConfig() {
    // Para GET, buscamos en el header X-DB-CONFIG
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_SERVER['HTTP_X_DB_CONFIG'])) {
        return json_decode($_SERVER['HTTP_X_DB_CONFIG'], true);
    }
    // Para POST, PUT, DELETE, la configuración viene en el body
    $data = json_decode(file_get_contents("php://input"), true);
    if (isset($data['dbConfig'])) {
        // Remover el campo dbConfig del array para que no interfiera en el procesamiento
        $config = $data['dbConfig'];
        unset($data['dbConfig']);
        // Volver a codificar los datos sin la configuración (para el uso posterior)
        file_put_contents("php://input", json_encode($data));
        return $config;
    }
    return null;
}

$dbConfig = getDbConfig();
if (!$dbConfig) {
    echo json_encode(["error" => "No se enviaron las credenciales de la Base de Datos"]);
    exit;
}

$servername = $dbConfig['host'];
$username = $dbConfig['user'];
$password = $dbConfig['pass'];
$dbname = $dbConfig['dbName'];

// Crear conexión
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    // Si la BD no existe, intentar crearla
    $connCreate = new mysqli($servername, $username, $password);
    if ($connCreate->connect_error) {
        die(json_encode(["error" => "Conexión fallida: " . $connCreate->connect_error]));
    }
    $sql = "CREATE DATABASE $dbname";
    if ($connCreate->query($sql) === TRUE) {
        $conn = new mysqli($servername, $username, $password, $dbname);
    } else {
        die(json_encode(["error" => "Error al crear la base de datos: " . $connCreate->error]));
    }
}
// Crear la tabla si no existe
$createTableSQL = "CREATE TABLE IF NOT EXISTS notas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    contenido TEXT NOT NULL
)";
if (!$conn->query($createTableSQL)) {
    echo json_encode(["error" => "Error al crear la tabla: " . $conn->error]);
    exit;
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        $sql = "SELECT * FROM notas ORDER BY id DESC";
        $result = $conn->query($sql);
        $notas = [];
        while ($row = $result->fetch_assoc()) {
            $notas[] = $row;
        }
        echo json_encode($notas);
        break;
    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        $titulo = $data['titulo'];
        $categoria = $data['categoria'];
        $contenido = $data['contenido'];
        
        $stmt = $conn->prepare("INSERT INTO notas (titulo, categoria, contenido) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $titulo, $categoria, $contenido);
        if ($stmt->execute()) {
            echo json_encode(["mensaje" => "Nota guardada", "id" => $stmt->insert_id]);
        } else {
            echo json_encode(["error" => "Error al guardar la nota: " . $stmt->error]);
        }
        break;
    case 'PUT':
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'];
        $titulo = $data['titulo'];
        $categoria = $data['categoria'];
        $contenido = $data['contenido'];
        
        $stmt = $conn->prepare("UPDATE notas SET titulo = ?, categoria = ?, contenido = ? WHERE id = ?");
        $stmt->bind_param("sssi", $titulo, $categoria, $contenido, $id);
        if ($stmt->execute()) {
            echo json_encode(["mensaje" => "Nota actualizada"]);
        } else {
            echo json_encode(["error" => "Error al actualizar la nota: " . $stmt->error]);
        }
        break;
    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'];
        
        $stmt = $conn->prepare("DELETE FROM notas WHERE id = ?");
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            echo json_encode(["mensaje" => "Nota eliminada"]);
        } else {
            echo json_encode(["error" => "Error al eliminar la nota: " . $stmt->error]);
        }
        break;
    default:
        echo json_encode(["error" => "Método no soportado"]);
}

$conn->close();
?>
