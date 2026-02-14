@echo off
REM Quick launcher for BTCPay setup

color 0B
cls

echo.
echo ================================================================
echo        BTCPay Server Setup for CaribPredict
echo ================================================================
echo.
echo This will guide you through setting up Bitcoin payments!
echo.
echo What this does:
echo   1. Prompts you for BTCPay Server credentials
echo   2. Tests the connection to your BTCPay Server
echo   3. Updates your .env.local file automatically
echo   4. Generates a quick reference file
echo.
echo Before you start:
echo   - Deploy BTCPay Server (see: docs\BTCPAY-DEPLOYMENT-README.md)
echo   - Have your credentials ready (API key, Store ID, etc.)
echo.
pause
echo.

REM Run the setup script
call scripts\setup-btcpay-env.bat

echo.
echo ================================================================
echo.
echo Setup complete! Next steps:
echo.
echo 1. Test locally:
echo    npm run dev
echo    Visit http://localhost:3000
echo.
echo 2. Deploy to production:
echo    See: docs\DEPLOY-BTCPAY-TO-VERCEL.md
echo.
echo 3. Keep handy:
echo    Bookmark: docs\BTCPAY-QUICK-REFERENCE.md
echo.
pause
