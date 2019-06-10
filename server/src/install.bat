REM "press n key and enter when prompted to setup environment"
call app_install.bat
call app_init.bat
call app_save.bat
npx pm2 kill