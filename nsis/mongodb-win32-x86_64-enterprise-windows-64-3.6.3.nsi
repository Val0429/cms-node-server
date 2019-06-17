;Include Modern UI

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define PRODUCT_NAME "MongoDB_iSAP"
!define PRODUCT_VERSION "3.6.3"
!define PRODUCT_PUBLISHER "iSAP Solution"
!define PRODUCT_URL "http://www.isapsolution.com"
!define PATH_OUT "Release"
!define ARP "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define OUTPUT_NAME "mongodb-win32-x86_64-enterprise-windows-64"
!define MONGODB_HOME "MONGODB_HOME"

# define installation directory
InstallDir "$PROGRAMFILES64\${PRODUCT_NAME}"

# define name of installer
!system 'md "${PATH_OUT}"'	
OutFile "${PATH_OUT}\${OUTPUT_NAME}-${PRODUCT_VERSION}.exe"
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"



!macro DoUninstall UN
Function ${UN}DoUninstall

	# get installation path
	ReadRegStr $R1 HKLM "Software\${PRODUCT_NAME}" ""
	
	# first, delete the uninstaller
    Delete "$R1\uninstall.exe"
 
    # stop service
	ExecWait "net stop MongoDB"
	
	# delete service
	ExecWait "sc delete MongoDB"
	
	# now delete installed files
	RMDir /r $R1
	
	
	#remove path
	EnVar::SetHKLM
	EnVar::Delete "${MONGODB_HOME}"
	
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

  ;!insertmacro MUI_PAGE_LICENSE "License.txt"
  ;!insertmacro MUI_PAGE_COMPONENTS
 
;Section ".NET Framework v4.6.1" SEC01
;  ExecWait Prerequisites\NDP461-KB3102436-x86-x64-AllOS-ENU.exe
;SectionEnd 
;Section "MS Visual C++ Redist 2010 x86" SEC02
;  ExecWait Prerequisites\vcredist_x86.exe
;SectionEnd 
;Section "MS Visual C++ Redist 2010 x64" SEC03
;  ExecWait Prerequisites\vcredist_x64.exe
;SectionEnd 

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
 	
	# specify file to go in output path	
	SetOutPath "$INSTDIR\Server\3.6"		
	File .\vcredist_x64.exe
	ExecWait "$INSTDIR\Server\3.6\vcredist_x64.exe"
	File /r /x *.nsi .\3.6\*
	
	EnVar::SetHKLM
	EnVar::Check "${MONGODB_HOME}" "NULL"
	Pop $0
	
	${If} $0 != "0"
	; set default MONGODB_HOME dir
	EnVar::SetHKLM
	EnVar::AddValue "${MONGODB_HOME}" "$INSTDIR\Server\3.6\bin"			
	${EndIf}
  
	;Store installation folder
	WriteRegStr HKLM "Software\${PRODUCT_NAME}" "" $INSTDIR
	WriteRegStr HKLM "${ARP}" "DisplayName" "${PRODUCT_NAME} (remove only)"
	WriteRegStr HKLM "${ARP}" "UninstallString" '"$INSTDIR\uninstall.exe"'
	WriteRegStr HKLM "${ARP}" "Publisher" "${PRODUCT_PUBLISHER}"
	WriteRegStr HKLM "${ARP}" "URLInfoAbout" "${PRODUCT_URL}"
	WriteRegStr HKLM "${ARP}" "DisplayVersion" "${PRODUCT_VERSION}"
	
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