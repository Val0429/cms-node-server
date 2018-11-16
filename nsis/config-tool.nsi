;Include Modern UI

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define PRODUCT_NAME "CMS Config Tool"
!define PRODUCT_VERSION "3.0.0"
!define PRODUCT_PUBLISHER "iSAP Solution"
!define PRODUCT_URL "http://www.isapsolution.com"
!define PATH_OUT "Release"
!define ARP "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

# define name of installer
!system 'md "${PATH_OUT}"'	
OutFile "${PATH_OUT}\config-tool-setup-v${PRODUCT_VERSION}.exe"
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
	# backend
	File /r ..\server\dist\*
	# node modules
	SetOutPath $INSTDIR\server\node_modules
	File /r ..\server\node_modules\*
	# frontend
	SetOutPath $INSTDIR\web\dist	
	File /r ..\web\dist\*
	
	
	
	;Store installation folder
	WriteRegStr HKLM "Software\${PRODUCT_NAME}" "" $INSTDIR
	WriteRegStr HKLM "${ARP}" "DisplayName" "${PRODUCT_NAME} (remove only)"
	WriteRegStr HKLM "${ARP}" "UninstallString" '"$INSTDIR\uninstall.exe"'
	WriteRegStr HKLM "${ARP}" "Publisher" "${PRODUCT_PUBLISHER}"
	WriteRegStr HKLM "${ARP}" "URLInfoAbout" "${PRODUCT_URL}"
	WriteRegStr HKLM "${ARP}" "DisplayVersion" "${PRODUCT_VERSION}"
	
	;${If} ${SectionIsSelected} ${SEC03}	
		
	# just in case
	RMDir /r $INSTDIR\server\src\daemon
	;install services	
	ExecWait '"$INSTDIR\install_service.bat" /silent'
	
	
	
	;${EndIf}
	
	 ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
	 IntFmt $0 "0x%08X" $0
	 WriteRegDWORD HKLM "${ARP}" "EstimatedSize" "$0"
	 
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
	DeleteRegKey HKLM "${ARP}"
# uninstaller section end
SectionEnd