USE spatial_research;

-- Insertion des utilisateurs de démonstration
INSERT INTO users (email, password, first_name, last_name, institution, research_domain, access_level) VALUES
('admin@spatial-research.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'System', 'Spatial Research Institute', 'quantum', 4),
('dr.dupont@research.fr', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jean', 'Dupont', 'CNRS France', 'propulsion', 3),
('marie.sanchez@esa.eu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Marie', 'Sanchez', 'European Space Agency', 'materials', 3),
('pierre.leroy@quantum.ca', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Pierre', 'Leroy', 'Quantum Research Center', 'quantum', 3),
('researcher@nasa.gov', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah', 'Johnson', 'NASA', 'artificial_intelligence', 3);

-- Insertion des simulations de démonstration
INSERT INTO simulations (user_id, name, type, parameters, description, status) VALUES
(2, 'Mission Alpha Centauri', 'interstellar', '{
    "initial_conditions": {
        "position": [0, 0, 0],
        "velocity": [30000, 0, 0],
        "mass": 500000
    },
    "destination": "Alpha Centauri",
    "propulsion_type": "quantum_drive",
    "travel_time_years": 45,
    "energy_requirements": 1.5e18
}', 'Simulation de voyage interstellaire vers Alpha Centauri utilisant la propulsion quantique', 'completed'),

(3, 'Test Matériaux Orbite Basse', 'orbital', '{
    "altitude": 408000,
    "inclination": 51.6,
    "materials": ["graphene", "carbon_nanotube", "titanium_alloy"],
    "exposure_time_days": 180,
    "environmental_factors": ["radiation", "atomic_oxygen", "thermal_cycling"]
}', 'Test de résistance des matériaux avancés en environnement spatial', 'running'),

(4, 'Calculateur Quantique Spatial', 'quantum', '{
    "qubits": 128,
    "algorithm": "shor_factorization",
    "temperature_kelvin": 0.015,
    "magnetic_shielding": "superconducting",
    "computation_power": 1.2e15
}', 'Simulation de calculateur quantique opérationnel dans l espace', 'completed'),

(5, 'Optimisation Trajectoire Mars', 'orbital', '{
    "departure_planet": "Earth",
    "destination_planet": "Mars",
    "transfer_type": "hohmann",
    "launch_window": "2024-10-15",
    "delta_v": 5800,
    "travel_time_days": 210
}', 'Optimisation de trajectoire pour mission habitée vers Mars', 'draft');

-- Insertion des données de recherche de démonstration
INSERT INTO research_data (simulation_id, data_type, data_values, timestamp, user_id) VALUES
(1, 'telemetry', '{
    "velocity": 29979245.8,
    "position": [0.5, 0.2, 0.1],
    "energy_consumption": 1.2e15,
    "quantum_coherence": 0.987,
    "temperature": 2.7
}', '2024-01-15 10:30:00', 2),

(1, 'sensor', '{
    "radiation_level": 0.015,
    "magnetic_field": 1.2e-9,
    "particle_density": 0.8,
    "quantum_fluctuations": 0.0034
}', '2024-01-15 10:31:00', 2),

(2, 'material_test', '{
    "material": "graphene",
    "stress_mpa": 2450,
    "strain": 0.125,
    "temperature_c": -150,
    "radiation_dose": 1.5e6
}', '2024-01-14 14:20:00', 3),

(3, 'quantum_computation', '{
    "algorithm": "shor_factorization",
    "input_number": 123456789,
    "computation_time_ms": 45.2,
    "success_rate": 0.956,
    "quantum_volume": 1024
}', '2024-01-13 16:45:00', 4);

-- Insertion des sessions de collaboration
INSERT INTO collaboration_sessions (simulation_id, name, description, access_code, created_by) VALUES
(1, 'Analyse Alpha Centauri', 'Session de collaboration pour analyser les résultats de la mission Alpha Centauri', 'a1b2c3d4e5f6g7h8', 2),
(2, 'Tests Matériaux ESA', 'Collaboration ESA sur les tests de matériaux en orbite', 'x9y8z7w6v5u4t3s2', 3);

-- Insertion des participants aux sessions
INSERT INTO session_participants (session_id, user_id, role) VALUES
(1, 2, 'creator'),
(1, 4, 'participant'),
(1, 5, 'participant'),
(2, 3, 'creator'),
(2, 2, 'participant');

-- Insertion des messages de collaboration
INSERT INTO session_messages (session_id, user_id, message, message_type) VALUES
(1, 2, 'Bienvenue dans la session d analyse Alpha Centauri. Commençons par examiner les données de télémétrie.', 'text'),
(1, 4, 'Les niveaux de cohérence quantique sont excellents. Nous pourrions augmenter la vitesse de 5% sans risque.', 'text'),
(1, 5, 'Conformément aux calculs de l IA, la trajectoire optimale nécessite une correction de 0.2 degrés dans 15 jours.', 'text'),
(2, 3, 'Les tests préliminaires montrent une excellente résistance du graphène aux radiations.', 'text'),
(2, 2, 'Avez-vous des données sur la résistance aux cycles thermiques?', 'text');

-- Insertion des expériences
INSERT INTO experiments (user_id, name, experiment_type, description, status, start_date) VALUES
(3, 'Synthèse Graphène Spatial', 'materials_science', 'Synthèse de graphène en microgravité pour améliorer les propriétés structurales', 'running', '2024-01-10'),
(4, 'Téléportation Quantique', 'quantum_physics', 'Expérience de téléportation quantique sur de longues distances spatiales', 'planned', NULL),
(5, 'IA Navigation Autonome', 'artificial_intelligence', 'Développement d IA pour la navigation autonome des vaisseaux spatiaux', 'completed', '2024-01-05');

-- Insertion des favoris
INSERT INTO user_favorites (user_id, simulation_id, item_type) VALUES
(2, 3, 'simulation'),
(3, 1, 'simulation'),
(4, 2, 'simulation'),
(5, 1, 'simulation');

-- Insertion des activités utilisateur
INSERT INTO user_activities (user_id, activity_type, description, resource_id, resource_type) VALUES
(2, 'simulation_created', 'A créé une nouvelle simulation: Mission Alpha Centauri', 1, 'simulation'),
(2, 'data_uploaded', 'A téléchargé des données de télémétrie', 1, 'research_data'),
(3, 'experiment_started', 'A démarré une nouvelle expérience: Synthèse Graphène Spatial', 1, 'experiment'),
(4, 'collaboration_joined', 'A rejoint la session: Analyse Alpha Centauri', 1, 'collaboration'),
(5, 'simulation_accessed', 'A consulté la simulation: Mission Alpha Centauri', 1, 'simulation');