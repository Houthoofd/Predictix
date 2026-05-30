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

echo [1/2] Demarrage du Serveur Backend (Express + SQLite)...
start "Predictix Backend" cmd /k "cd backend && npm run dev"

echo [2/2] Demarrage du Serveur Frontend (React + Vite)...
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
