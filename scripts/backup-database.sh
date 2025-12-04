#!/bin/bash

# Script de sauvegarde de la base de données Spatial Research Lab
# Usage: ./scripts/backup-database.sh [environnement]

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

# Chargement de la configuration
load_config() {
    local env=${1:-development}
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        error "Fichier de configuration non trouvé: $CONFIG_FILE"
        exit 1
    fi
    
    DB_HOST=$(jq -r ".$env.database.host" "$CONFIG_FILE")
    DB_PORT=$(jq -r ".$env.database.port" "$CONFIG_FILE")
    DB_NAME=$(jq -r ".$env.database.name" "$CONFIG_FILE")
    DB_USER=$(jq -r ".$env.database.user" "$CONFIG_FILE")
    DB_PASS=$(jq -r ".$env.database.password" "$CONFIG_FILE")
    
    if [[ "$DB_HOST" == "null" ]]; then
        error "Environnement '$env' non trouvé dans la configuration"
        exit 1
    fi
    
    log "Configuration chargée pour l'environnement: $env"
}

# Vérification des dépendances
check_dependencies() {
    local deps=("mysqldump" "gzip" "jq" "aws")
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error "Dépendance manquante: $dep"
            exit 1
        fi
    done
    
    success "Dépendances vérifiées"
}

# Sauvegarde locale
backup_local() {
    local backup_dir="$PROJECT_ROOT/backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/${DB_NAME}_${timestamp}.sql.gz"
    
    mkdir -p "$backup_dir"
    
    log "Début de la sauvegarde locale..."
    
    if mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        "$DB_NAME" | gzip > "$backup_file"; then
        
        local size=$(du -h "$backup_file" | cut -f1)
        success "Sauvegarde locale créée: $backup_file ($size)"
        echo "$backup_file"
    else
        error "Échec de la sauvegarde locale"
        return 1
    fi
}

# Sauvegarde vers S3 (optionnel)
backup_s3() {
    local backup_file="$1"
    local s3_bucket="${S3_BUCKET:-spatial-research-backups}"
    local s3_path="database/$(date +%Y/%m/%d)/$(basename "$backup_file")"
    
    if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" ]]; then
        warning "Variables AWS non configurées - sauvegarde S3 ignorée"
        return 0
    fi
    
    log "Upload vers S3: s3://$s3_bucket/$s3_path"
    
    if aws s3 cp "$backup_file" "s3://$s3_bucket/$s3_path"; then
        success "Sauvegarde uploadée vers S3"
    else
        error "Échec de l'upload S3"
        return 1
    fi
}

# Nettoyage des anciennes sauvegardes
cleanup_old_backups() {
    local backup_dir="$PROJECT_ROOT/backups"
    local retention_days=${RETENTION_DAYS:-30}
    
    log "Nettoyage des sauvegardes de plus de $retention_days jours..."
    
    find "$backup_dir" -name "*.sql.gz" -mtime +$retention_days -delete
    
    local deleted_count=$?
    if [[ $deleted_count -gt 0 ]]; then
        success "$deleted_count anciennes sauvegardes supprimées"
    fi
}

# Vérification de l'intégrité de la sauvegarde
verify_backup() {
    local backup_file="$1"
    
    log "Vérification de l'intégrité de la sauvegarde..."
    
    if gzip -t "$backup_file" 2>/dev/null; then
        success "Sauvegarde vérifiée avec succès"
        return 0
    else
        error "Sauvegarde corrompue: $backup_file"
        return 1
    fi
}

# Rapport de sauvegarde
send_report() {
    local backup_file="$1"
    local status="$2"
    local size=$(du -h "$backup_file" | cut -f1 2>/dev/null || echo "N/A")
    
    local report="Sauvegarde base de données - $(date)
    
Environnement: ${ENVIRONMENT:-development}
Base de données: $DB_NAME
Statut: $status
Taille: $size
Fichier: $(basename "$backup_file")"
    
    # Envoyer par email (optionnel)
    if command -v mail &> /dev/null && [[ -n "$BACKUP_EMAIL" ]]; then
        echo "$report" | mail -s "Rapport sauvegarde: $status" "$BACKUP_EMAIL"
    fi
    
    # Journalisation
    echo "$report" >> "$PROJECT_ROOT/backups/backup.log"
}

# Fonction principale
main() {
    local environment=${1:-development}
    local backup_file=""
    
    log "Début du processus de sauvegarde"
    
    # Chargement configuration
    load_config "$environment"
    
    # Vérification dépendances
    check_dependencies
    
    # Sauvegarde locale
    if backup_file=$(backup_local); then
        # Vérification intégrité
        if verify_backup "$backup_file"; then
            # Sauvegarde S3 (optionnel)
            backup_s3 "$backup_file"
            
            # Nettoyage
            cleanup_old_backups
            
            # Rapport
            send_report "$backup_file" "SUCCÈS"
            
            success "Sauvegarde terminée avec succès"
        else
            send_report "$backup_file" "ÉCHEC - Intégrité"
            error "Sauvegarde échouée - problème d'intégrité"
            exit 1
        fi
    else
        send_report "N/A" "ÉCHEC - Création"
        error "Sauvegarde échouée - création impossible"
        exit 1
    fi
}

# Gestion des signaux
trap 'error "Sauvegarde interrompue"; exit 1' INT TERM

# Exécution
main "$@"