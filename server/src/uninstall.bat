net stop "cms30configserver.exe"
"c:\Program Files\nodejs\node.exe" windows-service-installer.js -u

REM removed mongo uninstallation refer to bug #9087
REM call "%~dp0mongodb\mongo_uninstall.bat"