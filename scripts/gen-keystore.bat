@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM Noor Connect — Release Keystore Generator (Windows CMD / Batch)
REM ==============================================================================
REM This script generates a 2048-bit RSA release signing keystore for Noor Connect.
REM
REM USAGE:
REM   scripts\gen-keystore.bat [STOREPASS] [KEYPASS] [ALIAS] [KEYSTORE_FILE]
REM
REM EXAMPLES:
REM   scripts\gen-keystore.bat
REM   scripts\gen-keystore.bat noor123connect noor123connect noor-connect
REM
REM HOW TO ENCODE FOR GITHUB SECRETS (KEYSTORE_BASE64):
REM   PowerShell:
REM     [Convert]::ToBase64String([IO.File]::ReadAllBytes("noor-connect-release.keystore"))
REM   Or export to file:
REM     powershell -Command "[Convert]::ToBase64String([IO.File]::ReadAllBytes('noor-connect-release.keystore')) | Out-File -Encoding ascii keystore.txt"
REM
REM GITHUB SECRETS TO CONFIGURE:
REM   1. KEYSTORE_BASE64     -> Base64 string of noor-connect-release.keystore
REM   2. KEYSTORE_STORE_PASS -> noor123connect
REM   3. KEYSTORE_KEY_PASS   -> noor123connect
REM   4. KEYSTORE_ALIAS      -> noor-connect
REM
REM WARNING: NEVER commit *.keystore or keystore.txt into Git!
REM ==============================================================================

set "STOREPASS=%~1"
if "%STOREPASS%"=="" set "STOREPASS=noor123connect"

set "KEYPASS=%~2"
if "%KEYPASS%"=="" set "KEYPASS=noor123connect"

set "ALIAS=%~3"
if "%ALIAS%"=="" set "ALIAS=noor-connect"

set "KEYSTORE_FILE=%~4"
if "%KEYSTORE_FILE%"=="" set "KEYSTORE_FILE=noor-connect-release.keystore"

set "DNAME=CN=Noor Connect, OU=Release, O=Noor Connect, C=US"

REM Locate keytool
set "KEYTOOL_CMD=keytool"
where keytool >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    if defined JAVA_HOME (
        if exist "%JAVA_HOME%\bin\keytool.exe" (
            set "KEYTOOL_CMD=%JAVA_HOME%\bin\keytool.exe"
        )
    )
)
if "%KEYTOOL_CMD%"=="keytool" (
    where keytool >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        if exist "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" (
            set "KEYTOOL_CMD=C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"
        )
    )
)

echo =======================================================
echo Generating Release Keystore for Noor Connect
echo   Keystore File: %KEYSTORE_FILE%
echo   Key Alias:     %ALIAS%
echo   Using Keytool: "%KEYTOOL_CMD%"
echo =======================================================

if exist "%KEYSTORE_FILE%" (
    echo [WARNING] "%KEYSTORE_FILE%" already exists. Overwriting...
    del /f /q "%KEYSTORE_FILE%"
)

"%KEYTOOL_CMD%" -genkeypair -v ^
  -keystore "%KEYSTORE_FILE%" ^
  -alias "%ALIAS%" ^
  -keyalg RSA ^
  -keysize 2048 ^
  -validity 10000 ^
  -storepass "%STOREPASS%" ^
  -keypass "%KEYPASS%" ^
  -dname "%DNAME%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Release keystore generated successfully: %KEYSTORE_FILE%
    echo.
    echo Copy base64 string for GitHub Secret KEYSTORE_BASE64 using PowerShell:
    echo   [Convert]::ToBase64String^[([IO.File]::ReadAllBytes^("%KEYSTORE_FILE%"^)^)^]
    echo.
) else (
    echo.
    echo [ERROR] Failed to generate release keystore.
    exit /b %ERRORLEVEL%
)

endlocal
