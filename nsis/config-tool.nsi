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

!macro DoUninstall UN
Function ${UN}DoUninstall
	# first, delete the uninstaller
    Delete "$INSTDIR\uninstall.exe"
 
    # second, remove the link from the start menu
    # "$SMPROGRAMS\uninstall.lnk"
	# Delete "$SMPROGRAMS\${PRODUCT_NAME}"
	SetOutPath $INSTDIR\server\src
	# third, remove services
	ExecWait '"uninstall.bat" /s'		
	
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
    # create the uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"
 
    # create a shortcut named "new shortcut" in the start menu programs directory
    # point the new shortcut at the program uninstaller
    # CreateShortCut "$SMPROGRAMS\uninstall.lnk" "$INSTDIR\uninstall.exe"
	
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
	SetOutPath $INSTDIR\server\src	
	ExecWait '"install.bat" /s'
	
	;${EndIf}
	
	 ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
	 IntFmt $0 "0x%08X" $0
	 WriteRegDWORD HKLM "${ARP}" "EstimatedSize" "$0"
	 
SectionEnd

UninstallText "This will uninstall ${PRODUCT_NAME}. Press uninstall to continue."
!insertmacro DoUninstall "un."

# uninstaller section start
Section "uninstall"
  Call un.DoUninstall  
# uninstaller section end
SectionEnd