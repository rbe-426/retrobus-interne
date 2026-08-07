@echo off
echo === RESET GIT INTERNE ===
cd /d C:\Dev\RETROBUS_ESSONNE\interne
rmdir /s /q .git
git init
git remote add origin https://github.com/wb91100/retronet-essonne.git
git add .
git commit -m "Initial reset commit"
git branch -M main
git push -u origin main --force

echo === RESET GIT API (Serveur) ===
cd /d C:\Dev\RETROBUS_ESSONNE\interne\api
rmdir /s /q .git
git init
git remote add origin https://github.com/wb91100/retroservers.git
git add .
git commit -m "Initial reset commit"
git branch -M main
git push -u origin main --force

echo === RESET GIT EXTERNE ===
cd /d C:\Dev\RETROBUS_ESSONNE\externe
rmdir /s /q .git
git init
git remote add origin https://github.com/wb91100/retrobus-externe.git
git add .
git commit -m "Initial reset commit"
git branch -M main
git push -u origin main --force

echo === TERMINE ===
pause
