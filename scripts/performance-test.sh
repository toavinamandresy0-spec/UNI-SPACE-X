#!/bin/bash

# Script de test de performance pour Spatial Research Lab
# Usage: ./scripts/performance-test.sh [environnement] [nombre_requêtes]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/config/environment.json"

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

# Variables par défaut
DEFAULT_ENVIRONMENT="development"
DEFAULT_REQUEST_COUNT=100
DEFAULT_CONCURRENT_USERS=10

# Chargement de la configuration
load_config() {
    local env=${1:-$DEFAULT_ENVIRONMENT}
    
    DB_HOST=$(jq -r ".$env.database.host" "$CONFIG_FILE")
    DB_PORT=$(jq -r ".$env.database.port" "$CONFIG_FILE")
    DB_NAME=$(jq -r ".$env.database.name" "$CONFIG_FILE")
    DB_USER=$(jq -r ".$env.database.user" "$CONFIG_FILE")
    DB_PASS=$(jq -r ".$env.database.password" "$CONFIG_FILE")
    API_PORT=$(jq -r ".$env.api.port" "$CONFIG_FILE")
    
    if [[ "$DB_HOST" == "null" ]]; then
        error "Environnement '$env' non trouvé"
        exit 1
    fi
}

# Vérification des dépendances
check_dependencies() {
    local deps=("mysql" "curl" "bc" "jq")
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error "Dépendance manquante: $dep"
            exit 1
        fi
    done
    
    # Vérification de Apache Bench (ab)
    if ! command -v ab &> /dev/null; then
        warning "Apache Bench (ab) non installé - installation..."
        sudo apt update && sudo apt install -y apache2-utils
    fi
    
    success "Dépendances vérifiées"
}

# Test de performance de la base de données
test_database_performance() {
    local request_count=${1:-$DEFAULT_REQUEST_COUNT}
    
    log "Test de performance de la base de données..."
    
    local results_file="/tmp/db_perf_$$.txt"
    
    # Test de requêtes simples
    local start_time=$(date +%s.%N)
    
    for ((i=1; i<=request_count; i++)); do
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "SELECT COUNT(*) FROM simulations" "$DB_NAME" > /dev/null 2>&1
    done
    
    local end_time=$(date +%s.%N)
    local total_time=$(echo "$end_time - $start_time" | bc)
    local qps=$(echo "scale=2; $request_count / $total_time" | bc)
    
    # Test de requêtes complexes
    local complex_start=$(date +%s.%N)
    
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > /dev/null 2>&1 <<'EOF'
SELECT 
    s.type,
    COUNT(*) as total,
    AVG(TIMESTAMPDIFF(SECOND, s.created_at, s.updated_at)) as avg_duration,
    COUNT(rd.data_id) as total_data_points
FROM simulations s
LEFT JOIN research_data rd ON s.simulation_id = rd.simulation_id
GROUP BY s.type
ORDER BY total DESC;
EOF

    local complex_end=$(date +%s.%N)
    local complex_time=$(echo "$complex_end - $complex_start" | bc)
    
    # Sauvegarde des résultats
    cat > "$results_file" <<EOF
## Performance Base de Données

### Requêtes Simples
- Requêtes exécutées: $request_count
- Temps total: ${total_time}s
- Requêtes par seconde: ${qps} QPS

### Requêtes Complexes
- Temps d'exécution: ${complex_time}s

### Métriques Base de Données
EOF

    # Récupération des métriques MySQL
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -s -N "$DB_NAME" >> "$results_file" <<'EOF'
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Queries';
SHOW STATUS LIKE 'Slow_queries';
SHOW STATUS LIKE 'Innodb_buffer_pool_reads';
EOF

    success "Test base de données terminé"
    echo "$results_file"
}

# Test de performance de l'API
test_api_performance() {
    local concurrent_users=${1:-$DEFAULT_CONCURRENT_USERS}
    local total_requests=${2:-$DEFAULT_REQUEST_COUNT}
    
    log "Test de performance de l'API..."
    
    local base_url="http://localhost:${API_PORT:-8000}"
    local results_file="/tmp/api_perf_$$.txt"
    
    # Vérification que l'API est accessible
    if ! curl -s --head "$base_url/api/simulations" | grep -q "200\|401"; then
        warning "API non accessible sur $base_url - démarrage en cours..."
        
        # Tentative de démarrage du serveur PHP
        cd "$PROJECT_ROOT/backend" && php -S "localhost:$API_PORT" > /dev/null 2>&1 &
        local server_pid=$!
        sleep 3
    fi
    
    # Test avec Apache Bench
    log "Lancement de $total_requests requêtes avec $concurrent_users utilisateurs concurrents..."
    
    ab -n "$total_requests" -c "$concurrent_users" \
       -H "Authorization: Bearer test_token" \
       -H "Content-Type: application/json" \
       "$base_url/api/simulations" > "$results_file" 2>&1 || warning "Test AB terminé avec des erreurs"
    
    # Extraction des métriques importantes
    local complete_requests=$(grep "Complete requests:" "$results_file" | awk '{print $3}')
    local failed_requests=$(grep "Failed requests:" "$results_file" | awk '{print $3}')
    local requests_per_second=$(grep "Requests per second:" "$results_file" | awk '{print $4}')
    local time_per_request=$(grep "Time per request:" "$results_file" | head -1 | awk '{print $4}')
    
    # Rapport formaté
    local report_file="/tmp/api_perf_report_$$.txt"
    cat > "$report_file" <<EOF
## Performance API

### Résultats Généraux
- Requêtes complètes: $complete_requests
- Requêtes échouées: $failed_requests
- Requêtes par seconde: $requests_per_second
- Temps par requête: $time_per_request ms

### Détail des Temps de Réponse
EOF

    grep -A 10 "Percentage of the requests" "$results_file" >> "$report_file"
    
    # Nettoyage du processus serveur si lancé
    if [[ -n $server_pid ]]; then
        kill $server_pid 2>/dev/null || true
    fi
    
    success "Test API terminé"
    echo "$report_file"
}

# Test de charge système
test_system_load() {
    log "Test de charge système..."
    
    local results_file="/tmp/system_perf_$$.txt"
    
    # Collecte des métriques système
    local cpu_cores=$(nproc)
    local total_memory=$(free -h | grep Mem | awk '{print $2}')
    local used_memory=$(free -h | grep Mem | awk '{print $3}')
    local load_average=$(uptime | awk -F'load average:' '{print $2}')
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}')
    
    # Test d'E/S disque
    local disk_test=$(dd if=/dev/zero of=/tmp/testfile bs=1M count=100 2>&1 | grep -o '[0-9.]\+ MB/s' | tail -1)
    rm -f /tmp/testfile
    
    # Sauvegarde des résultats
    cat > "$results_file" <<EOF
## Charge Système

### Ressources
- CPU Cores: $cpu_cores
- Mémoire totale: $total_memory
- Mémoire utilisée: $used_memory
- Charge moyenne: $load_average
- Utilisation disque: $disk_usage

### Performance Disque
- Vitesse écriture: $disk_test

### Processus en cours
EOF

    ps aux --sort=-%cpu | head -10 >> "$results_file"
    
    success "Test système terminé"
    echo "$results_file"
}

# Génération du rapport final
generate_final_report() {
    local db_results="$1"
    local api_results="$2"
    local system_results="$3"
    local output_dir="$4"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local report_file="$output_dir/performance_report_$timestamp.md"
    
    log "Génération du rapport final..."
    
    cat > "$report_file" <<EOF
# Rapport de Performance - Spatial Research Lab
## Tests effectués le $(date)

EOF

    [[ -f "$db_results" ]] && cat "$db_results" >> "$report_file"
    echo "" >> "$report_file"
    [[ -f "$api_results" ]] && cat "$api_results" >> "$report_file"
    echo "" >> "$report_file"
    [[ -f "$system_results" ]] && cat "$system_results" >> "$report_file"
    
    # Recommandations
    cat >> "$report_file" <<EOF

## Recommandations

### Base de Données
- Surveiller les requêtes lentes
- Optimiser les index fréquemment utilisés
- Augmenter le buffer pool si nécessaire

### API
- Mettre en cache les réponses fréquentes
- Utiliser la compression GZIP
- Configurer le rate limiting

### Système
- Surveiller l'utilisation mémoire
- Planifier les sauvegardes hors heures de pointe
- Configurer la surveillance des performances

EOF

    # Nettoyage des fichiers temporaires
    rm -f "$db_results" "$api_results" "$system_results"
    
    success "Rapport généré: $report_file"
    echo "$report_file"
}

# Fonction principale
main() {
    local environment=${1:-$DEFAULT_ENVIRONMENT}
    local request_count=${2:-$DEFAULT_REQUEST_COUNT}
    local concurrent_users=${3:-$DEFAULT_CONCURRENT_USERS}
    
    log "Début des tests de performance"
    
    # Vérifications
    load_config "$environment"
    check_dependencies
    
    # Création du répertoire de sortie
    local output_dir="$PROJECT_ROOT/performance_tests/$(date +%Y%m%d)"
    mkdir -p "$output_dir"
    
    # Exécution des tests
    local db_results=$(test_database_performance "$request_count")
    local api_results=$(test_api_performance "$concurrent_users" "$request_count")
    local system_results=$(test_system_load)
    
    # Génération du rapport
    local final_report=$(generate_final_report "$db_results" "$api_results" "$system_results" "$output_dir")
    
    success "Tests de performance terminés"
    log "Rapport disponible: $final_report"
    
    # Affichage des résultats clés
    log "=== RÉSUMÉ DES RÉSULTATS ==="
    grep -E "(Requêtes par seconde|Temps par requête|Complete requests)" "$final_report" | head -5
}

# Gestion des signaux
trap 'error "Tests interrompus"; exit 1' INT TERM

# Exécution
main "$@"