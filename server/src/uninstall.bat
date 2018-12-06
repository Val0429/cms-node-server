net stop "cms30configserver.exe"
node windows-service-installer.js -u

REM removed mongo uninstallation refer to bug #9087
REM call "%~dp0mongodb\mongo_uninstall.bat"