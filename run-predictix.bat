@echo off
REM ========================================================================
REM Script de démarrage de PREDICTIX - Windows
REM ========================================================================

echo ========================================================================
echo          DEMARRAGE DE PREDICTIX - Sports Betting Intelligence
echo ========================================================================
echo.

REM Tuer les anciens processus s'ils existent
taskkill /IM node.exe /F >nul 2>&1

echo [1/3] Demarrage du Proxy Tor local (Port 9050)...
powershell -ExecutionPolicy Bypass -File E:\Developpement\scrapper-v3\scripts\start-tor.ps1
if errorlevel 1 (
    echo [ATTENTION] Impossible de demarrer le proxy Tor automatiquement.
    echo Assurez-vous que le service Tor est actif.
)
echo.

echo [2/3] Demarrage du Serveur Backend (Express + SQLite)...
start "Predictix Backend" cmd /k "cd backend && npm run dev"

echo [3/3] Demarrage du Serveur Frontend (React + Vite)...
start "Predictix Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================================
echo  Predictix est en cours de demarrage !
echo.
echo    - Interface Web: http://localhost:3000
echo    - Serveur API:   http://localhost:5000
echo.
echo  Appuyez sur une touche pour fermer cette fenetre de controle.
echo ========================================================================
pause >nul
