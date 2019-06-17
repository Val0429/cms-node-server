if not exist "%ProgramW6432%/MongoDB/log" mkdir "%ProgramW6432%/MongoDB/log"

if not exist "%ProgramW6432%/MongoDB/data" mkdir "%ProgramW6432%/MongoDB/data"    

"%MONGODB_HOME%\mongod" --dbpath="%ProgramW6432%\MongoDB\data" --logpath="%ProgramW6432%\MongoDB\log\log" --wiredTigerCacheSizeGB 5 --install --replSet "rsCMS3"
net start "MongoDB"