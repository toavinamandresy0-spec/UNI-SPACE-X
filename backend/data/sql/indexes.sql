USE spatial_research;

-- Index optimisés pour les performances

-- Index pour les recherches full-text
ALTER TABLE simulations ADD FULLTEXT idx_simulation_search (name, description);
ALTER TABLE experiments ADD FULLTEXT idx_experiment_search (name, description);

-- Index composites pour les jointures fréquentes
CREATE INDEX idx_simulation_user_status ON simulations(user_id, status, created_at);
CREATE INDEX idx_research_data_simulation_type ON research_data(simulation_id, data_type, timestamp);
CREATE INDEX idx_collaboration_active ON collaboration_sessions(is_active, last_activity);
CREATE INDEX idx_user_activities_recent ON user_activities(user_id, created_at DESC);

-- Index pour les agrégations
CREATE INDEX idx_research_data_timestamp_range ON research_data(timestamp, data_type);
CREATE INDEX idx_simulations_created_date ON simulations(created_at, type);
CREATE INDEX idx_exports_status_created ON exports(status, created_at);

-- Index pour les recherches par plage de dates
CREATE INDEX idx_research_data_date_range ON research_data(timestamp, simulation_id);
CREATE INDEX idx_user_activities_date_range ON user_activities(created_at, user_id);

-- Index pour les statistiques
CREATE INDEX idx_simulation_stats ON simulations(user_id, status, type, created_at);
CREATE INDEX idx_user_stats ON users(created_at, institution, research_domain);

-- Partitionnement des tables volumineuses (MySQL 5.7+)
-- ALTER TABLE research_data PARTITION BY RANGE (YEAR(timestamp)) (
--     PARTITION p2023 VALUES LESS THAN (2024),
--     PARTITION p2024 VALUES LESS THAN (2025),
--     PARTITION p2025 VALUES LESS THAN (2026),
--     PARTITION p_future VALUES LESS THAN MAXVALUE
-- );

-- Optimisation des performances des requêtes JSON (MySQL 8.0+)
-- CREATE INDEX idx_simulation_parameters ON simulations((CAST(parameters->'$.initial_conditions.mass' AS UNSIGNED)));
-- CREATE INDEX idx_research_data_values ON research_data((CAST(data_values->'$.velocity' AS DECIMAL(10,2))));

-- Vues matérialisées pour les rapports fréquents (si supportées)
CREATE VIEW daily_simulation_stats AS
SELECT 
    DATE(created_at) as date,
    type,
    status,
    COUNT(*) as count,
    AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)) as avg_duration_seconds
FROM simulations 
GROUP BY DATE(created_at), type, status;

CREATE VIEW user_engagement_metrics AS
SELECT 
    u.user_id,
    u.first_name,
    u.last_name,
    u.institution,
    COUNT(DISTINCT s.simulation_id) as simulation_count,
    COUNT(DISTINCT e.experiment_id) as experiment_count,
    COUNT(DISTINCT rd.data_id) as data_point_count,
    MAX(s.updated_at) as last_simulation_activity,
    DATEDIFF(NOW(), u.last_login) as days_since_last_login
FROM users u
LEFT JOIN simulations s ON u.user_id = s.user_id
LEFT JOIN experiments e ON u.user_id = e.user_id
LEFT JOIN research_data rd ON u.user_id = rd.user_id
GROUP BY u.user_id;

-- Procédures pour la maintenance
DELIMITER //

CREATE PROCEDURE OptimizeTables()
BEGIN
    -- Optimiser les tables fréquemment mises à jour
    OPTIMIZE TABLE research_data;
    OPTIMIZE TABLE session_messages;
    OPTIMIZE TABLE user_activities;
    
    -- Mettre à jour les statistiques
    ANALYZE TABLE simulations;
    ANALYZE TABLE users;
    ANALYZE TABLE research_data;
END//

CREATE PROCEDURE RebuildIndexes()
BEGIN
    -- Reconstruire les index fragmentés
    ALTER TABLE simulations ENGINE=InnoDB;
    ALTER TABLE research_data ENGINE=InnoDB;
    ALTER TABLE users ENGINE=InnoDB;
END//

DELIMITER ;