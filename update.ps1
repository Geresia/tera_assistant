$dest = Split-Path -Parent $MyInvocation.MyCommand.Path
$zip = "$env:TEMP\tera_assistant_update.zip"
$extract = "$env:TEMP\tera_assistant_extract"

Write-Host "Downloading..."
Invoke-WebRequest -Uri "https://github.com/Geresia/tera_assistant/archive/refs/heads/main.zip" -OutFile $zip

Write-Host "Extracting..."
if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
Expand-Archive -Path $zip -DestinationPath $extract -Force

Write-Host "Copying files..."
Copy-Item -Path "$extract\tera_assistant-main\*" -Destination $dest -Recurse -Force

Write-Host "Cleaning up..."
Remove-Item $extract -Recurse -Force
Remove-Item $zip -Force

Write-Host ""
Write-Host "Update complete!"
Write-Host "Please reload Tera Assistant in chrome://extensions/"
