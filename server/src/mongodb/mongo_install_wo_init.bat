@ECHO OFF
if not exist "%ProgramW6432%/MongoDB/log_cms3" mkdir "%ProgramW6432%/MongoDB/log_cms3"
if not exist "%ProgramW6432%/MongoDB/data_cms3" mkdir "%ProgramW6432%/MongoDB/data_cms3"

if not exist "%ProgramW6432%\MongoDB\cms3_mongo.cfg" goto installWOConfig
echo "installWithConfig"
"%MONGODB_HOME%\mongod" --config "%ProgramW6432%\MongoDB\cms3_mongo.cfg"  --install --serviceName "CMS3 MongoDB" --serviceDisplayName "CMS3 MongoDB"
goto commonExit

:installWOConfig
echo "installWithOutConfig"
"%MONGODB_HOME%\mongod" --dbpath "%ProgramW6432%\MongoDB\data_cms3" --logpath="%ProgramW6432%\MongoDB\log_cms3\log.txt" --install --serviceName "CMS3 MongoDB" --serviceDisplayName "CMS3 MongoDB" --replSet rsCMS3

:commonExit
net start "CMS3 MongoDB"