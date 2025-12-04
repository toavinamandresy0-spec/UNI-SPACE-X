<?php
class AuthMiddleware {
    private $conn;
    private $userModel;

    public function __construct($db) {
        $this->conn = $db;
        $this->userModel = new UserModel($db);
    }

    public function authenticate() {
        $token = $this->getBearerToken();
        
        if (!$token) {
            $this->sendUnauthorized('Token d\'authentification manquant');
        }
        
        $userData = $this->userModel->validateToken($token);
        
        if (!$userData) {
            $this->sendUnauthorized('Token invalide ou expiré');
        }
        
        return $userData;
    }

    public function optionalAuth() {
        $token = $this->getBearerToken();
        
        if ($token) {
            return $this->userModel->validateToken($token);
        }
        
        return null;
    }

    public function requireAccessLevel($requiredLevel) {
        $userData = $this->authenticate();
        
        if ($userData['access_level'] < $requiredLevel) {
            $this->sendForbidden('Niveau d\'accès insuffisant');
        }
        
        return $userData;
    }

    public function requireOwnership($resourceUserId) {
        $userData = $this->authenticate();
        
        if ($userData['user_id'] != $resourceUserId && $userData['access_level'] < ACCESS_LEVEL_ADMIN) {
            $this->sendForbidden('Accès non autorisé à cette ressource');
        }
        
        return $userData;
    }

    private function getBearerToken() {
        $headers = $this->getAuthorizationHeader();
        
        if (!empty($headers)) {
            if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
                return $matches[1];
            }
        }
        
        return null;
    }

    private function getAuthorizationHeader() {
        $headers = null;
        
        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER['Authorization']);
        } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers = trim($_SERVER['HTTP_AUTHORIZATION']);
        } else if (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(
                array_map('ucwords', array_keys($requestHeaders)), 
                array_values($requestHeaders)
            );
            
            if (isset($requestHeaders['Authorization'])) {
                $headers = trim($requestHeaders['Authorization']);
            }
        }
        
        return $headers;
    }

    private function sendUnauthorized($message) {
        http_response_code(API_UNAUTHORIZED);
        echo json_encode([
            'success' => false,
            'error' => [
                'code' => API_UNAUTHORIZED,
                'message' => $message,
                'timestamp' => date('c')
            ]
        ]);
        exit;
    }

    private function sendForbidden($message) {
        http_response_code(API_FORBIDDEN);
        echo json_encode([
            'success' => false,
            'error' => [
                'code' => API_FORBIDDEN,
                'message' => $message,
                'timestamp' => date('c')
            ]
        ]);
        exit;
    }

    public function validateApiKey() {
        $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? null;
        
        if (!$apiKey) {
            $this->sendUnauthorized('Clé API manquante');
        }
        
        // Valider la clé API (implémentation à adapter)
        $validApiKeys = [
            'spatial_research_2024' => ['access_level' => ACCESS_LEVEL_RESEARCHER],
            'quantum_lab_2024' => ['access_level' => ACCESS_LEVEL_SCIENTIST]
        ];
        
        if (!isset($validApiKeys[$apiKey])) {
            $this->sendUnauthorized('Clé API invalide');
        }
        
        return $validApiKeys[$apiKey];
    }

    public function rateLimit($identifier, $maxRequests = 100, $timeWindow = 3600) {
        $key = "rate_limit:" . $identifier;
        $now = time();
        
        // Implémentation basique du rate limiting
        // Dans une application réelle, utiliser Redis ou Memcached
        
        $requests = $_SESSION['rate_limits'][$key] ?? [];
        
        // Nettoyer les requêtes anciennes
        $requests = array_filter($requests, function($timestamp) use ($now, $timeWindow) {
            return $timestamp > ($now - $timeWindow);
        });
        
        if (count($requests) >= $maxRequests) {
            $this->sendRateLimitExceeded();
        }
        
        $requests[] = $now;
        $_SESSION['rate_limits'][$key] = $requests;
        
        // Headers de rate limiting
        header('X-RateLimit-Limit: ' . $maxRequests);
        header('X-RateLimit-Remaining: ' . ($maxRequests - count($requests)));
        header('X-RateLimit-Reset: ' . ($now + $timeWindow));
    }

    private function sendRateLimitExceeded() {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => [
                'code' => 429,
                'message' => 'Trop de requêtes. Veuillez réessayer plus tard.',
                'timestamp' => date('c')
            ]
        ]);
        exit;
    }
}
?>