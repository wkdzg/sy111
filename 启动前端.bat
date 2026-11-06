@echo off
chcp 65001 >nul
title vue222t 前端页面
cd /d "%~dp0"

echo.
echo ==================================================
echo    vue222t 酒店预订系统  -  前端页面
echo ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto NO_NODE

for /f "delims=" %%v in ('node -v') do set "NODEVER=%%v"
echo    [OK] Node.js 已安装，版本 %NODEVER%

if not exist "node_modules" goto INSTALL
goto CHECK_BACKEND


:INSTALL
echo.
echo    [首次运行] 正在安装依赖，大约需要 1 分钟。
echo    请不要关闭这个窗口，装完会自动继续。
echo.
call npm install --no-audit --no-fund
if errorlevel 1 goto INSTALL_FAIL
echo.
echo    [OK] 依赖安装完成
goto CHECK_BACKEND


:CHECK_BACKEND
netstat -ano | findstr "LISTENING" | findstr /C:":3000 " >nul 2>nul
if errorlevel 1 goto BACKEND_DOWN
goto START_DEV


:BACKEND_DOWN
echo.
echo    [重要提示] 后端还没有启动。
echo.
echo    现在启动前端，网页能打开，但是酒店数据会加载不出来，
echo    页面上会显示一片空白或者报错。
echo.
echo    正确做法：先去 vue222t-server 文件夹，
echo              双击里面的「启动后端.bat」，
echo              然后再回来启动前端。
echo.
echo    如果你已经启动了后端，可以忽略这段提示。
echo.
echo    按任意键继续启动前端...
pause >nul
goto START_DEV


:START_DEV
echo.
echo --------------------------------------------------
echo    正在启动前端，请稍等几秒...
echo --------------------------------------------------
echo.
echo    启动完成后，浏览器会自动打开网页。
echo.
echo    注意：这个黑色窗口不要关！
echo          关了网页就打不开了。
echo.
echo    要停止服务：直接关掉这个窗口就行。
echo.
call npm run dev
echo.
echo --------------------------------------------------
echo    前端已经停止了
echo --------------------------------------------------
echo.
pause
exit /b 0


:NO_NODE
echo.
echo    [错误] 没有检测到 Node.js，无法启动前端。
echo.
echo    请先安装 Node.js，网址是：
echo        https://nodejs.org
echo.
echo    打开后点左边的 LTS 版本下载，一路点"下一步"装完，
echo    然后关掉这个窗口，重新双击本文件。
echo.
pause
exit /b 1


:INSTALL_FAIL
echo.
echo    [错误] 依赖安装失败，没能装完。
echo.
echo    常见原因：
echo      1. 网络不通  --  换个网络，或者连手机热点再试
echo      2. 公司网络限制  --  找网管，或者换网络
echo.
echo    解决后关掉这个窗口，重新双击本文件即可。
echo.
pause
exit /b 1
