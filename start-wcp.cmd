@echo off
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "FRONT=%ROOT%\SmartShelf_WCP_front"
set "BACK=%ROOT%\SmartShelf_WCP_backend"
set "BACK_START=%BACK%\scripts\start-backend.ps1"
set "LOGIN_URL=http://127.0.0.1:3000/"
set "LOCK_FILE=%ROOT%\.wcp-launching.lock"

if not exist "%FRONT%\package.json" (
  echo Frontend klasoru bulunamadi: %FRONT%
  pause
  exit /b 1
)

if not exist "%BACK%\go.mod" (
  echo Backend klasoru bulunamadi: %BACK%
  pause
  exit /b 1
)

if not exist "%BACK_START%" (
  echo Backend baslatma scripti bulunamadi: %BACK_START%
  pause
  exit /b 1
)

where go >nul 2>nul
if errorlevel 1 (
  echo Go PATH icinde bulunamadi.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm PATH icinde bulunamadi.
  pause
  exit /b 1
)

if exist "%LOCK_FILE%" (
  powershell -NoProfile -Command "$lock=Get-Item -LiteralPath '%LOCK_FILE%' -ErrorAction SilentlyContinue; $front=[bool](Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object LocalPort -eq 3000 | Select-Object -First 1); $back=[bool](Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object LocalPort -eq 8080 | Select-Object -First 1); $stale=$false; if($lock){ $stale=((Get-Date) - $lock.LastWriteTime).TotalSeconds -gt 45 }; if(((-not $front) -and (-not $back)) -or $stale){ Remove-Item -LiteralPath '%LOCK_FILE%' -ErrorAction SilentlyContinue }"
)

if exist "%LOCK_FILE%" (
  echo WCP zaten baslatiliyor.
  exit /b 0
)

type nul > "%LOCK_FILE%"

powershell -NoProfile -Command ^
  "$front='%FRONT%'; $backStart='%BACK_START%'; $url='%LOGIN_URL%';" ^
  "$backendRunning=[bool](Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object LocalPort -eq 8080 | Select-Object -First 1);" ^
  "if(-not $backendRunning){ Start-Process powershell.exe -WorkingDirectory (Split-Path -Parent $backStart) -ArgumentList '-NoExit','-NoProfile','-ExecutionPolicy','Bypass','-File',$backStart | Out-Null };" ^
  "$frontRunning=[bool](Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object LocalPort -eq 3000 | Select-Object -First 1);" ^
  "if(-not $frontRunning){ Start-Process powershell.exe -WorkingDirectory $front -ArgumentList '-NoExit','-NoProfile','-Command','npm.cmd run dev -- --hostname 127.0.0.1' | Out-Null }"

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 20; Start-Process '%LOGIN_URL%'; Remove-Item -LiteralPath '%LOCK_FILE%' -ErrorAction SilentlyContinue"

echo WCP baslatma pencereleri acildi.
echo Bu pencere 5 saniye sonra kapanacak.
timeout /t 5 /nobreak >nul
exit /b 0
