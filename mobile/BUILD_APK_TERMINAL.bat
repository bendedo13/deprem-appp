@echo off
REM Deprem App - Terminal ile APK Build Script
REM Windows için

echo ===============================================================
echo DEPREM APP - TERMINAL ILE APK BUILD
echo ===============================================================
echo.

REM Gerekli programları kontrol et
echo [1/7] Gereksinimleri kontrol ediliyor...
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] Node.js bulunamadi! Lutfen Node.js yukleyin.
    echo https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js bulundu

where java >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [UYARI] Java JDK bulunamadi! Android build icin gerekli.
    echo https://adoptium.net/
    echo.
    echo Devam etmek istiyor musunuz? (E/H)
    set /p continue=
    if /i not "%continue%"=="E" exit /b 1
)
echo [OK] Java bulundu

echo.
echo [2/7] Bagimliliklari yukleniyor...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] npm install basarisiz!
    pause
    exit /b 1
)

echo.
echo [3/7] Expo prebuild yapiliyor (android klasoru olusturuluyor)...
call npx expo prebuild --platform android --clean
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] Prebuild basarisiz!
    pause
    exit /b 1
)

echo.
echo [4/7] Android klasorune geciliyor...
cd android
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] android klasoru bulunamadi!
    pause
    exit /b 1
)

echo.
echo [5/7] Gradle wrapper izinleri ayarlanıyor...
if exist gradlew.bat (
    echo [OK] gradlew.bat bulundu
) else (
    echo [HATA] gradlew.bat bulunamadi!
    pause
    exit /b 1
)

echo.
echo [6/7] APK build baslatiliyor...
echo Bu islem 10-15 dakika surebilir, lutfen bekleyin...
echo.
call gradlew.bat assembleRelease
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] APK build basarisiz!
    echo.
    echo Olasi cozumler:
    echo 1. ANDROID_HOME environment variable ayarlanmis mi?
    echo 2. Java JDK yuklu mu?
    echo 3. Android SDK yuklu mu?
    pause
    exit /b 1
)

echo.
echo [7/7] APK kopyalaniyor...
if exist app\build\outputs\apk\release\app-release.apk (
    copy app\build\outputs\apk\release\app-release.apk ..\..\deprem-app.apk
    echo.
    echo ===============================================================
    echo [BASARILI] APK olusturuldu!
    echo ===============================================================
    echo.
    echo APK konumu: mobile\deprem-app.apk
    echo Boyut:
    dir ..\..\deprem-app.apk | find "deprem-app.apk"
    echo.
    echo APK'yi Android cihaziniza yukleyebilirsiniz!
    echo ===============================================================
) else (
    echo [HATA] APK dosyasi bulunamadi!
    echo Beklenen konum: app\build\outputs\apk\release\app-release.apk
    pause
    exit /b 1
)

cd ..
pause
