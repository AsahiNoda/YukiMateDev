#!/bin/bash

# EAS Secrets Setup Script for Slope Link
# This script configures environment variables for EAS Build

echo "🚀 Setting up EAS Secrets for Slope Link..."
echo ""

# Read from .env file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file first. See .env.example for reference."
    exit 1
fi

# Source the .env file
source .env

echo "📝 Setting Supabase configuration..."

# Set Supabase URL
if [ -n "$EXPO_PUBLIC_SUPABASE_URL" ]; then
    echo "Setting EXPO_PUBLIC_SUPABASE_URL..."
    eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "$EXPO_PUBLIC_SUPABASE_URL" --type string --force
else
    echo "⚠️  Warning: EXPO_PUBLIC_SUPABASE_URL not found in .env"
fi

# Set Supabase Anon Key
if [ -n "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "Setting EXPO_PUBLIC_SUPABASE_ANON_KEY..."
    eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "$EXPO_PUBLIC_SUPABASE_ANON_KEY" --type string --force
else
    echo "⚠️  Warning: EXPO_PUBLIC_SUPABASE_ANON_KEY not found in .env"
fi

# Set Sentry DSN (optional)
if [ -n "$EXPO_PUBLIC_SENTRY_DSN" ]; then
    echo "Setting EXPO_PUBLIC_SENTRY_DSN..."
    eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "$EXPO_PUBLIC_SENTRY_DSN" --type string --force
else
    echo "ℹ️  Skipping EXPO_PUBLIC_SENTRY_DSN (not configured)"
fi

# Set Amplitude API Key (optional)
if [ -n "$EXPO_PUBLIC_AMPLITUDE_API_KEY" ]; then
    echo "Setting EXPO_PUBLIC_AMPLITUDE_API_KEY..."
    eas secret:create --scope project --name EXPO_PUBLIC_AMPLITUDE_API_KEY --value "$EXPO_PUBLIC_AMPLITUDE_API_KEY" --type string --force
else
    echo "ℹ️  Skipping EXPO_PUBLIC_AMPLITUDE_API_KEY (not configured)"
fi

echo ""
echo "✅ EAS Secrets setup complete!"
echo ""
echo "📋 Listing all secrets:"
eas secret:list

echo ""
echo "🎉 You can now build your app with:"
echo "  eas build --profile preview --platform android"
echo "  eas build --profile preview --platform ios"
