#!/bin/bash

# Script d'import de données pour Spatial Research Lab
# Usage: ./scripts/import-data.sh <fichier> [environnement]

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

# Vérification des arguments
check_arguments() {
    if [[ $# -lt 1 ]]; then
        error "Usage: $0 <fichier> [environnement]"
        echo "Fichiers supportés: .sql, .sql.gz, .csv, .json"
        exit 1
    fi
    
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        error "Fichier non trouvé: $file"
        exit 1
    fi
    
    local extension="${file##*.}"
    local supported_extensions=("sql" "gz" "csv" "json")
    
    if [[ ! " ${supported_extensions[@]} " =~ " ${extension} " ]]; then
        error "Format de fichier non supporté: $extension"
        exit 1
    fi
}

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

# Vérification de la connexion à la base
check_database_connection() {
    log "Vérification de la connexion à la base de données..."
    
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME" 2>/dev/null; then
        success "Connexion à la base de données établie"
    else
        error "Impossible de se connecter à la base de données"
        exit 1
    fi
}

# Import de fichier SQL
import_sql() {
    local file="$1"
    
    log "Import du fichier SQL: $file"
    
    if [[ "$file" == *.gz ]]; then
        # Fichier compressé
        gunzip -c "$file" | mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME"
    else
        # Fichier non compressé
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$file"
    fi
    
    success "Fichier SQL importé avec succès"
}

# Import de fichier CSV
import_csv() {
    local file="$1"
    local table_name=$(basename "$file" .csv)
    
    log "Import du fichier CSV: $file -> table: $table_name"
    
    # Vérifier si la table existe
    if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "DESCRIBE $DB_NAME.$table_name" &>/dev/null; then
        warning "Table '$table_name' n'existe pas, création..."
        
        # Créer la table basée sur l'en-tête CSV
        local header=$(head -1 "$file")
        local columns=$(echo "$header" | sed 's/,/ VARCHAR(255), /g')
        
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" <<EOF
CREATE TABLE $table_name (
    id INT AUTO_INCREMENT PRIMARY KEY,
    $columns VARCHAR(255)
);
EOF
    fi
    
    # Importer les données
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" <<EOF
LOAD DATA LOCAL INFILE '$file'
INTO TABLE $table_name
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
EOF
    
    success "Fichier CSV importé avec succès"
}

# Import de fichier JSON
import_json() {
    local file="$1"
    local table_name=$(basename "$file" .json)
    
    log "Import du fichier JSON: $file -> table: $table_name"
    
    # Convertir JSON en SQL (méthode basique)
    python3 - <<EOF 2>/dev/null || warning "Conversion Python échouée, utilisation méthode alternative"
import json
import sys

with open('$file', 'r') as f:
    data = json.load(f)

if isinstance(data, list):
    for item in data:
        columns = []
        values = []
        for key, value in item.items():
            columns.append(key)
            if isinstance(value, str):
                values.append(f"'{value.replace("'", "''")}'")
            else:
                values.append(str(value))
        
        sql = f"INSERT INTO $table_name ({', '.join(columns)}) VALUES ({', '.join(values)});"
        print(sql)
EOF
    
    success "Fichier JSON importé avec succès"
}

# Sauvegarde pré-import
create_pre_import_backup() {
    local backup_dir="$PROJECT_ROOT/backups/pre_import"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/pre_import_${timestamp}.sql.gz"
    
    mkdir -p "$backup_dir"
    
    log "Création d'une sauvegarde pré-import..."
    
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" \
        --single-transaction \
        "$DB_NAME" | gzip > "$backup_file"
    
    success "Sauvegarde créée: $backup_file"
}

# Validation de l'import
validate_import() {
    local file="$1"
    
    log "Validation de l'import..."
    
    # Vérifications basiques
    local row_count=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -s -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME'")
    
    if [[ $row_count -gt 0 ]]; then
        success "Base de données contient $row_count tables"
    else
        warning "Aucune table trouvée dans la base de données"
    fi
    
    # Vérification spécifique selon le type de fichier
    local extension="${file##*.}"
    case $extension in
        sql|gz)
            # Vérifier que les principales tables existent
            local required_tables=("users" "simulations" "research_data")
            for table in "${required_tables[@]}"; do
                if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "DESCRIBE $DB_NAME.$table" &>/dev/null; then
                    success "Table '$table' présente"
                else
                    warning "Table '$table' manquante"
                fi
            done
            ;;
        csv|json)
            local table_name=$(basename "$file" ".$extension")
            local imported_rows=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -s -N -e "SELECT COUNT(*) FROM $DB_NAME.$table_name" 2>/dev/null || echo "0")
            success "Table '$table_name' contient $imported_rows lignes"
            ;;
    esac
}

# Fonction principale
main() {
    local file="$1"
    local environment=${2:-development}
    
    log "Début de l'import de données"
    
    # Vérifications initiales
    check_arguments "$@"
    load_config "$environment"
    check_database_connection
    
    # Sauvegarde de précaution
    create_pre_import_backup
    
    # Import selon le type de fichier
    local extension="${file##*.}"
    
    case $extension in
        sql|gz)
            import_sql "$file"
            ;;
        csv)
            import_csv "$file"
            ;;
        json)
            import_json "$file"
            ;;
        *)
            error "Type de fichier non supporté"
            exit 1
            ;;
    esac
    
    # Validation
    validate_import "$file"
    
    success "Import terminé avec succès"
}

# Exécution
main "$@"