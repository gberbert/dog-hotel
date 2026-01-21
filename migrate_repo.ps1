$source = "c:\Users\K\OneDrive\Documentos\PROJETOS ANTIGRAVITY\dog-hotel"
$dest = "C:\Dev\ANTIGRAVITY\dog-hotel"

# Create destination if not exists
if (!(Test-Path -Path $dest)) {
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Write-Host "Created destination directory: $dest"
}

Write-Host "Starting migration from $source to $dest..."

# Robocopy command
# /MIR :: MIRror a directory tree (equivalent to /E plus /PURGE).
# /XD :: eXclude Directories matching given names/paths.
# /XF :: eXclude Files matching given names/paths.
# /R:0 :: number of Retries on failed copies.
# /W:0 :: Wait time between retries.
# /NP :: No Progress - don't display % copied.
# /NFL :: No File List - don't log file names.
# /NDL :: No Directory List - don't log directory names.
# We want to see output so removing /NFL /NDL but keeping /NP to avoid clutter
robocopy $source $dest /MIR /XD node_modules dist .git .vscode .idea logs /XF *.log *.local .DS_Store *.suo *.ntvs* *.njsproj *.sln *.sw? google_api_agenda.txt /R:0 /W:0 /NP

if ($LASTEXITCODE -lt 8) {
    Write-Host "Migration completed successfully (Robocopy exit code: $LASTEXITCODE)."
} else {
    Write-Host "Migration failed or had errors (Robocopy exit code: $LASTEXITCODE)."
}
