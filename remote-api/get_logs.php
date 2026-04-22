<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Directory where logs are stored (outside of dist)
$logsDir = dirname(__DIR__) . '/logs/daily';
$activities = [];

if (file_exists($logsDir)) {
    $files = scandir($logsDir);
    foreach ($files as $file) {
        if (pathinfo($file, PATHINFO_EXTENSION) === 'log') {
            // Filename format: {sip}_{date}.log
            $parts = explode('_', $file);
            if (count($parts) < 2) continue;
            
            $sip = $parts[0];
            $date = str_replace('.log', '', $parts[1]);
            
            $handle = fopen("{$logsDir}/{$file}", "r");
            if ($handle) {
                while (($line = fgets($handle)) !== false) {
                    // [13:05:22] [CALL] Message
                    if (preg_match('/\[(.*?)\] \[(.*?)\] (.*)/', $line, $matches)) {
                        $activities[] = [
                            "time" => $matches[1],
                            "type" => strtolower($matches[2]),
                            "msg" => "[{$sip}] " . trim($matches[3]),
                            "date" => $date,
                            "sip" => $sip
                        ];
                    }
                }
                fclose($handle);
            }
        }
    }
}

// Sort by date and time descending
usort($activities, function($a, $b) {
    $dateComp = strcmp($b['date'], $a['date']);
    if ($dateComp !== 0) return $dateComp;
    return strcmp($b['time'], $a['time']);
});

// Limit to 500
$activities = array_slice($activities, 0, 500);

echo json_encode(["history" => $activities]);
?>
