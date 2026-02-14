@echo off
setlocal enabledelayedexpansion

REM ###############################################################################
REM BTCPay Environment Setup Script for CaribPredict (Windows)
REM
REM This script helps you configure BTCPay Server environment variables
REM and validates the connection to ensure everything is working correctly.
REM
REM Usage:
REM   scripts\setup-btcpay-env.bat
REM
REM Requirements:
REM   - curl (bundled with Windows 10+)
REM ###############################################################################

color 0B
cls

echo.
echo ================================================================
echo    BTCPay Server Environment Setup for CaribPredict
echo ================================================================
echo.

REM Script directory
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "ENV_FILE=%PROJECT_ROOT%\.env.local"

REM ###############################################################################
REM Helper Functions
REM ###############################################################################

REM Check if curl is available
where curl >nul 2>&1
if errorlevel 1 (
    echo [ERROR] curl is not installed or not in PATH
    echo.
    echo curl is required for API testing.
    echo On Windows 10+, curl should be available by default.
    echo.
    echo If curl is missing, install it from: https://curl.se/windows/
    pause
    exit /b 1
)
echo [OK] curl is installed
echo.

REM Check if .env.local exists
if exist "%ENV_FILE%" (
    echo [OK] .env.local file found
    echo [WARNING] Existing .env.local will be backed up to .env.local.backup
    copy "%ENV_FILE%" "%ENV_FILE%.backup" >nul
    echo [OK] Backup created
) else (
    echo [INFO] .env.local doesn't exist yet (will create it)
)
echo.

REM ###############################################################################
REM Collect BTCPay Configuration
REM ###############################################################################

echo ================================================================
echo   BTCPay Server Configuration
echo ================================================================
echo.
echo Please provide your BTCPay Server credentials.
echo If you haven't deployed BTCPay yet, see: docs\LUNANODE-BTCPAY-DEPLOYMENT.md
echo.

:INPUT_HOST
set /p "BTCPAY_HOST=Enter your BTCPay Server URL (e.g., https://btcpay.caribpredict.com): "
if "!BTCPAY_HOST!"=="" (
    echo [ERROR] URL cannot be empty
    goto INPUT_HOST
)

REM Remove trailing slash if present
if "!BTCPAY_HOST:~-1!"=="/" (
    set "BTCPAY_HOST=!BTCPAY_HOST:~0,-1!"
)

REM Basic URL validation
echo !BTCPAY_HOST! | findstr /i "^https*://" >nul
if errorlevel 1 (
    echo [ERROR] Invalid URL format. Must start with http:// or https://
    goto INPUT_HOST
)
echo [OK] Valid URL format
echo.

:INPUT_API_KEY
set /p "BTCPAY_API_KEY=Enter your BTCPay API Key (starts with 'btcpay_'): "
if "!BTCPAY_API_KEY!"=="" (
    echo [ERROR] API Key cannot be empty
    goto INPUT_API_KEY
)
echo [OK] API Key received
echo.

:INPUT_STORE_ID
set /p "BTCPAY_STORE_ID=Enter your BTCPay Store ID: "
if "!BTCPAY_STORE_ID!"=="" (
    echo [ERROR] Store ID cannot be empty
    goto INPUT_STORE_ID
)
echo [OK] Store ID received
echo.

echo [INFO] Generate a webhook secret with: powershell -Command "[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))"
echo.

:INPUT_WEBHOOK_SECRET
set /p "BTCPAY_WEBHOOK_SECRET=Enter your BTCPay Webhook Secret: "
if "!BTCPAY_WEBHOOK_SECRET!"=="" (
    echo [ERROR] Webhook secret cannot be empty
    goto INPUT_WEBHOOK_SECRET
)
echo [OK] Webhook secret received
echo.

set /p "NEXT_PUBLIC_SITE_URL=Enter your CaribPredict site URL [https://www.caribpredict.com]: "
if "!NEXT_PUBLIC_SITE_URL!"=="" (
    set "NEXT_PUBLIC_SITE_URL=https://www.caribpredict.com"
)

REM Remove trailing slash if present
if "!NEXT_PUBLIC_SITE_URL:~-1!"=="/" (
    set "NEXT_PUBLIC_SITE_URL=!NEXT_PUBLIC_SITE_URL:~0,-1!"
)

REM ###############################################################################
REM Validate BTCPay Connection
REM ###############################################################################

echo.
echo ================================================================
echo   Validating BTCPay Connection
echo ================================================================
echo.
echo [INFO] Testing connection to BTCPay Server...
echo.

REM Test 1: Check if server is reachable
echo [TEST 1] Server Reachability
curl -s -o nul -w "HTTP_CODE:%%{http_code}" "!BTCPAY_HOST!" > "%TEMP%\btcpay_test.txt"
set /p HTTP_CODE=<"%TEMP%\btcpay_test.txt"
set "HTTP_CODE=!HTTP_CODE:HTTP_CODE:=!"
del "%TEMP%\btcpay_test.txt" >nul 2>&1

if "!HTTP_CODE!"=="200" (
    echo [OK] BTCPay Server is reachable (HTTP !HTTP_CODE!)
) else if "!HTTP_CODE!"=="302" (
    echo [OK] BTCPay Server is reachable (HTTP !HTTP_CODE!)
) else if "!HTTP_CODE!"=="301" (
    echo [OK] BTCPay Server is reachable (HTTP !HTTP_CODE!)
) else (
    echo [ERROR] Cannot reach BTCPay Server (HTTP !HTTP_CODE!)
    echo [WARNING] This might be a temporary issue or incorrect URL
    echo.
    set /p "continue_choice=Continue anyway? (y/n): "
    if /i not "!continue_choice!"=="y" (
        echo [ERROR] Setup cancelled
        pause
        exit /b 1
    )
)
echo.

REM Test 2: Check API authentication
echo [TEST 2] API Authentication
curl -s -H "Authorization: token !BTCPAY_API_KEY!" -H "Content-Type: application/json" -w "HTTP_CODE:%%{http_code}" "!BTCPAY_HOST!/api/v1/stores/!BTCPAY_STORE_ID!" > "%TEMP%\btcpay_api_test.txt"

findstr /C:"HTTP_CODE:200" "%TEMP%\btcpay_api_test.txt" >nul
if errorlevel 1 (
    echo [ERROR] API authentication failed
    echo [WARNING] Please check your API key and Store ID
    type "%TEMP%\btcpay_api_test.txt"
    echo.
    set /p "continue_choice=Continue anyway? (y/n): "
    if /i not "!continue_choice!"=="y" (
        del "%TEMP%\btcpay_api_test.txt" >nul 2>&1
        echo [ERROR] Setup cancelled
        pause
        exit /b 1
    )
) else (
    echo [OK] API authentication successful
)

del "%TEMP%\btcpay_api_test.txt" >nul 2>&1
echo.

REM ###############################################################################
REM Write Environment File
REM ###############################################################################

echo ================================================================
echo   Writing Environment Variables
echo ================================================================
echo.

REM Read existing .env.local values for Supabase, etc.
set "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
set "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key"
set "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
set "BRAVE_API_KEY=your_brave_api_key"
set "CLAUDE_API_KEY=your_claude_api_key"
set "MANIFOLD_API_KEY=your_manifold_api_key"

if exist "%ENV_FILE%" (
    for /f "tokens=1,* delims==" %%a in (%ENV_FILE%) do (
        set "line=%%a"
        set "value=%%b"
        if not "!line:~0,1!"=="#" (
            if "!line!"=="NEXT_PUBLIC_SUPABASE_URL" set "NEXT_PUBLIC_SUPABASE_URL=!value!"
            if "!line!"=="NEXT_PUBLIC_SUPABASE_ANON_KEY" set "NEXT_PUBLIC_SUPABASE_ANON_KEY=!value!"
            if "!line!"=="SUPABASE_SERVICE_ROLE_KEY" set "SUPABASE_SERVICE_ROLE_KEY=!value!"
            if "!line!"=="BRAVE_API_KEY" set "BRAVE_API_KEY=!value!"
            if "!line!"=="CLAUDE_API_KEY" set "CLAUDE_API_KEY=!value!"
            if "!line!"=="MANIFOLD_API_KEY" set "MANIFOLD_API_KEY=!value!"
        )
    )
)

REM Create/update .env.local with BTCPay variables
(
echo # Supabase Configuration
echo NEXT_PUBLIC_SUPABASE_URL=!NEXT_PUBLIC_SUPABASE_URL!
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=!NEXT_PUBLIC_SUPABASE_ANON_KEY!
echo SUPABASE_SERVICE_ROLE_KEY=!SUPABASE_SERVICE_ROLE_KEY!
echo.
echo # BTCPay Server Configuration
echo BTCPAY_HOST=!BTCPAY_HOST!
echo BTCPAY_API_KEY=!BTCPAY_API_KEY!
echo BTCPAY_STORE_ID=!BTCPAY_STORE_ID!
echo BTCPAY_WEBHOOK_SECRET=!BTCPAY_WEBHOOK_SECRET!
echo.
echo # Site Configuration
echo NEXT_PUBLIC_SITE_URL=!NEXT_PUBLIC_SITE_URL!
echo.
echo # API Keys
echo BRAVE_API_KEY=!BRAVE_API_KEY!
echo CLAUDE_API_KEY=!CLAUDE_API_KEY!
echo.
echo # Optional: Manifold Markets Integration
echo MANIFOLD_API_KEY=!MANIFOLD_API_KEY!
) > "%ENV_FILE%"

echo [OK] Environment variables written to %ENV_FILE%
echo.

REM ###############################################################################
REM Display Summary
REM ###############################################################################

color 0A
echo ================================================================
echo   Setup Complete!
echo ================================================================
echo.

echo Configuration Summary:
echo   BTCPay Host:      !BTCPAY_HOST!
echo   Store ID:         !BTCPAY_STORE_ID!
echo   API Key:          !BTCPAY_API_KEY:~0,15!...!BTCPAY_API_KEY:~-10!
echo   Webhook Secret:   !BTCPAY_WEBHOOK_SECRET:~0,10!...!BTCPAY_WEBHOOK_SECRET:~-10!
echo   Site URL:         !NEXT_PUBLIC_SITE_URL!
echo.

echo Next Steps:
echo.
echo 1. Configure Webhook in BTCPay:
echo    - Go to: !BTCPAY_HOST!/stores/!BTCPAY_STORE_ID!/webhooks
echo    - Add webhook URL: !NEXT_PUBLIC_SITE_URL!/api/webhooks/btcpay
echo    - Use the webhook secret you provided
echo.
echo 2. Test Locally:
echo    cd "%PROJECT_ROOT%"
echo    npm run dev
echo    Visit http://localhost:3000 and try creating a deposit
echo.
echo 3. Deploy to Vercel:
echo    See: docs\DEPLOY-BTCPAY-TO-VERCEL.md
echo    Add all environment variables to Vercel
echo    Redeploy your application
echo.
echo 4. Test Production:
echo    Visit !NEXT_PUBLIC_SITE_URL!
echo    Make a small test deposit ($5-10)
echo    Verify balance updates after payment
echo.

echo [OK] BTCPay Server is ready to use!
echo.
echo [INFO] For troubleshooting, see: docs\LUNANODE-BTCPAY-DEPLOYMENT.md
echo.

REM ###############################################################################
REM Generate Quick Reference
REM ###############################################################################

set "QUICK_REF_FILE=%PROJECT_ROOT%\BTCPAY-CREDENTIALS.txt"

(
echo ================================================================
echo          BTCPay Server Credentials - CaribPredict
echo ================================================================
echo.
echo WARNING: KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT
echo.
echo Generated: %DATE% %TIME%
echo.
echo BTCPay Server URL:
echo   !BTCPAY_HOST!
echo.
echo Store ID:
echo   !BTCPAY_STORE_ID!
echo.
echo API Key:
echo   !BTCPAY_API_KEY!
echo.
echo Webhook Secret:
echo   !BTCPAY_WEBHOOK_SECRET!
echo.
echo Webhook URL (configure in BTCPay):
echo   !NEXT_PUBLIC_SITE_URL!/api/webhooks/btcpay
echo.
echo Quick Links:
echo   - Dashboard:  !BTCPAY_HOST!
echo   - Store:      !BTCPAY_HOST!/stores/!BTCPAY_STORE_ID!
echo   - Webhooks:   !BTCPAY_HOST!/stores/!BTCPAY_STORE_ID!/webhooks
echo   - Invoices:   !BTCPAY_HOST!/invoices
echo   - Wallets:    !BTCPAY_HOST!/wallets
echo.
echo Test Commands:
echo   REM Check store
echo   curl -H "Authorization: token !BTCPAY_API_KEY!" !BTCPAY_HOST!/api/v1/stores/!BTCPAY_STORE_ID!
echo.
echo   REM Create test invoice
echo   curl -X POST -H "Authorization: token !BTCPAY_API_KEY!" -H "Content-Type: application/json" -d "{\"amount\":\"10\",\"currency\":\"USD\"}" !BTCPAY_HOST!/api/v1/stores/!BTCPAY_STORE_ID!/invoices
echo.
echo ================================================================
) > "%QUICK_REF_FILE%"

echo [OK] Quick reference saved to: %QUICK_REF_FILE%
echo [WARNING] Keep this file secure and do not commit to Git!
echo.
echo Happy Bitcoin payments!
echo.

pause
