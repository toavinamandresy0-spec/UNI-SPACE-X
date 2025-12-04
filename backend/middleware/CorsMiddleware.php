<?php
class CorsMiddleware {
    
    public function handle($allowedOrigins = [], $allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        // Déterminer l'origine autorisée
        if (in_array('*', $allowedOrigins)) {
            header('Access-Control-Allow-Origin: *');
        } else if (in_array($origin, $allowedOrigins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }
        
        // Gérer les requêtes preflight OPTIONS
        if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
            header('Access-Control-Allow-Methods: ' . implode(', ', $allowedMethods));
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-API-Key');
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Max-Age: 86400');
            header('Content-Length: 0');
            http_response_code(200);
            exit;
        }
        
        // Headers pour les requêtes normales
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Expose-Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');
    }
    
    public function setCorsHeaders() {
        $config = EnvironmentConfig::getConfig();
        $this->handle($config['cors_origins']);
    }
}
?>