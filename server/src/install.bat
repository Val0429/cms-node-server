if not exist "C:/Program Files/MongoDB/log" mkdir "C:/Program Files/MongoDB/log"
if not exist "C:/Program Files/MongoDB/data" (
    mkdir "C:/Program Files/MongoDB/data"
    call "%~dp0mongodb\mongo_install.bat"
    call "%~dp0mongodb\mongo_restore.bat"
) else (
    call "%~dp0mongodb\mongo_install.bat"
)

node windows-service-installer.js -i
net start "cms30configserver.exe"