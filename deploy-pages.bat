@echo off
echo Deploying quiz app to GitHub Pages...
echo.

echo Step 1: Building the application...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo Step 2: Copying built files for GitHub Pages...

REM Create a temporary backup of important files
if exist README.md copy README.md README.md.backup > nul
if exist package.json copy package.json package.json.backup > nul

REM Copy all files from out directory to root
xcopy out\* . /s /y > nul

REM Create .nojekyll file for GitHub Pages
echo. > .nojekyll

echo.
echo Step 3: Committing and pushing to GitHub...
git add .
git commit -m "Deploy quiz app to GitHub Pages"
git push origin master:main

echo.
echo ✅ Deployment complete!
echo Your quiz app should be live at: https://gaurav-beep.github.io/quiz-application/
echo.

REM Restore backed up files
if exist README.md.backup (
    copy README.md.backup README.md > nul
    del README.md.backup > nul
)
if exist package.json.backup (
    copy package.json.backup package.json > nul
    del package.json.backup > nul
)

pause
