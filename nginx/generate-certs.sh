#!/bin/bash

# SSL Certificate Generation Script for Development
# Generates self-signed certificates for localhost

CERT_DIR="$(dirname "$0")/certs"
CERT_FILE="$CERT_DIR/localhost.crt"
KEY_FILE="$CERT_DIR/localhost.key"

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Check if certificates already exist
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "✓ SSL certificates already exist"
    echo "  Certificate: $CERT_FILE"
    echo "  Key: $KEY_FILE"
    exit 0
fi

echo "Generating self-signed SSL certificates for localhost..."

# Generate private key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/C=US/ST=State/L=City/O=Development/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

if [ $? -eq 0 ]; then
    echo "✓ SSL certificates generated successfully!"
    echo "  Certificate: $CERT_FILE"
    echo "  Key: $KEY_FILE"
    echo ""
    echo "Note: Your browser will show a security warning because this is a self-signed certificate."
    echo "This is normal for development. You'll need to accept the warning to proceed."
else
    echo "✗ Failed to generate SSL certificates"
    exit 1
fi
