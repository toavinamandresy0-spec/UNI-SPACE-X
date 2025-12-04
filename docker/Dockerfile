# Dockerfile pour l'application Spatial Research Lab
# Image multi-étapes pour le backend PHP

# Étape 1 : Builder l'application
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./
COPY vite.config.js ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY frontend/ ./frontend/
COPY index.html ./

# Builder l'application
RUN npm run build

# Étape 2 : Backend PHP
FROM php:8.1-fpm-alpine AS backend

# Installer les dépendances système
RUN apk add --no-cache \
    git \
    zip \
    unzip \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    oniguruma-dev \
    icu-dev \
    postgresql-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo_mysql \
        pdo_pgsql \
        mysqli \
        gd \
        zip \
        intl \
        mbstring \
        exif \
        pcntl

# Installer Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Installer les extensions PHP supplémentaires
RUN pecl install redis && docker-php-ext-enable redis

# Configurer PHP
COPY docker/php/php.ini /usr/local/etc/php/conf.d/custom.ini

WORKDIR /var/www/html

# Copier les fichiers du backend
COPY backend/ .

# Installer les dépendances PHP
RUN composer install --no-dev --optimize-autoloader

# Créer les répertoires de données
RUN mkdir -p data/exports data/uploads data/backups \
    && chown -R www-data:www-data data \
    && chmod -R 755 data

# Étape 3 : Image finale avec Nginx
FROM nginx:1.23-alpine

# Installer les dépendances supplémentaires
RUN apk add --no-cache \
    php81 \
    php81-fpm \
    php81-mysqli \
    php81-pdo \
    php81-pdo_mysql \
    php81-json \
    php81-curl \
    php81-zip \
    php81-gd \
    php81-mbstring \
    php81-xml

# Configurer Nginx et PHP-FPM
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker/php/www.conf /etc/php81/php-fpm.d/www.conf

# Copier le frontend construit
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copier le backend
COPY --from=backend /var/www/html /var/www/backend

# Créer les répertoires de logs
RUN mkdir -p /var/log/nginx /var/log/php \
    && chown -R nginx:nginx /var/log/nginx /var/log/php

# Exposer les ports
EXPOSE 80 443

# Script de démarrage
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

# Santé check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["/start.sh"]