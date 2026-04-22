<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['msg'])) {
    http_response_code(400);
    echo json_encode(["error" => "Message is required"]);
    exit;
}

$sip = $data['sip'] ?? 'unknown';
$msg = $data['msg'];
$type = strtoupper($data['type'] ?? 'info');

$date = date("Y-m-d");
$time = date("H:i:s");

// Ensure directory exists - moving OUTSIDE of dist to avoid deletion on build
$logsDir = dirname(__DIR__) . "/logs/daily";
if (!file_exists($logsDir)) {
    if (!mkdir($logsDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to create directory: $logsDir", "user" => posix_getpwuid(posix_geteuid())['name']]);
        exit;
    }
    // Auto-create .htaccess for security
    file_put_contents(dirname($logsDir) . "/.htaccess", "Deny from all");
}

if (!is_writable($logsDir)) {
    http_response_code(500);
    echo json_encode(["error" => "Directory is not writable: $logsDir", "user" => posix_getpwuid(posix_geteuid())['name']]);
    exit;
}

$filename = "{$sip}_{$date}.log";
$filePath = "{$logsDir}/{$filename}";

$logEntry = "[{$time}] [{$type}] {$msg}" . PHP_EOL;

if (file_put_contents($filePath, $logEntry, FILE_APPEND)) {
    echo json_encode(["status" => "success", "file" => $filename]);
} else {
    $error = error_get_last();
    http_response_code(500);
    echo json_encode(["error" => "Failed to write log", "details" => $error['message']]);
}
?>