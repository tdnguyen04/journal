# Dev startup script - starts Docker DB and ngrok
Write-Host "Starting development environment..." -ForegroundColor Cyan

# 1. Start Docker PostgreSQL
Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start Docker. Make sure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

Write-Host "PostgreSQL is running on localhost:5432" -ForegroundColor Green

# 2. Start ngrok in background
Write-Host "Starting ngrok..." -ForegroundColor Yellow

# Kill any existing ngrok processes
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force

# Start ngrok in a new window
Start-Process ngrok -ArgumentList "http", "3000" -PassThru | Out-Null

# Wait for ngrok to start
Start-Sleep -Seconds 3

# Get the ngrok URL
$ngrokUrl = $null
try {
    $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
    $ngrokUrl = ($ngrokApi.tunnels | Where-Object { $_.proto -eq "https" }).public_url
}
catch {
    Write-Host "Could not get ngrok URL automatically." -ForegroundColor Yellow
}

if ($ngrokUrl) {
    Write-Host "ngrok is running!" -ForegroundColor Green
    Write-Host "Public URL: $ngrokUrl" -ForegroundColor Cyan
    Write-Host "Set your Telegram webhook to:" -ForegroundColor Yellow
    Write-Host "   $ngrokUrl/api/telegram/webhook" -ForegroundColor White
    
    # Copy webhook URL to clipboard
    "$ngrokUrl/api/telegram/webhook" | Set-Clipboard
    Write-Host "Webhook URL copied to clipboard!" -ForegroundColor Green
}
else {
    Write-Host "Open http://localhost:4040 to see your ngrok URL" -ForegroundColor White
}

Write-Host "Ready! Run 'npm run dev' to start Next.js" -ForegroundColor Cyan
