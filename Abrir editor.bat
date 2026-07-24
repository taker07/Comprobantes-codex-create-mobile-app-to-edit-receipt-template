@echo off
setlocal

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0abrir-editor.ps1"

if errorlevel 1 (
  echo.
  echo No se pudo abrir el editor.
  pause
)

endlocal
