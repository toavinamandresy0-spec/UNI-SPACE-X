#!/bin/bash

# Script d'installation de la base de données pour Ubuntu
# Spatial Research Lab - Database Setup

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Vérification des privilèges root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "Ce script ne doit pas être exécuté en tant que root"
        exit 1
    fi
}

# Vérification de l'OS
check_os() {
    if [[ ! -f /etc/os-release ]]; then
        error "Impossible de détecter la distribution Linux"
        exit 1
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" ]]; then
        error "Ce script est conçu pour Ubuntu"
        exit 1
    fi
    
    log "Distribution détectée: $PRETTY_NAME"
}

# Installation de MySQL
install_mysql() {
    log "Installation de MySQL..."
    
    if command -v mysql &> /dev/null; then
        warning "MySQL est déjà installé"
        return 0
    fi
    
    sudo apt update
    sudo apt install -y mysql-server mysql-client
    
    # Démarrage et activation au boot
    sudo systemctl start mysql
    sudo systemctl enable mysql
    
    # Sécurisation de l'installation
    log "Sécurisation de l'installation MySQL..."
    sudo mysql_secure_installation <<EOF
n
y
y
y
y
EOF
    
    success "MySQL installé avec succès"
}

# Configuration de MySQL
configure_mysql() {
    log "Configuration de MySQL..."
    
    # Création du fichier de configuration
    sudo tee /etc/mysql/conf.d/spatial-research.cnf > /dev/null <<EOF
[mysqld]
# Configuration de base
max_connections = 200
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2

# Encodage
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# Performance
query_cache_type = 1
query_cache_size = 64M
tmp_table_size = 64M
max_heap_table_size = 64M

# Logs
slow_query_log = 1
slow_query_log_file = /var/log/mysql/mysql-slow.log
long_query_time = 2

[client]
default-character-set = utf8mb4
EOF
    
    # Redémarrage de MySQL
    sudo systemctl restart mysql
    
    success "MySQL configuré avec succès"
}

# Création de la base de données et des utilisateurs
setup_database() {
    log "Configuration de la base de données..."
    
    # Mot de passe root MySQL
    read -sp "Mot de passe root MySQL: " MYSQL_ROOT_PASSWORD
    echo
    
    # Création de la base de données
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "CREATE DATABASE IF NOT EXISTS spatial_research CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    
    # Création des utilisateurs
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "
        CREATE USER IF NOT EXISTS 'spatial_dev'@'localhost' IDENTIFIED BY 'dev_password_2024';
        CREATE USER IF NOT EXISTS 'spatial_prod'@'localhost' IDENTIFIED BY 'prod_password_2024';
        CREATE USER IF NOT EXISTS 'spatial_test'@'localhost' IDENTIFIED BY 'test_password_2024';
        
        GRANT ALL PRIVILEGES ON spatial_research.* TO 'spatial_dev'@'localhost';
        GRANT SELECT, INSERT, UPDATE, DELETE ON spatial_research.* TO 'spatial_prod'@'localhost';
        GRANT ALL PRIVILEGES ON spatial_research.* TO 'spatial_test'@'localhost';
        
        FLUSH PRIVILEGES;
    "
    
    success "Base de données et utilisateurs créés"
}

# Import des schémas et données
import_schemas() {
    log "Import des schémas de base de données..."
    
    read -sp "Mot de passe root MySQL: " MYSQL_ROOT_PASSWORD
    echo
    
    # Import du schéma principal
    mysql -u root -p$MYSQL_ROOT_PASSWORD spatial_research < backend/data/sql/database.sql
    
    # Import des données de test
    mysql -u root -p$MYSQL_ROOT_PASSWORD spatial_research < backend/data/sql/seed-data.sql
    
    # Application des index optimisés
    mysql -u root -p$MYSQL_ROOT_PASSWORD spatial_research < backend/data/sql/indexes.sql
    
    success "Schémas et données importés avec succès"
}

# Configuration des sauvegardes automatiques
setup_backups() {
    log "Configuration des sauvegardes automatiques..."
    
    # Création du répertoire de sauvegardes
    sudo mkdir -p /var/backups/spatial-research
    sudo chown $USER:$USER /var/backups/spatial-research
    
    # Script de sauvegarde
    sudo tee /usr/local/bin/backup-spatial-db.sh > /dev/null <<'EOF'
#!/bin/bash
# Script de sauvegarde de la base de données Spatial Research

BACKUP_DIR="/var/backups/spatial-research"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/spatial_research_$DATE.sql.gz"
MYSQL_USER="root"
MYSQL_PASSWORD="your_mysql_root_password_here"
RETENTION_DAYS=30

# Sauvegarde
mysqldump -u$MYSQL_USER -p$MYSQL_PASSWORD --single-transaction --routines --triggers spatial_research | gzip > $BACKUP_FILE

# Vérification
if [ $? -eq 0 ]; then
    echo "Sauvegarde réussie: $BACKUP_FILE"
    
    # Nettoyage des anciennes sauvegardes
    find $BACKUP_DIR -name "spatial_research_*.sql.gz" -mtime +$RETENTION_DAYS -delete
else
    echo "Échec de la sauvegarde"
    exit 1
fi
EOF
    
    sudo chmod +x /usr/local/bin/backup-spatial-db.sh
    
    # Configuration cron pour les sauvegardes quotidiennes
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-spatial-db.sh") | crontab -
    
    success "Sauvegardes automatiques configurées"
}

# Installation de PHP et extensions
install_php() {
    log "Installation de PHP et extensions..."
    
    sudo apt install -y php php-mysql php-curl php-json php-mbstring php-xml php-zip
    
    # Configuration PHP
    sudo tee /etc/php/8.1/mods-available/spatial-research.ini > /dev/null <<EOF
; Configuration PHP pour Spatial Research Lab
memory_limit = 512M
max_execution_time = 300
upload_max_filesize = 100M
post_max_size = 100M
date.timezone = Europe/Paris
display_errors = Off
log_errors = On
error_log = /var/log/php/error.log
EOF
    
    sudo phpenmod spatial-research
    
    success "PHP installé et configuré"
}

# Configuration des logs
setup_logging() {
    log "Configuration des logs..."
    
    # Création des répertoires de logs
    sudo mkdir -p /var/log/spatial-research
    sudo mkdir -p /var/log/php
    
    # Configuration des permissions
    sudo chown -R www-data:www-data /var/log/spatial-research
    sudo chown -R www-data:www-data /var/log/php
    
    # Rotation des logs
    sudo tee /etc/logrotate.d/spatial-research > /dev/null <<EOF
/var/log/spatial-research/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
EOF
    
    success "Logging configuré"
}

# Installation et configuration de Nginx
install_nginx() {
    log "Installation de Nginx..."
    
    sudo apt install -y nginx
    
    # Configuration Nginx
    sudo tee /etc/nginx/sites-available/spatial-research > /dev/null <<'EOF'
server {
    listen 80;
    server_name localhost;
    root /var/www/spatial-research-lab;
    index index.html index.php;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api/ {
        alias /var/www/spatial-research-lab/backend/;
        try_files $uri $uri/ /api/index.php?$query_string;
        
        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $request_filename;
        }
    }

    # Assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gestion des erreurs
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
}
EOF
    
    # Activation du site
    sudo ln -sf /etc/nginx/sites-available/spatial-research /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test et redémarrage
    sudo nginx -t
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    success "Nginx installé et configuré"
}

# Déploiement de l'application
deploy_application() {
    log "Déploiement de l'application..."
    
    # Création du répertoire web
    sudo mkdir -p /var/www/spatial-research-lab
    sudo chown -R $USER:$USER /var/www/spatial-research-lab
    
    # Copie des fichiers (à adapter selon votre méthode de déploiement)
    cp -r . /var/www/spatial-research-lab/
    
    # Configuration des permissions
    sudo chown -R www-data:www-data /var/www/spatial-research-lab/backend/data
    sudo chmod -R 755 /var/www/spatial-research-lab/backend/data
    
    success "Application déployée"
}

# Fonction principale
main() {
    log "Début de l'installation de Spatial Research Lab Database"
    
    check_root
    check_os
    
    # Mise à jour du système
    log "Mise à jour du système..."
    sudo apt update && sudo apt upgrade -y
    
    # Installation des composants
    install_mysql
    configure_mysql
    setup_database
    import_schemas
    setup_backups
    install_php
    setup_logging
    install_nginx
    deploy_application
    
    success "Installation terminée avec succès!"
    log "URL: http://localhost"
    log "Compte admin: admin@spatial-research.com / password"
    log "Base de données: spatial_research"
    warning "Pensez à changer les mots de passe par défaut!"
}

# Exécution du script
main "$@"