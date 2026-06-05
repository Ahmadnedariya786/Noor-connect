# Script to download tafsir data for offline use
$baseUrl = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir"
$baseDir = "c:\Users\urooj\Videos\Noor-connect\public\data\tafsir"

$editions = @(
    "en-tafisr-ibn-kathir",
    "ar-tafsir-ibn-kathir",
    "ur-tafseer-ibn-e-kaseer"
)

foreach ($edition in $editions) {
    $editionDir = Join-Path $baseDir $edition
    Write-Host "Downloading $edition..."
    
    for ($surah = 1; $surah -le 114; $surah++) {
        $url = "$baseUrl/$edition/$surah.json"
        $outputFile = Join-Path $editionDir "$surah.json"
        
        try {
            Invoke-WebRequest -Uri $url -OutFile $outputFile -UseBasicParsing
            Write-Host "  Downloaded surah $surah"
        }
        catch {
            Write-Host "  Failed to download surah $surah"
        }
        
        # Small delay to avoid rate limiting
        Start-Sleep -Milliseconds 100
    }
    
    Write-Host "Completed $edition"
}

Write-Host "All tafsir downloads completed!"
