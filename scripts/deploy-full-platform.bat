@echo off
echo ========================================
echo CaribPredict Full Platform Deployment
echo ========================================
echo.

echo Step 1/6: Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)
echo.

echo Step 2/6: Generating Caribbean markets...
call npm run batch-generate
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Market generation had errors, continuing anyway...
)
echo.

echo Step 3/6: Building Next.js application...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed
    exit /b 1
)
echo.

echo Step 4/6: Checking git status...
git status
echo.

echo Step 5/6: Committing changes...
git add .
git commit -m "Transform CaribPredict: Full trading platform with markets, leaderboard, and activity feeds"
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Nothing to commit or commit failed
)
echo.

echo Step 6/6: Pushing to GitHub (will trigger Vercel deployment)...
git push origin master
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Push failed
    exit /b 1
)
echo.

echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Check Vercel dashboard for deployment status
echo 2. Visit caribpredict.com to see your changes
echo 3. Test trading functionality
echo.
pause
