!include "MUI2.nsh"
!define PRODUCT_NAME "CMS Config Tool"
!define PRODUCT_VERSION "3.0.0"
!define MONGO "mongodb-win32-x86_64-enterprise-windows-64-3.6.3.exe"
!define NODE "node-v8.11.3-x64.msi"
!define VCREDIST "vc_redist.x64.exe"
!define OUTPUT_NAME "config-tool-setup"  
!define PM2_HOME "$PROGRAMFILES\CMS 3.0\Config\pm2"

# define installation directory
InstallDir "$TEMP\${PRODUCT_NAME}\Temp"
OutFile "${OUTPUT_NAME}-v${PRODUCT_VERSION}-FULL.exe"
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"

; request admin level
RequestExecutionLevel admin

AutoCloseWindow true
;ShowInstDetails show
;--------------------------------
;Interface Settings

  !define MUI_ABORTWARNING

;--------------------------------
;Pages

  ;!insertmacro MUI_PAGE_LICENSE "License.txt"
  !insertmacro MUI_PAGE_COMPONENTS

  
Section "NodeJs 8.11.3-x64" SEC01

SectionEnd 
  
Section "MongoDb v3.6.3" SEC02
  
SectionEnd 

;Section "MS Visual C++ Redist 2015 x64" SEC03
  
;SectionEnd 

  
  ;!insertmacro MUI_PAGE_DIRECTORY
  !insertmacro MUI_PAGE_INSTFILES
  
  !insertmacro MUI_UNPAGE_CONFIRM
  !insertmacro MUI_UNPAGE_INSTFILES
  


;--------------------------------
;Languages
 
  !insertmacro MUI_LANGUAGE "English"



;--------------------------------
;Installer Sections
Section
	;delete previous temp folder
	RMDir /r $INSTDIR
	
	SetOutPath $INSTDIR
	File "${OUTPUT_NAME}-v${PRODUCT_VERSION}.exe"

	SetOutPath $INSTDIR\Prerequisites
	

	${If} ${SectionIsSelected} ${SEC01}		
		File "Prerequisites\${NODE}"
		ExecWait 'msiexec /i "${NODE}"'
	${EndIf}
	
	${If} ${SectionIsSelected} ${SEC02}	
		File "Prerequisites\${MONGO}"
		ExecWait "${MONGO}"
	${EndIf}
	
	;${If} ${SectionIsSelected} ${SEC03}	
	;	File "Prerequisites\${VCREDIST}"
	;	ExecWait "${VCREDIST}"
	;${EndIf}

	;delete Prerequisites
	RMDir /r $INSTDIR\Prerequisites
	
	SetOutPath "${PM2_HOME}"
	
		; Add PM2 to system environment
	; Set to HKLM
	; Check for a 'PM2_HOME' variable
	EnVar::SetHKLM
	EnVar::Check "PM2_HOME" "NULL"
	Pop $0
	
  ${If} $0 != "0"
	; set default pm2 dir
	EnVar::SetHKLM
	EnVar::AddValue "PM2_HOME" "${PM2_HOME}"	
	
	;refresh path to enable npm
	WriteRegStr "HKLM" "SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce" "${PRODUCT_NAME}" "$INSTDIR\${OUTPUT_NAME}-v${PRODUCT_VERSION}.exe"
	
	MessageBox MB_YESNO|MB_ICONQUESTION "Installation will continue after reboot, do you wish to reboot the system now?" IDNO +2
	Reboot
	${Else}
	Exec "$INSTDIR\${OUTPUT_NAME}-v${PRODUCT_VERSION}.exe"
  ${EndIf}

	

	
SectionEnd


