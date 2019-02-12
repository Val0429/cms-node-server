if not exist "C:/Program Files/MongoDB/log" mkdir "C:/Program Files/MongoDB/log"
cd "%~dp0mongodb"
if not exist "C:/Program Files/MongoDB/data" (
    mkdir "C:/Program Files/MongoDB/data"    
    "C:/Program Files/MongoDB/Server/3.4/bin/mongod.exe" --dbpath="C:\Program Files\MongoDB\data" --logpath="C:\Program Files\MongoDB\log\log" --wiredTigerCacheSizeGB 0.5 --install
    net start "MongoDB"
    call "mongo_restore.bat"
) else (
    "C:/Program Files/MongoDB/Server/3.4/bin/mongod.exe" --dbpath="C:\Program Files\MongoDB\data" --logpath="C:\Program Files\MongoDB\log\log" --wiredTigerCacheSizeGB 0.5 --install
    net start "MongoDB"
)

