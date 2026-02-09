@echo off
echo =========================================
echo CaribPredict - Generate All Markets
echo =========================================
echo.
echo This will generate 100+ markets for all 15 CARICOM countries...
echo.

cd /d "%~dp0"
npx tsx scripts/batch-generate-all-countries.ts

pause
