;Include Modern UI

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define PRODUCT_NAME "CMS Config Tool"
!define PRODUCT_VERSION "3.0.0"
!define PRODUCT_PUBLISHER "iSAP Solution"
!define PRODUCT_URL "http://www.isapsolution.com"
!define PATH_OUT "Release"
!define ARP "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define CMS_MONITOR "CMSConfigMonitor"
!define CMS_SERVICE "cms30configserver.exe"
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
	# first, delete the uninstaller
    Delete "$INSTDIR\uninstall.exe"
 
   
	# third, remove services
	ExecWait '"net" stop "${CMS_SERVICE}"'
	ExecWait '"sc" delete "${CMS_SERVICE}"'

	# now delete installed files
	RMDir /r $INSTDIR
	
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
	;copy config first to temp folder
	!insertmacro BackupFile "$INSTDIR\server\src\config" "parse.config.json" "${TEMP_FOLDER}\server"
	!insertmacro BackupFile "$INSTDIR\server\src\config" "path.config.json" "${TEMP_FOLDER}\server"
	!insertmacro BackupFile "$INSTDIR\server\src\config" "external.config.json" "${TEMP_FOLDER}\server"
	!insertmacro BackupFile "$INSTDIR\web\dist\config" "parse.config.json" "${TEMP_FOLDER}\web"


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
 
Section "NodeJs v8.11.3-x64" SEC01
  ExecWait 'msiexec /i "Prerequisites\node-v8.11.3-x64.msi"'
SectionEnd 
  
Section "MongoDb v3.4.9" SEC02
  ExecWait 'msiexec /i "Prerequisites\mongodb-win32-x86_64-enterprise-windows-64-3.4.9-signed.msi"'
SectionEnd 

Section "MS Visual C++ Redist 2015 x64" SEC03
  ExecWait Prerequisites\vc_redist.x64.exe
SectionEnd 

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
	
	;refresh path to enable node
	Call RefreshProcessEnvironmentPath
	
	
	;restore old config	
	
	!insertmacro RestoreFile "${TEMP_FOLDER}\server" "parse.config.json" "$INSTDIR\server\src\config"
	!insertmacro RestoreFile "${TEMP_FOLDER}\server" "path.config.json" "$INSTDIR\server\src\config"
	!insertmacro RestoreFile "${TEMP_FOLDER}\server" "external.config.json" "$INSTDIR\server\src\config"
	!insertmacro RestoreFile "${TEMP_FOLDER}\web" "parse.config.json" "$INSTDIR\web\dist\config"
	
	ExecWait '"install.bat" /s'
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
		ExecWait '"net" start "${CMS_SERVICE}"'
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
	#  uninstall mongo db
	ExecWait 'net stop "MongoDb"'
	ExecWait 'sc delete "MongoDb"'
# uninstaller section end
SectionEnd




#---------------- section to refresh PATH -----------------#

!include LogicLib.nsh
!include WinCore.nsh
!ifndef NSIS_CHAR_SIZE
    !define NSIS_CHAR_SIZE 1
    !define SYSTYP_PTR i
!else
    !define SYSTYP_PTR p
!endif
!ifndef ERROR_MORE_DATA
    !define ERROR_MORE_DATA 234
!endif
/*!ifndef KEY_READ
    !define KEY_READ 0x20019
!endif*/

Function RegReadExpandStringAlloc
    System::Store S
    Pop $R2 ; reg value
    Pop $R3 ; reg path
    Pop $R4 ; reg hkey
    System::Alloc 1 ; mem
    StrCpy $3 0 ; size

    loop:
        System::Call 'SHLWAPI::SHGetValue(${SYSTYP_PTR}R4,tR3,tR2,i0,${SYSTYP_PTR}sr2,*ir3r3)i.r0' ; NOTE: Requires SHLWAPI 4.70 (IE 3.01+ / Win95OSR2+)
        ${If} $0 = 0
            Push $2
            Push $0
        ${Else}
            System::Free $2
            ${If} $0 = ${ERROR_MORE_DATA}
                IntOp $3 $3 + ${NSIS_CHAR_SIZE} ; Make sure there is room for SHGetValue to \0 terminate
                System::Alloc $3
                Goto loop
            ${Else}
                Push $0
            ${EndIf}
        ${EndIf}
    System::Store L
FunctionEnd

Function RefreshProcessEnvironmentPath
    System::Store S
    Push ${HKEY_CURRENT_USER}
    Push "Environment"
    Push "Path"
    Call RegReadExpandStringAlloc
    Pop $0

    ${IfThen} $0 <> 0 ${|} System::Call *(i0)${SYSTYP_PTR}.s ${|}
    Pop $1
    Push ${HKEY_LOCAL_MACHINE}
    Push "SYSTEM\CurrentControlSet\Control\Session Manager\Environment"
    Push "Path"
    Call RegReadExpandStringAlloc
    Pop $0

    ${IfThen} $0 <> 0 ${|} System::Call *(i0)${SYSTYP_PTR}.s ${|}
    Pop $2
    System::Call 'KERNEL32::lstrlen(t)(${SYSTYP_PTR}r1)i.R1'
    System::Call 'KERNEL32::lstrlen(t)(${SYSTYP_PTR}r2)i.R2'
    System::Call '*(&t$R2 "",&t$R1 "",i)${SYSTYP_PTR}.r0' ; The i is 4 bytes, enough for a ';' separator and a '\0' terminator (Unicode)
    StrCpy $3 ""

    ${If} $R1 <> 0
    ${AndIf} $R2 <> 0
        StrCpy $3 ";"
    ${EndIf}

    System::Call 'USER32::wsprintf(${SYSTYP_PTR}r0,t"%s%s%s",${SYSTYP_PTR}r2,tr3,${SYSTYP_PTR}r1)?c'
    System::Free $1
    System::Free $2
    System::Call 'KERNEL32::SetEnvironmentVariable(t"PATH",${SYSTYP_PTR}r0)'
    System::Free $0
    System::Store L
FunctionEnd

