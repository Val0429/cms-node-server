if not exist "C:/Program Files/MongoDB/log" mkdir "C:/Program Files/MongoDB/log"
cd "%~dp0mongodb"
if not exist "C:/Program Files/MongoDB/data" (
    mkdir "C:/Program Files/MongoDB/data"    
    call "mongo_install.bat"
    call "mongo_restore.bat"
) else (
    call "mongo_install.bat"
)
cd ..
node windows-service-installer.js -i
net start "cms30configserver.exe"