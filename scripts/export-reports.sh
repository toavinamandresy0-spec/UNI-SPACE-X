#!/bin/bash

# Script de génération de rapports pour Spatial Research Lab
# Usage: ./scripts/export-reports.sh [type] [environnement]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/config/environment.json"
REPORTS_DIR="$PROJECT_ROOT/reports"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonctions de logging
log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warning() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# Types de rapports disponibles
AVAILABLE_REPORTS=("usage" "performance" "research" "system" "all")

# Chargement de la configuration
load_config() {
    local env=${1:-development}
    
    DB_HOST=$(jq -r ".$env.database.host" "$CONFIG_FILE")
    DB_PORT=$(jq -r ".$env.database.port" "$CONFIG_FILE")
    DB_NAME=$(jq -r ".$env.database.name" "$CONFIG_FILE")
    DB_USER=$(jq -r ".$env.database.user" "$CONFIG_FILE")
    DB_PASS=$(jq -r ".$env.database.password" "$CONFIG_FILE")
    
    if [[ "$DB_HOST" == "null" ]]; then
        error "Environnement '$env' non trouvé"
        exit 1
    fi
}

# Vérification des arguments
check_arguments() {
    local report_type=${1:-all}
    
    if [[ ! " ${AVAILABLE_REPORTS[@]} " =~ " ${report_type} " ]]; then
        error "Type de rapport non supporté: $report_type"
        echo "Types disponibles: ${AVAILABLE_REPORTS[*]}"
        exit 1
    fi
}

# Création du répertoire de rapports
setup_reports_dir() {
    mkdir -p "$REPORTS_DIR"
    local timestamp=$(date +%Y%m%d)
    local report_dir="$REPORTS_DIR/$timestamp"
    
    mkdir -p "$report_dir"
    echo "$report_dir"
}

# Rapport d'utilisation
generate_usage_report() {
    local output_dir="$1"
    local report_file="$output_dir/usage_report.md"
    
    log "Génération du rapport d'utilisation..."
    
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$report_file" <<'EOF'
# Rapport d'Utilisation - Spatial Research Lab
## Statistiques Générales

### Utilisateurs
EOF

    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -s -N "$DB_NAME" >> "$report_file" <<'EOF'
SELECT 
    'Total utilisateurs: ' || COUNT(*) as total_users,
    'Dernière connexion: ' || MAX(last_login) as last_login,
    'Nouveaux (7j): ' || COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_users_7d
FROM users;
EOF

    echo "" >> "$report_file"
    echo "### Simulations par Type" >> "$report_file"
    
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -s -N "$DB_NAME" >> "$report_file" <<'EOF'
SELECT 
    type as 'Type',
    COUNT(*) as 'Total',
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as 'Terminées',
    COUNT(CASE WHEN status = 'running' THEN 1 END) as 'En cours',
    AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as 'Durée moyenne (min)'
FROM simulations 
GROUP BY type 
ORDER BY Total DESC;
EOF

    success "Rapport d'utilisation généré: $report_file"
}

# Rapport de performance
generate_performance_report() {
    local output_dir="$1"
    local report_file="$output_dir/performance_report.md"
    
    log "Génération du rapport de performance..."
    
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$report_file" <<'EOF'
# Rapport de Performance - Spatial Research Lab
## Métriques de Performance

### Données de Recherche
EOF

    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -s -N "$DB_NAME" >> "$report_file" <<'EOF'
SELECT 
    'Total données: ' || COUNT(*) as total_data,
    'Types de données: ' || COUNT(DISTINCT data_type) as data_types,
    'Période couverte: ' || MIN(timestamp) || ' à ' || MAX(timestamp) as date_range,
    'Taux croissance (7j): ' || ROUND((
        COUNT(CASE WHEN timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) * 100.0 / 
        NULLIF(COUNT(CASE WHEN timestamp < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END), 0)
    ), 2) || '%' as growth_rate
FROM research_data;
EOF

    echo "" >> "$report_file"
    echo "### Performance des Simulations" >> "$report_file"
    
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -s -N "$DB_NAME" >> "$report_file" <<'EOF'
SELECT 
    type as 'Type',
    ROUND(AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)), 2) as 'Temps moyen (s)',
    ROUND(MAX(TIMESTAMPDIFF(SECOND, created_at, updated_at)), 2) as 'Temps max (s)',
    ROUND(MIN(TIMESTAMPDIFF(SECOND, created_at, updated_at)), 2) as 'Temps min (s)',
    COUNT(*) as 'Total executions'
FROM simulations 
WHERE status = 'completed'
GROUP BY type;
EOF

    success "Rapport de performance généré: $report_file"
}

# Rapport de recherche
generate_research_report() {
    local output_dir="$1"
    local report_file="$output_dir/research_report.md"
    
    log "Génération du rapport de recherche..."
    
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$report_file" <<'EOF'
# Rapport de Recherche - Spatial Research Lab
## Activités de Recherche

### Domaines de Recherche
EOF

    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -s -N "$DB_NAME" >> "$report_file" <<'EOF'
SELECT 
    research_domain as 'Domaine',
    COUNT(*) as 'Chercheurs',
    COUNT(DISTINCT s.simulation_id) as 'Simulations',
    COUNT(DISTINCT e.experiment_id) as 'Expériences'
FROM users u
LEFT JOIN simulations s ON u.user_id = s.user_id
LEFT JOIN experiments e ON u.user_id = e.user_id
GROUP BY research_domain
ORDER BY Chercheurs DESC;
EOF

    echo "" >> "$report_file"
    echo "### Collaborations Actives" >> "$report_file"
    
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -s -N "$DB_NAME" >> "$report_file" <<'EOF'
SELECT 
    cs.name as 'Session',
    COUNT(sp.user_id) as 'Participants',
    cs.created_at as 'Début',
    cs.last_activity as 'Dernière activité',
    s.name as 'Simulation liée'
FROM collaboration_sessions cs
LEFT JOIN session_participants sp ON cs.session_id = sp.session_id
LEFT JOIN simulations s ON cs.simulation_id = s.simulation_id
WHERE cs.is_active = TRUE
GROUP BY cs.session_id
ORDER BY cs.last_activity DESC;
EOF

    success "Rapport de recherche généré: $report_file"
}

# Rapport système
generate_system_report() {
    local output_dir="$1"
    local report_file="$output_dir/system_report.md"
    
    log "Génération du rapport système..."
    
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$report_file" <<'EOF'
# Rapport Système - Spatial Research Lab
## État du Système

### Base de Données
EOF

    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -s -N "$DB_NAME" >> "$report_file" <<'EOF'
SELECT 
    'Taille totale: ' || ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) || ' MB' as db_size,
    'Nombre de tables: ' || COUNT(*) as table_count,
    'Encodage: ' || DEFAULT_CHARACTER_SET_NAME as encoding
FROM information_schema.TABLES 
WHERE table_schema = 'spatial_research';
EOF

    echo "" >> "$report_file"
    echo "### Exportations Récentes" >> "$report_file"
    
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -s -N "$DB_NAME" >> "$report_file" <<'EOF'
SELECT 
    export_type as 'Type',
    status as 'Statut',
    COUNT(*) as 'Nombre',
    ROUND(AVG(file_size) / 1024 / 1024, 2) as 'Taille moyenne (MB)',
    MAX(created_at) as 'Dernier export'
FROM exports 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY export_type, status
ORDER BY created_at DESC;
EOF

    success "Rapport système généré: $report_file"
}

# Génération de tous les rapports
generate_all_reports() {
    local output_dir="$1"
    
    generate_usage_report "$output_dir"
    generate_performance_report "$output_dir"
    generate_research_report "$output_dir"
    generate_system_report "$output_dir"
}

# Archivage des rapports
archive_reports() {
    local output_dir="$1"
    local archive_name="spatial_reports_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    log "Archivage des rapports..."
    
    if tar -czf "$REPORTS_DIR/$archive_name" -C "$output_dir" .; then
        success "Rapports archivés: $REPORTS_DIR/$archive_name"
        echo "$REPORTS_DIR/$archive_name"
    else
        error "Échec de l'archivage"
        return 1
    fi
}

# Fonction principale
main() {
    local report_type=${1:-all}
    local environment=${2:-development}
    
    log "Début de la génération des rapports"
    
    # Vérifications
    check_arguments "$report_type"
    load_config "$environment"
    
    # Préparation
    local output_dir=$(setup_reports_dir)
    
    # Génération des rapports
    case $report_type in
        usage)
            generate_usage_report "$output_dir"
            ;;
        performance)
            generate_performance_report "$output_dir"
            ;;
        research)
            generate_research_report "$output_dir"
            ;;
        system)
            generate_system_report "$output_dir"
            ;;
        all)
            generate_all_reports "$output_dir"
            ;;
    esac
    
    # Archivage
    local archive_path=$(archive_reports "$output_dir")
    
    # Nettoyage
    rm -rf "$output_dir"
    
    success "Génération des rapports terminée"
    log "Archive disponible: $archive_path"
}

# Exécution
main "$@"