@echo off
cd /d C:\Users\matsu\mcq-quests
echo ==============================================
echo  Push MCQ Mandala Quest to GitHub
echo  (First time: browser login window will open)
echo ==============================================
git push -u origin main
echo.
if %errorlevel%==0 (
  echo [OK] Push success!
  echo Next: open Settings - Pages, set Branch: main /root, Save.
  echo URL: https://shozaburo.github.io/mcq-quests/
) else (
  echo [NG] Push failed.
  echo Create repo first: https://github.com/new  name: mcq-quests  Public
)
pause
