<?php
define('APP_VERSION', '1.0.0');
define('APP_BUILD', '2024.01.15');

// Constantes physiques
define('GRAVITATIONAL_CONSTANT', 6.67430e-11); // m³ kg⁻¹ s⁻²
define('SPEED_OF_LIGHT', 299792458); // m/s
define('PLANCK_CONSTANT', 6.62607015e-34); // J⋅s
define('BOLTZMANN_CONSTANT', 1.380649e-23); // J/K
define('EARTH_MASS', 5.9722e24); // kg
define('EARTH_RADIUS', 6371000); // m
define('STANDARD_GRAVITY', 9.80665); // m/s²

// Unités de conversion
define('KM_TO_M', 1000);
define('M_TO_KM', 0.001);
define('DEG_TO_RAD', M_PI / 180);
define('RAD_TO_DEG', 180 / M_PI);
define('HOURS_TO_SECONDS', 3600);
define('DAYS_TO_SECONDS', 86400);

// Paramètres orbitaux
define('LOW_EARTH_ORBIT_ALTITUDE', 200000); // 200 km en mètres
define('GEOSTATIONARY_ORBIT_ALTITUDE', 35786000); // 35,786 km en mètres
define('ESCAPE_VELOCITY_EARTH', 11200); // m/s

// Codes d'erreur API
define('API_SUCCESS', 200);
define('API_BAD_REQUEST', 400);
define('API_UNAUTHORIZED', 401);
define('API_FORBIDDEN', 403);
define('API_NOT_FOUND', 404);
define('API_METHOD_NOT_ALLOWED', 405);
define('API_VALIDATION_ERROR', 422);
define('API_SERVER_ERROR', 500);

// Types de simulation
define('SIM_TYPE_ORBITAL', 'orbital');
define('SIM_TYPE_QUANTUM', 'quantum');
define('SIM_TYPE_LAUNCH', 'launch');
define('SIM_TYPE_INTERSTELLAR', 'interstellar');

// Formats d'export
define('EXPORT_CSV', 'csv');
define('EXPORT_JSON', 'json');
define('EXPORT_XML', 'xml');
define('EXPORT_PDF', 'pdf');
define('EXPORT_EXCEL', 'xlsx');

// États de simulation
define('SIM_STATUS_DRAFT', 'draft');
define('SIM_STATUS_RUNNING', 'running');
define('SIM_STATUS_COMPLETED', 'completed');
define('SIM_STATUS_FAILED', 'failed');
define('SIM_STATUS_PAUSED', 'paused');

// Niveaux d'accès
define('ACCESS_LEVEL_VIEWER', 1);
define('ACCESS_LEVEL_RESEARCHER', 2);
define('ACCESS_LEVEL_SCIENTIST', 3);
define('ACCESS_LEVEL_ADMIN', 4);

// Tailles maximales
define('MAX_SIMULATION_NAME_LENGTH', 255);
define('MAX_DESCRIPTION_LENGTH', 2000);
define('MAX_PARAMETERS_SIZE', 16777215); // 16MB pour les données JSON

// Chemins de fichiers
define('EXPORT_BASE_PATH', __DIR__ . '/../data/exports/');
define('UPLOAD_BASE_PATH', __DIR__ . '/../data/uploads/');
define('BACKUP_BASE_PATH', __DIR__ . '/../data/backups/');

// Configuration de sécurité
define('ENCRYPTION_METHOD', 'AES-256-CBC');
define('HASH_ALGORITHM', 'sha256');
define('TOKEN_EXPIRY', 3600); // 1 heure en secondes

// Configuration des performances
define('MAX_CONCURRENT_SIMULATIONS', 5);
define('SIMULATION_TIMEOUT', 300); // 5 minutes
define('QUERY_TIMEOUT', 30); // 30 secondes

class ResearchConstants {
    // Domaines de recherche
    const DOMAIN_PROPULSION = 'propulsion';
    const DOMAIN_MATERIALS = 'materials';
    const DOMAIN_QUANTUM = 'quantum';
    const DOMAIN_AI = 'artificial_intelligence';
    const DOMAIN_BIOLOGY = 'space_biology';
    
    // Types de données de recherche
    const DATA_TYPE_TELEMETRY = 'telemetry';
    const DATA_TYPE_SENSOR = 'sensor';
    const DATA_TYPE_EXPERIMENT = 'experiment';
    const DATA_TYPE_SIMULATION = 'simulation';
    const DATA_TYPE_OBSERVATION = 'observation';
    
    public static function getResearchDomains() {
        return [
            self::DOMAIN_PROPULSION => 'Propulsion Spatiale',
            self::DOMAIN_MATERIALS => 'Science des Matériaux',
            self::DOMAIN_QUANTUM => 'Physique Quantique',
            self::DOMAIN_AI => 'Intelligence Artificielle',
            self::DOMAIN_BIOLOGY => 'Biologie Spatiale'
        ];
    }
    
    public static function getDataTypes() {
        return [
            self::DATA_TYPE_TELEMETRY => 'Télémétrie',
            self::DATA_TYPE_SENSOR => 'Données Capteurs',
            self::DATA_TYPE_EXPERIMENT => 'Résultats d\'Expérience',
            self::DATA_TYPE_SIMULATION => 'Données de Simulation',
            self::DATA_TYPE_OBSERVATION => 'Observations'
        ];
    }
}
?>