@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "C:\Users\marli\Downloads\adominus-main\adominus-main"
node_modules\.bin\vite.cmd --port %PORT% --host
