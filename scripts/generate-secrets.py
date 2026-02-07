#!/usr/bin/env python3
"""
Generate secure secrets for Vitracka Weight Management System
Run this script to generate JWT_SECRET, ENCRYPTION_KEY, and API_SECRET_KEY
"""

import secrets
import string

def generate_jwt_secret(length=64):
    """Generate a secure JWT secret (64 characters)"""
    alphabet = string.ascii_letters + string.digits + '_-'
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_encryption_key(length=32):
    """Generate a secure encryption key (exactly 32 characters for AES-256)"""
    # Use hex encoding for encryption key (32 hex chars = 16 bytes = 128 bits)
    # For AES-256, we need 32 bytes, so 64 hex characters
    return secrets.token_hex(16)  # 16 bytes = 32 hex characters

def generate_api_secret_key(length=64):
    """Generate a secure API secret key (64 characters)"""
    alphabet = string.ascii_letters + string.digits + '_-'
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_database_password(length=32):
    """Generate a secure database password (32 characters)"""
    # Include special characters for database password
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def main():
    print("=" * 70)
    print("Vitracka Weight Management System - Secret Generator")
    print("=" * 70)
    print()
    
    # Generate all secrets
    jwt_secret = generate_jwt_secret()
    encryption_key = generate_encryption_key()
    api_secret_key = generate_api_secret_key()
    db_password = generate_database_password()
    
    print("Generated Secrets (copy these to your .env file):")
    print("-" * 70)
    print()
    print(f"JWT_SECRET={jwt_secret}")
    print(f"ENCRYPTION_KEY={encryption_key}")
    print(f"API_SECRET_KEY={api_secret_key}")
    print(f"DB_PASSWORD={db_password}")
    print()
    print("-" * 70)
    print()
    print("IMPORTANT SECURITY NOTES:")
    print("1. Keep these secrets secure and never commit them to Git")
    print("2. Use different secrets for development, staging, and production")
    print("3. Store production secrets in AWS Secrets Manager")
    print("4. If you lose the ENCRYPTION_KEY, encrypted data cannot be recovered")
    print("5. Save these secrets in a secure password manager")
    print()
    print("Secret Details:")
    print(f"  - JWT_SECRET: {len(jwt_secret)} characters (for authentication tokens)")
    print(f"  - ENCRYPTION_KEY: {len(encryption_key)} characters (for data encryption)")
    print(f"  - API_SECRET_KEY: {len(api_secret_key)} characters (for API authentication)")
    print(f"  - DB_PASSWORD: {len(db_password)} characters (for database access)")
    print()
    print("=" * 70)

if __name__ == "__main__":
    main()
