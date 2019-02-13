REM if not exist "C:/Program Files/MongoDB/log" mkdir "C:/Program Files/MongoDB/log"
REM cd "%~dp0mongodb"
REM if not exist "C:/Program Files/MongoDB/data" (
REM      mkdir "C:/Program Files/MongoDB/data"    
REM     call "mongo_install.bat"
REM     call "mongo_restore.bat"
REM ) else (
REM     call "mongo_install.bat"
REM )
REM cd ..
"C:\Program Files\nodejs\node.exe" windows-service-installer.js -i
REM net start "cms30configserver.exe"
REM pause