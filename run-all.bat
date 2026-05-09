@echo off
echo Starting TPA Claim Process...

:: Set Java Home
set "JAVA_HOME=C:\Program Files\Java\jdk-17"
set "PATH=%JAVA_HOME%\bin;%PATH%"

:: Start Backend in a new window
echo Starting Backend...
start "Backend (Spring Boot)" cmd /c "cd backend && mvnw.cmd spring-boot:run"

:: Start Frontend in a new window
echo Starting Frontend...
start "Frontend (Vite)" cmd /c "cd frontend && npm.cmd run dev"

echo All services started. 
echo Backend will be at http://localhost:8080
echo Frontend will be at http://localhost:5173
pause
