$config_path="$Env:TEMP\cms3_mongo.cfg"
$program_files="$Env:ProgramW6432".replace("\","/")
$dbpath="$program_files/MongoDB/data_cms3"
$logpath="$program_files/MongoDB/log_cms3"
$logfile="$logpath/log.txt"
IF (![System.IO.File]::Exists($config_path) ){
	New-Item -ItemType "file" $config_path -Force
	Set-Content $config_path 'storage:'
	Add-Content $config_path $('    dbPath: "'+$dbpath+'"')
	Add-Content $config_path '    journal:'
	Add-Content $config_path '        enabled: true'
	Add-Content $config_path 'systemLog:'
	Add-Content $config_path '    destination: file'
	Add-Content $config_path $('    path: "'+$logfile+'"')
	Add-Content $config_path '    logAppend: true'
	Add-Content $config_path '    timeStampFormat: iso8601-utc'
	Add-Content $config_path 'net:'
	Add-Content $config_path '    bindIp: 127.0.0.1'
	Add-Content $config_path '    port: 27017'
	Add-Content $config_path '    wireObjectCheck : false'
	Add-Content $config_path 'replication:'
	Add-Content $config_path '    oplogSizeMB: 1024'
	Add-Content $config_path '    replSetName: "rsCMS3"'
}
