<?php
class DatabaseConfig {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $port;
    public $conn;

    public function __construct() {
        $this->host = getenv('DB_HOST') ?: 'localhost';
        $this->db_name = getenv('DB_NAME') ?: 'spatial_research';
        $this->username = getenv('DB_USER') ?: 'research_user';
        $this->password = getenv('DB_PASS') ?: 'secure_password_2024';
        $this->port = getenv('DB_PORT') ?: '3306';
    }

    public function getConnection() {
        $this->conn = null;
        
        try {
            $dsn = "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ]);
            
        } catch(PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());
            throw new Exception("Database connection failed");
        }

        return $this->conn;
    }

    public function testConnection() {
        try {
            $conn = $this->getConnection();
            return $conn->query("SELECT 1")->fetch();
        } catch (Exception $e) {
            return false;
        }
    }
}

// Configuration pour différents environnements
class EnvironmentConfig {
    const DEVELOPMENT = 'dev';
    const PRODUCTION = 'prod';
    const TESTING = 'test';

    public static function getConfig($environment = self::DEVELOPMENT) {
        $configs = [
            self::DEVELOPMENT => [
                'debug' => true,
                'cors_origins' => ['http://localhost:3000', 'http://127.0.0.1:3000'],
                'max_file_size' => 100 * 1024 * 1024, // 100MB
                'api_rate_limit' => 1000
            ],
            self::PRODUCTION => [
                'debug' => false,
                'cors_origins' => ['https://votre-domaine.com'],
                'max_file_size' => 50 * 1024 * 1024, // 50MB
                'api_rate_limit' => 100
            ],
            self::TESTING => [
                'debug' => true,
                'cors_origins' => ['*'],
                'max_file_size' => 10 * 1024 * 1024, // 10MB
                'api_rate_limit' => 10000
            ]
        ];

        return $configs[$environment] ?? $configs[self::DEVELOPMENT];
    }
}
?>