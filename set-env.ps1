# Sets the environment for the TPA Claim Process project
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path

Write-Host "JAVA_HOME set to: $env:JAVA_HOME"
Write-Host "Java version:"
java -version
