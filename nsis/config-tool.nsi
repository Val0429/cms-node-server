;Include Modern UI

!include "MUI2.nsh"

!define PRODUCT_NAME "CMS Config Tool"
!define PRODUCT_VERSION "3.0.0"
!define PRODUCT_PUBLISHER "iSAP Solution"

# define name of installer

OutFile "Release\config-tool-setup-v${PRODUCT_VERSION}.exe"
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"

# define installation directory
InstallDir "$PROGRAMFILES\CMS 3.0\Config"

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
  
Section "MongoDb v3.4.18" SEC02
  ExecWait 'msiexec /i "Prerequisites\mongodb-win32-x86_64-2008plus-ssl-3.4.18-signed.msi"'
SectionEnd 

  
;Section "Install Mongo Db Service" SEC03

;SectionEnd 
  
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
	File install_service.bat
	File uninstall_service.bat
    # create the uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"
 
    # create a shortcut named "new shortcut" in the start menu programs directory
    # point the new shortcut at the program uninstaller
    CreateShortCut "$SMPROGRAMS\uninstall.lnk" "$INSTDIR\uninstall.exe"
	
	# specify file to go in output path	
	SetOutPath $INSTDIR\lib
	File /r ..\lib\*
	SetOutPath $INSTDIR\web\dist	
	File /r ..\web\dist\*
	SetOutPath $INSTDIR\server
	File /r ..\server\*.json
	SetOutPath $INSTDIR\server\src
	File /r ..\server\src\*
	SetOutPath $INSTDIR\server\node_modules
	File /r ..\server\node_modules\*
	
	;Store installation folder
	WriteRegStr HKLM "Software\${PRODUCT_NAME}" "" $INSTDIR
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayName" "${PRODUCT_NAME} (remove only)"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "UninstallString" '"$INSTDIR\uninstall.exe"'
	
	
	;${If} ${SectionIsSelected} ${SEC03}	
		
	# just in case
	RMDir /r $INSTDIR\server\src\daemon
	;install services	
	ExecWait '"$INSTDIR\install_service.bat" /silent'
	
	
	
	;${EndIf}
	
SectionEnd

UninstallText "This will uninstall Test-Installer. Press next to continue."

# uninstaller section start
Section "uninstall"
  
    # first, delete the uninstaller
    Delete "$INSTDIR\uninstall.exe"
 
    # second, remove the link from the start menu
    Delete "$SMPROGRAMS\uninstall.lnk"
	Delete "$SMPROGRAMS\${PRODUCT_NAME}"
	
	# third, remove services
	ExecWait '"$INSTDIR\uninstall_service.bat" /silent'		
	
	# now delete installed files
	RMDir /r $INSTDIR
	
	# remove registry info
	DeleteRegKey HKLM "Software\${PRODUCT_NAME}"
	DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
# uninstaller section end
SectionEnd