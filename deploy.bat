@echo off
echo Building quiz application for deployment...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ✅ Build successful!
echo.
echo Your quiz app is ready for deployment in the 'out' folder.
echo.
echo Next steps:
echo 1. Upload the 'out' folder contents to any static hosting service
echo 2. Or follow the GitHub Pages guide in FREE-HOSTING.md
echo.
pause
