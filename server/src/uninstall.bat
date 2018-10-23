net stop "cms30configserver.exe"
node windows-service-installer.js -u

call "%~dp0mongodb\mongo_uninstall.bat"