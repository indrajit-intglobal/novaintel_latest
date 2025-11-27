# Start Backend Server for TestSprite
Write-Host "Starting NovaIntel Backend Server..." -ForegroundColor Green

# Check if virtual environment exists
if (Test-Path "backend\venv\Scripts\activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & backend\venv\Scripts\activate.ps1
} else {
    Write-Host "No virtual environment found. Using system Python." -ForegroundColor Yellow
}

# Change to backend directory
Set-Location backend

# Start the server
Write-Host "Starting server on http://localhost:8000..." -ForegroundColor Green
python run.py

