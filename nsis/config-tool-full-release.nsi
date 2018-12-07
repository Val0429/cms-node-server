!define PRODUCT_VERSION "3.0.0"

# define installation directory
InstallDir "$TEMP\CMS 3.0\Temp"
OutFile "config-tool-setup-v${PRODUCT_VERSION}-FULL.exe"

; request admin level
RequestExecutionLevel admin

AutoCloseWindow true


;--------------------------------
;Installer Sections
Section
	;deploy inside temp folder
	
	SetOutPath $INSTDIR\Prerequisites
	File /r /x NDP452-KB2901907-x86-x64-AllOS-ENU.exe Prerequisites\*
	
	SetOutPath $INSTDIR	
	File "config-tool-setup-v${PRODUCT_VERSION}.exe"
	
	;run installer
    Exec config-tool-setup-v${PRODUCT_VERSION}.exe
SectionEnd
