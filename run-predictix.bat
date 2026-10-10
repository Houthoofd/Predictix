@echo off
setlocal enabledelayedexpansion
title Predictix Launcher

REM ========================================================================
REM Script de démarrage de PREDICTIX (Backend + Frontend)
REM ========================================================================

cd /d "%~dp0"

echo ========================================================================
echo          DEMARRAGE DE PREDICTIX - Sports Betting Intelligence
echo ========================================================================
echo.

REM Liberer les ports 3000 (Vite) et 5000 (Express) s'ils sont occupes
echo [*] Verification et liberation des ports 3000 et 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
echo [OK] Ports prets.
echo.

REM Demarrage du Serveur Backend
echo [1/2] Demarrage du Serveur Backend (Node + Express + tRPC + SQLite)...
start "Predictix Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

REM Demarrage du Serveur Frontend
echo [2/2] Demarrage du Serveur Frontend (React + Vite + Tailwind + shadcn)...
start "Predictix Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================================
echo  Predictix est en cours de demarrage !
echo.
echo    - Interface Web (Frontend) : http://localhost:3000
echo    - API ^& tRPC (Backend)     : http://localhost:5000
echo.
echo  Identifiants par defaut :
echo    - Email    : admin@predictix.io
echo    - Password : admin123
echo ========================================================================
echo.
echo Ouverture automatique du navigateur dans 3 secondes...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo Fermeture de cette fenetre de lancement.
exit
