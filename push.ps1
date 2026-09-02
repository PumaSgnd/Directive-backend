# ================================
# Git Push - Ignore .env
# ================================

Write-Host "=== Git Push Project ===" -ForegroundColor Cyan

# 1. Pastikan .env masuk .gitignore
Write-Host "`n[1] Membuat/update .gitignore..." -ForegroundColor Yellow

$gitignore = @"
.env
.env.*
!.env.example

node_modules/
dist/
build/
"@

Set-Content -Path ".gitignore" -Value $gitignore

# 2. Hapus .env dari Git tracking
Write-Host "`n[2] Menghapus .env dari Git tracking..." -ForegroundColor Yellow

git rm --cached .env 2>$null

# 3. Tambahkan semua perubahan
Write-Host "`n[3] Git add..." -ForegroundColor Yellow

git add .

# 4. Tampilkan status
Write-Host "`n[4] Git status..." -ForegroundColor Yellow

git status

# 5. Commit
Write-Host "`n[5] Commit..." -ForegroundColor Yellow

git commit -m "chore: update project and remove env from tracking"

# 6. Push
Write-Host "`n[6] Push ke GitHub..." -ForegroundColor Yellow

git push

Write-Host "`n=== SELESAI ===" -ForegroundColor Green
Write-Host ".env tetap ada di komputer dan tidak di-track oleh Git." -ForegroundColor Green