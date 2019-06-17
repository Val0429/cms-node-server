if not exist "%ProgramW6432%/MongoDB/log" mkdir "%ProgramW6432%/MongoDB/log"
cd "%~dp0mongodb"
if not exist "%ProgramW6432%/MongoDB/data" (
    mkdir "%ProgramW6432%/MongoDB/data"    
    "%MONGODB_HOME%\mongod" --dbpath="%ProgramW6432%\MongoDB\data" --logpath="%ProgramW6432%\MongoDB\log\log" --wiredTigerCacheSizeGB 5 --install
    net start "MongoDB"
    call "mongo_restore.bat"
) else (
    "%MONGODB_HOME%\mongod" --dbpath="%ProgramW6432%\MongoDB\data" --logpath="%ProgramW6432%\MongoDB\log\log" --wiredTigerCacheSizeGB 5 --install
    net start "MongoDB"
)


