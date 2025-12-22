@echo off
REM EAS Secrets Setup Script for Slope Link (Windows)
REM This script configures environment variables for EAS Build

echo Setting up EAS Secrets for Slope Link...
echo.

REM Check if .env file exists
if not exist .env (
    echo Error: .env file not found!
    echo Please create a .env file first. See .env.example for reference.
    exit /b 1
)

echo Setting Supabase configuration...
echo.

REM Read EXPO_PUBLIC_SUPABASE_URL from .env
for /f "tokens=1,2 delims==" %%a in ('findstr "^EXPO_PUBLIC_SUPABASE_URL=" .env') do (
    set SUPABASE_URL=%%b
)

REM Read EXPO_PUBLIC_SUPABASE_ANON_KEY from .env
for /f "tokens=1,2 delims==" %%a in ('findstr "^EXPO_PUBLIC_SUPABASE_ANON_KEY=" .env') do (
    set SUPABASE_ANON_KEY=%%b
)

REM Set Supabase URL
if defined SUPABASE_URL (
    echo Setting EXPO_PUBLIC_SUPABASE_URL...
    eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "%SUPABASE_URL%" --type string --force
) else (
    echo Warning: EXPO_PUBLIC_SUPABASE_URL not found in .env
)

REM Set Supabase Anon Key
if defined SUPABASE_ANON_KEY (
    echo Setting EXPO_PUBLIC_SUPABASE_ANON_KEY...
    eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "%SUPABASE_ANON_KEY%" --type string --force
) else (
    echo Warning: EXPO_PUBLIC_SUPABASE_ANON_KEY not found in .env
)

echo.
echo EAS Secrets setup complete!
echo.
echo Listing all secrets:
eas secret:list

echo.
echo You can now build your app with:
echo   eas build --profile preview --platform android
echo   eas build --profile preview --platform ios
