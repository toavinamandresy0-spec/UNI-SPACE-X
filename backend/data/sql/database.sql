-- Création de la base de données
CREATE DATABASE IF NOT EXISTS spatial_research 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE spatial_research;

-- Table des utilisateurs
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    institution VARCHAR(255) NOT NULL,
    research_domain VARCHAR(100) NOT NULL,
    access_level TINYINT DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_institution (institution),
    INDEX idx_research_domain (research_domain)
);

-- Table des tokens d'authentification
CREATE TABLE user_tokens (
    token_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- Table des simulations
CREATE TABLE simulations (
    simulation_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('orbital', 'quantum', 'launch', 'interstellar') NOT NULL,
    parameters JSON,
    description TEXT,
    access_level TINYINT DEFAULT 2,
    status ENUM('draft', 'running', 'completed', 'failed', 'paused') DEFAULT 'draft',
    results JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at),
    FULLTEXT idx_search (name, description)
);

-- Table des données de recherche
CREATE TABLE research_data (
    data_id INT PRIMARY KEY AUTO_INCREMENT,
    simulation_id INT NOT NULL,
    data_type VARCHAR(100) NOT NULL,
    data_values JSON NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (simulation_id) REFERENCES simulations(simulation_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_simulation_id (simulation_id),
    INDEX idx_data_type (data_type),
    INDEX idx_timestamp (timestamp),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Table des sessions de collaboration
CREATE TABLE collaboration_sessions (
    session_id INT PRIMARY KEY AUTO_INCREMENT,
    simulation_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    access_code VARCHAR(16) UNIQUE NOT NULL,
    created_by INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (simulation_id) REFERENCES simulations(simulation_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_simulation_id (simulation_id),
    INDEX idx_access_code (access_code),
    INDEX idx_created_by (created_by),
    INDEX idx_last_activity (last_activity)
);

-- Table des participants aux sessions
CREATE TABLE session_participants (
    participant_id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('creator', 'participant') DEFAULT 'participant',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES collaboration_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_user (session_id, user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_last_active (last_active)
);

-- Table des messages de collaboration
CREATE TABLE session_messages (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    message_type ENUM('text', 'annotation', 'command') DEFAULT 'text',
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES collaboration_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_message_type (message_type)
);

-- Table des exports
CREATE TABLE exports (
    export_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    export_type ENUM('csv', 'json', 'xml', 'pdf', 'xlsx') NOT NULL,
    data_type VARCHAR(100) NOT NULL,
    filters JSON,
    simulation_id INT NULL,
    include_metadata BOOLEAN DEFAULT TRUE,
    file_path VARCHAR(500) NULL,
    file_size INT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (simulation_id) REFERENCES simulations(simulation_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_export_type (export_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Table des expériences scientifiques
CREATE TABLE experiments (
    experiment_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    experiment_type VARCHAR(100) NOT NULL,
    description TEXT,
    parameters JSON,
    status ENUM('planned', 'running', 'completed', 'cancelled') DEFAULT 'planned',
    results JSON,
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_experiment_type (experiment_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Table des données d'expérience
CREATE TABLE experiment_data (
    data_id INT PRIMARY KEY AUTO_INCREMENT,
    experiment_id INT NOT NULL,
    data_type VARCHAR(100) NOT NULL,
    data_values JSON NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (experiment_id) REFERENCES experiments(experiment_id) ON DELETE CASCADE,
    INDEX idx_experiment_id (experiment_id),
    INDEX idx_data_type (data_type),
    INDEX idx_timestamp (timestamp)
);

-- Table des modèles de recherche
CREATE TABLE research_models (
    model_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    model_type VARCHAR(100) NOT NULL,
    description TEXT,
    parameters JSON,
    model_data LONGBLOB,
    accuracy FLOAT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_model_type (model_type),
    INDEX idx_is_public (is_public),
    INDEX idx_created_at (created_at)
);

-- Table des favoris
CREATE TABLE user_favorites (
    favorite_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    simulation_id INT NULL,
    experiment_id INT NULL,
    model_id INT NULL,
    item_type ENUM('simulation', 'experiment', 'model') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (simulation_id) REFERENCES simulations(simulation_id) ON DELETE CASCADE,
    FOREIGN KEY (experiment_id) REFERENCES experiments(experiment_id) ON DELETE CASCADE,
    FOREIGN KEY (model_id) REFERENCES research_models(model_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_item (user_id, simulation_id, experiment_id, model_id),
    INDEX idx_user_id (user_id),
    INDEX idx_item_type (item_type)
);

-- Table des activités utilisateur
CREATE TABLE user_activities (
    activity_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    description TEXT,
    resource_id INT NULL,
    resource_type VARCHAR(50) NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_created_at (created_at)
);

-- Table de configuration système
CREATE TABLE system_config (
    config_id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key)
);

-- Insertion de la configuration par défaut
INSERT INTO system_config (config_key, config_value, description) VALUES
('app_version', '1.0.0', 'Version de l application'),
('max_simulations_per_user', '100', 'Nombre maximum de simulations par utilisateur'),
('max_export_size_mb', '100', 'Taille maximale des exports en MB'),
('session_timeout_minutes', '30', 'Timeout des sessions en minutes'),
('backup_interval_hours', '24', 'Intervalle de sauvegarde en heures'),
('data_retention_days', '365', 'Rétention des données en jours');

-- Création des vues
CREATE VIEW simulation_stats AS
SELECT 
    s.simulation_id,
    s.name,
    s.type,
    s.status,
    s.created_at,
    s.updated_at,
    u.first_name,
    u.last_name,
    u.institution,
    COUNT(rd.data_id) as data_points_count,
    MAX(rd.timestamp) as last_data_point
FROM simulations s
LEFT JOIN users u ON s.user_id = u.user_id
LEFT JOIN research_data rd ON s.simulation_id = rd.simulation_id
GROUP BY s.simulation_id;

CREATE VIEW user_stats AS
SELECT 
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.institution,
    u.research_domain,
    u.created_at,
    u.last_login,
    COUNT(DISTINCT s.simulation_id) as simulations_count,
    COUNT(DISTINCT e.experiment_id) as experiments_count,
    COUNT(DISTINCT cs.session_id) as collaboration_sessions_count
FROM users u
LEFT JOIN simulations s ON u.user_id = s.user_id
LEFT JOIN experiments e ON u.user_id = e.user_id
LEFT JOIN collaboration_sessions cs ON u.user_id = cs.created_by
GROUP BY u.user_id;

-- Création des procédures stockées
DELIMITER //

CREATE PROCEDURE CleanupOldData(IN retention_days INT)
BEGIN
    -- Supprimer les données de recherche anciennes
    DELETE FROM research_data 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL retention_days DAY);
    
    -- Supprimer les exports anciens
    DELETE FROM exports 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL retention_days DAY);
    
    -- Supprimer les activités anciennes
    DELETE FROM user_activities 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL retention_days DAY);
    
    -- Marquer comme inactives les sessions sans activité récente
    UPDATE collaboration_sessions 
    SET is_active = FALSE 
    WHERE last_activity < DATE_SUB(NOW(), INTERVAL 7 DAY);
END//

CREATE PROCEDURE GetUserActivitySummary(IN user_id_param INT)
BEGIN
    SELECT 
        u.user_id,
        u.first_name,
        u.last_name,
        COUNT(DISTINCT s.simulation_id) as total_simulations,
        COUNT(DISTINCT e.experiment_id) as total_experiments,
        COUNT(DISTINCT cs.session_id) as total_collaboration_sessions,
        COUNT(DISTINCT rd.data_id) as total_data_points,
        MAX(s.updated_at) as last_simulation_activity,
        MAX(rd.timestamp) as last_data_activity
    FROM users u
    LEFT JOIN simulations s ON u.user_id = s.user_id
    LEFT JOIN experiments e ON u.user_id = e.user_id
    LEFT JOIN collaboration_sessions cs ON u.user_id = cs.created_by
    LEFT JOIN research_data rd ON u.user_id = rd.user_id
    WHERE u.user_id = user_id_param
    GROUP BY u.user_id;
END//

DELIMITER ;