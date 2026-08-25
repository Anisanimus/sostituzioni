@echo off
title Gestione Sostituzioni e Orario Scolastico
echo ===================================================
echo   AVVIO APP SOSTITUZIONI DOCENTI E ORARIO SCUOLA
echo ===================================================
echo.
echo Avvio del server locale in corso...
start http://localhost:5173
call npm.cmd run dev
pause
