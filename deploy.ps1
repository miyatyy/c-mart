# Skrip Deployment ke Server Lokal 192.168.20.10

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   DEPLOYMENT MY-VUE-APP KE SERVER LOKAL    " -ForegroundColor Cyan
Write-Host "   Target: miyya@192.168.20.10:/home/miyya/my-vue-app" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Menjalankan deploy.py yang sudah terkonfigurasi dengan Paramiko
python "$PSScriptRoot\deploy.py"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Pengujian Akses Web Frontend:" -ForegroundColor Green
    try {
        $response = Invoke-WebRequest -Uri "http://192.168.20.10:5173" -UseBasicParsing -TimeoutSec 5
        Write-Host "    HTTP Status: $($response.StatusCode) ($($response.StatusDescription))" -ForegroundColor Green
        Write-Host "    Aplikasi siap diakses di: http://192.168.20.10:5173" -ForegroundColor Green
    } catch {
        Write-Host "    [!] Warning: Gagal menghubungi http://192.168.20.10:5173" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "[FAIL] Deployment selesai dengan error." -ForegroundColor Red
}
