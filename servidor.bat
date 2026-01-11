@echo off
title AdminPanel Server Launcher
echo Buscando formas de iniciar el servidor sin Node.js...
echo.

:: Intenta con Python 3
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python detectado. Iniciando servidor en http://localhost:8000
    start http://localhost:8000
    python -m http.server 8000
    goto end
)

:: Intenta con Python 2
python -V >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python detectado. Iniciando servidor en http://localhost:8000
    start http://localhost:8000
    python -m SimpleHTTPServer 8000
    goto end
)

:: Intenta con PHP
php -v >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] PHP detectado. Iniciando servidor en http://localhost:8000
    start http://localhost:8000
    php -S localhost:8000
    goto end
)

:: Si no hay nada, abrir el archivo directamente (puede tener limitaciones de CORS/IndexedDB)
echo [!] No se encontro Python ni PHP. 
echo [!] Intentando abrir index.html directamente...
echo [!] Nota: Algunas funciones de la base de datos podrian no funcionar en modo archivo.
pause
start index.html

:end
pause
