;Include Modern UI

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define PRODUCT_NAME "CMS Config Tool"
!define PRODUCT_VERSION "3.0.0"
!define PRODUCT_PUBLISHER "iSAP Solution"
!define PRODUCT_URL "http://www.isapsolution.com"
!define PATH_OUT "Release"
!define ARP "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"


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
	RMDir /r "${TEMP_FOLDER}\server"
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
	

	#install mongo service
	SetOutPath "$INSTDIR\server\src\mongodb"
	${If} ${SectionIsSelected} ${SEC04}			
		ExecWait '"mongo_install.bat" /s'	
		;start service
		SetOutPath "$INSTDIR\server\src"
		ExecWait 'app_start.bat'
	${Else}		
		ExecWait '"mongo_install_replica.bat" /s'
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
	ExecWait 'net stop mongodb'
	ExecWait 'sc delete mongodb'
	
	#reboot to clean up path
	MessageBox MB_YESNO|MB_ICONQUESTION "Do you wish to reboot the system now?" IDNO +2
	Reboot
# uninstaller section end
SectionEnd