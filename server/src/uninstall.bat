net stop "cms30configserver.exe"
"c:\Program Files\nodejs\node.exe" windows-service-installer.js -u

call "%~dp0mongodb\mongo_uninstall.bat"