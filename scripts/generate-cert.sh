#!/bin/bash

# Создаем папку для сертификатов
mkdir -p certs

# Генерируем самоподписанный сертификат для localhost
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout certs/localhost-key.pem \
  -out certs/localhost-cert.pem \
  -days 365 \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"

echo "SSL сертификаты успешно созданы в папке certs/"
echo "Файлы:"
echo "  - certs/localhost-cert.pem (сертификат)"
echo "  - certs/localhost-key.pem (приватный ключ)"

