;Include Modern UI

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define PRODUCT_NAME "CMS Config Tool"
!define PRODUCT_VERSION "3.0.0"
!define PRODUCT_PUBLISHER "iSAP Solution"
!define PRODUCT_URL "http://www.isapsolution.com"
!define PATH_OUT "Release"
!define ARP "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define MONGO_CONFIG "cms3_mongo.cfg"

!define TEMP_FOLDER "$TEMP\${PRODUCT_NAME}"

# define name of installer
!system 'md "${PATH_OUT}"'	
OutFile "${PATH_OUT}\config-tool-setup-v${PRODUCT_VERSION}.exe"
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"

# define installation directory
InstallDir "$PROGRAMFILES\CMS 3.0\Config"

!macro BackupFile FILE_DIR FILE BACKUP_TO
 IfFileExists "${BACKUP_TO}\*.*" +2
  CreateDirectory "${BACKUP_TO}"
 IfFileExists "${FILE_DIR}\${FILE}" 0 +2
  Rename "${FILE_DIR}\${FILE}" "${BACKUP_TO}\${FILE}"
!macroend

!macro RestoreFile BUP_DIR FILE RESTORE_TO
 IfFileExists "${BUP_DIR}\${FILE}" 0 +3
  Delete "${RESTORE_TO}\${FILE}"
  Rename "${BUP_DIR}\${FILE}" "${RESTORE_TO}\${FILE}"
!macroend

!macro DoUninstall UN
Function ${UN}DoUninstall
	#0, get old installation folder
	ReadRegStr $R1 HKLM "Software\${PRODUCT_NAME}" ""
	
	# first, delete the uninstaller
    Delete "$R1\uninstall.exe"

    SetOutPath $R1\server\src 
	# third, stop and uninstall app
	ExecWait 'app_stop.bat'
	ExecWait 'uninstall.bat'

	
	# now delete installed files
	RMDir /r $R1
	
	# remove registry info
	DeleteRegKey HKLM "Software\${PRODUCT_NAME}"	
	DeleteRegKey HKLM "${ARP}"
FunctionEnd
!macroend
!insertmacro DoUninstall "" 


Function VersionCompare
	!define VersionCompare `!insertmacro VersionCompareCall`
 
	!macro VersionCompareCall _VER1 _VER2 _RESULT
		Push `${_VER1}`
		Push `${_VER2}`
		Call VersionCompare
		Pop ${_RESULT}
	!macroend
 
	Exch $1
	Exch
	Exch $0
	Exch
	Push $2
	Push $3
	Push $4
	Push $5
	Push $6
	Push $7
 
	begin:
	StrCpy $2 -1
	IntOp $2 $2 + 1
	StrCpy $3 $0 1 $2
	StrCmp $3 '' +2
	StrCmp $3 '.' 0 -3
	StrCpy $4 $0 $2
	IntOp $2 $2 + 1
	StrCpy $0 $0 '' $2
 
	StrCpy $2 -1
	IntOp $2 $2 + 1
	StrCpy $3 $1 1 $2
	StrCmp $3 '' +2
	StrCmp $3 '.' 0 -3
	StrCpy $5 $1 $2
	IntOp $2 $2 + 1
	StrCpy $1 $1 '' $2
 
	StrCmp $4$5 '' equal
 
	StrCpy $6 -1
	IntOp $6 $6 + 1
	StrCpy $3 $4 1 $6
	StrCmp $3 '0' -2
	StrCmp $3 '' 0 +2
	StrCpy $4 0
 
	StrCpy $7 -1
	IntOp $7 $7 + 1
	StrCpy $3 $5 1 $7
	StrCmp $3 '0' -2
	StrCmp $3 '' 0 +2
	StrCpy $5 0
 
	StrCmp $4 0 0 +2
	StrCmp $5 0 begin newer2
	StrCmp $5 0 newer1
	IntCmp $6 $7 0 newer1 newer2
 
	StrCpy $4 '1$4'
	StrCpy $5 '1$5'
	IntCmp $4 $5 begin newer2 newer1
 
	equal:
	StrCpy $0 0
	goto end
	newer1:
	StrCpy $0 1
	goto end
	newer2:
	StrCpy $0 2
 
	end:
	Pop $7
	Pop $6
	Pop $5
	Pop $4
	Pop $3
	Pop $2
	Pop $1
	Exch $0
FunctionEnd

Function .onInit
 
  ReadRegStr $R0 HKLM "${ARP}" "UninstallString"
  StrCmp $R0 "" done
  
  MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
  "${PRODUCT_NAME} is already installed. $\n$\nClick `OK` to remove the \
  previous version or `Cancel` to cancel this upgrade." \
  IDOK uninst
  Abort
 
;Run the uninstaller
uninst:
	
	#mongo db data migration for version older than 3.01.15
	ReadRegStr $R3 HKLM "${ARP}" "DisplayVersion"  
	${VersionCompare} $R3 "3.01.15" $R4
	${If} $R4 == "2"
		DetailPrint "MongoDB migration"
		ExecWait 'net stop MongoDB'
		ExecWait 'sc delete MongoDB'
		IfFileExists "$PROGRAMFILES64\MongoDB\data\*.*" 0 +2
		Rename "$PROGRAMFILES64\MongoDB\data" "$PROGRAMFILES64\MongoDB\data_cms3"
		IfFileExists "$PROGRAMFILES64\MongoDB\log\*.*" 0 +2
		Rename "$PROGRAMFILES64\MongoDB\log" "$PROGRAMFILES64\MongoDB\log_cms3"
	${EndIf}
	
	RMDir /r "${TEMP_FOLDER}\server"
	
	ReadRegStr $R1 HKLM "Software\${PRODUCT_NAME}" ""
	;copy config first to temp folder
	!insertmacro BackupFile "$R1\server\src\config" "parse.config.json" "${TEMP_FOLDER}\server"
	!insertmacro BackupFile "$R1\server\src\config" "path.config.json" "${TEMP_FOLDER}\server"
	!insertmacro BackupFile "$R1\server\src\config" "external.config.json" "${TEMP_FOLDER}\server"
	!insertmacro BackupFile "$R1\web\dist\config" "parse.config.json" "${TEMP_FOLDER}\web"


  ClearErrors
  Call DoUninstall
 
  IfErrors no_remove_uninstaller done
    ;You can either use Delete /REBOOTOK in the uninstaller or add some code
    ;here to remove the uninstaller. Use a registry key to check
    ;whether the user has chosen to uninstall. If you are using an uninstaller
    ;components page, make sure all sections are uninstalled.
  no_remove_uninstaller:
 
done:
 
FunctionEnd




; request admin level
RequestExecutionLevel admin

AutoCloseWindow false
ShowInstDetails show
;--------------------------------
;Interface Settings

  !define MUI_ABORTWARNING

;--------------------------------
;Pages

  !insertmacro MUI_PAGE_LICENSE "License.txt"
  !insertmacro MUI_PAGE_COMPONENTS
 

Section "Stand alone MongoDb service" SEC04
		
SectionEnd 

;--------------------------------
;macros
  
  !insertmacro MUI_PAGE_DIRECTORY
  !insertmacro MUI_PAGE_INSTFILES
  
  !insertmacro MUI_UNPAGE_CONFIRM
  !insertmacro MUI_UNPAGE_INSTFILES
  


;--------------------------------
;Languages
 
  !insertmacro MUI_LANGUAGE "English"

;--------------------------------
;Installer Sections
Section
 
    # set the installation directory as the destination for the following actions
    SetOutPath $INSTDIR
	
    # create the uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"
    
	
	# specify file to go in output path
	# create mongo config script
	File .\add_config.ps1
	# backend
	File /r ..\server\dist\*
	# node modules
	SetOutPath $INSTDIR\server\node_modules
	File /r ..\server\node_modules\*
	# frontend
	SetOutPath $INSTDIR\web\dist	
	File /r ..\web\dist\*	
	
	# strange issue since version 26
	# have to include package.json
	# otherwise service will fail to start
	SetOutPath $INSTDIR\server
	File ..\server\package.json
	
	;Store installation folder
	WriteRegStr HKLM "Software\${PRODUCT_NAME}" "" $INSTDIR
	WriteRegStr HKLM "${ARP}" "DisplayName" "${PRODUCT_NAME} (remove only)"
	WriteRegStr HKLM "${ARP}" "UninstallString" '"$INSTDIR\uninstall.exe"'
	WriteRegStr HKLM "${ARP}" "Publisher" "${PRODUCT_PUBLISHER}"
	WriteRegStr HKLM "${ARP}" "URLInfoAbout" "${PRODUCT_URL}"
	WriteRegStr HKLM "${ARP}" "DisplayVersion" "${PRODUCT_VERSION}"
	
	
	# just in case	
	RMDir /r $INSTDIR\server\src\daemon
	
	;install services	
	SetOutPath $INSTDIR\server\src	
		
	;restore old config	
	
	!insertmacro RestoreFile "${TEMP_FOLDER}\server" "parse.config.json" "$INSTDIR\server\src\config"
	!insertmacro RestoreFile "${TEMP_FOLDER}\server" "path.config.json" "$INSTDIR\server\src\config"
	!insertmacro RestoreFile "${TEMP_FOLDER}\server" "external.config.json" "$INSTDIR\server\src\config"
	!insertmacro RestoreFile "${TEMP_FOLDER}\web" "parse.config.json" "$INSTDIR\web\dist\config"
	
	; Add PM2 to system environment
	; Set to HKLM
	; Check for a 'PM2_HOME' variable
	EnVar::SetHKLM
	EnVar::Check "PM2_HOME" "NULL"
	Pop $0
	
  ${If} $0 != "0"
		DetailPrint "set PM2_HOME to $PROFILE\.pm2"
		EnVar::AddValue "PM2_HOME" "$PROFILE\.pm2"	
  ${EndIf}
	
		
	
	ExecWait 'install.bat'
	; wait till finish installing service	
	Sleep 1000	
	
	${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
	IntFmt $0 "0x%08X" $0
	WriteRegDWORD HKLM "${ARP}" "EstimatedSize" "$0"
	
	
	#create mongo config
	ExecWait 'Powershell -NoProfile -ExecutionPolicy Bypass -file "$INSTDIR\add_config.ps1"'
  
	IfFileExists "$PROGRAMFILES64\MongoDB\${MONGO_CONFIG}" installMongo moveFile
	moveFile:
	Rename "$TEMP\${MONGO_CONFIG}" "$PROGRAMFILES64\MongoDB\${MONGO_CONFIG}" 
	installMongo:
	#install mongo service
	SetOutPath "$INSTDIR\server\src\mongodb"
	${If} ${SectionIsSelected} ${SEC04}			
		ExecWait '"mongo_install.bat" /s'	
		;start service
		SetOutPath "$INSTDIR\server\src"
		ExecWait 'app_start.bat'
	${Else}		
		ExecWait '"mongo_install_wo_init.bat" /s'
	${EndIf}
	
	
	Sleep 1000
SectionEnd

UninstallText "This will uninstall ${PRODUCT_NAME}. Press uninstall to continue."
!insertmacro DoUninstall "un."

# uninstaller section start
Section "uninstall"
  Call un.DoUninstall 
  
	#4th, Delete PM2 Path
	EnVar::SetHKLM
	EnVar::Delete "PM2_HOME"
  
	#  uninstall mongo db	
	ExecWait 'net stop "CMS3 MongoDB"'
	ExecWait 'sc delete "CMS3 MongoDB"'
	
	#reboot to clean up path
	MessageBox MB_YESNO|MB_ICONQUESTION "Do you wish to reboot the system now?" IDNO +2
	Reboot
# uninstaller section end
SectionEnd
