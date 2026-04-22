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

// Ensure directory exists
$logsDir = __DIR__ . "/logs/daily";
if (!file_exists($logsDir)) {
    mkdir($logsDir, 0777, true);
}

$filename = "{$sip}_{$date}.log";
$filePath = "{$logsDir}/{$filename}";

$logEntry = "[{$time}] [{$type}] {$msg}" . PHP_EOL;

if (file_put_contents($filePath, $logEntry, FILE_APPEND)) {
    echo json_encode(["status" => "success"]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to write log"]);
}
?>