@ECHO OFF
if not exist "%ProgramW6432%/MongoDB/log_cms3" mkdir "%ProgramW6432%/MongoDB/log_cms3"
if not exist "%ProgramW6432%/MongoDB/data_cms3" (
	mkdir "%ProgramW6432%/MongoDB/data_cms3"
	set init="true"
)
echo %init%
if exist "%ProgramW6432%\MongoDB\cms3_mongo.cfg" GOTO installWConfig

:installWOConfig
echo "installWithoutConfig"
	"%MONGODB_HOME%\mongod" --dbpath "%ProgramW6432%\MongoDB\data_cms3" --logpath="%ProgramW6432%\MongoDB\log_cms3\log.txt" --install --serviceName "CMS3 MongoDB" --serviceDisplayName "CMS3 MongoDB" --replSet rs0	
	if "%init%"=="true" GOTO initRs
GOTO commonExit

:installWConfig
echo "installWithConfig"
	"%MONGODB_HOME%\mongod" --config "%ProgramW6432%\MongoDB\cms3_mongo.cfg"  --install --serviceName "CMS3 MongoDB" --serviceDisplayName "CMS3 MongoDB"			
	if "%init%"=="true" GOTO initRs		
GOTO commonExit

:initRs
echo "initRs"
net start "CMS3 MongoDB"
"%MONGODB_HOME%\mongo" --eval "rs.initiate()"
"%MONGODB_HOME%\mongorestore" --drop --archive=backup.gz --gzip --db CMS3
net stop "CMS3 MongoDB"

:commonExit
net start "CMS3 MongoDB"
"%MONGODB_HOME%\mongo" --eval "rs.initiate()"


