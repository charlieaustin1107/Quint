<#
  Uninstall-Quint.ps1
  Removes Quint Control from NinjaTrader 8.

  How to run it:
    1. In NinjaTrader, stop every Quint bot and close the Quint Control window first.
    2. Right-click this file and choose "Run with PowerShell".
    3. Open NinjaTrader, then New > NinjaScript Editor, and press F5 so NinjaTrader forgets Quint.

  What it does:
    - Backs up Quint's NinjaScript files to Documents\NinjaTrader 8\quint\backups\<date-time>-uninstall.
    - Removes only Quint's own folders from Documents\NinjaTrader 8\bin\Custom.
    - Keeps your Quint data (settings, journal, logs, backups) unless you add -RemoveData,
      which asks you to type DELETE first.

  This file uses plain ASCII on purpose: Windows PowerShell 5.1 misreads other characters.
#>

[CmdletBinding()]
param(
  [switch]$RemoveData,
  # Use a different NinjaTrader 8 folder (only for testing).
  [string]$NinjaTraderFolder = ""
)

$ErrorActionPreference = 'Stop'
function Say([string]$text, [string]$colour = 'Gray') { Write-Host $text -ForegroundColor $colour }

Say ""
Say "Quint Control uninstaller" 'Cyan'
Say "-------------------------" 'Cyan'

if ($NinjaTraderFolder -eq "") {
  $NinjaTraderFolder = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'NinjaTrader 8'
}
$custom = Join-Path $NinjaTraderFolder 'bin\Custom'
$data = Join-Path $NinjaTraderFolder 'quint'
if (-not (Test-Path -LiteralPath $custom -PathType Container)) {
  Say "I can't find $custom, so there is nothing to remove." 'Yellow'
  exit 0
}

# Only these folders are ever removed.
$quintFolders = @(
  (Join-Path $custom 'AddOns\Quint'),
  (Join-Path $custom 'Strategies\Quint'),
  (Join-Path $custom 'Indicators\Quint')
)

$stamp = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-uninstall'
$backupRoot = Join-Path $data "backups\$stamp"
$removed = 0
foreach ($folder in $quintFolders) {
  if (Test-Path -LiteralPath $folder) {
    $relative = $folder.Substring($NinjaTraderFolder.Length).TrimStart('\')
    $dest = Join-Path $backupRoot $relative
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Copy-Item -Path (Join-Path $folder '*') -Destination $dest -Recurse -Force
    Remove-Item -LiteralPath $folder -Recurse -Force
    Say "Removed $folder" 'Green'
    $removed++
  }
}
if ($removed -eq 0) { Say "Quint's NinjaScript files weren't installed." }
else { Say "A copy of the removed files is in $backupRoot" 'Green' }

if ($RemoveData) {
  Say ""
  Say "This also deletes your Quint settings, journal, logs and backups in $data" 'Yellow'
  $answer = Read-Host "Type DELETE to confirm, or press Enter to keep them"
  if ($answer -ceq 'DELETE') {
    if (Test-Path -LiteralPath $data) { Remove-Item -LiteralPath $data -Recurse -Force }
    Say "Quint data deleted." 'Green'
  } else {
    Say "Kept your Quint data."
  }
} else {
  Say "Your Quint data (settings, journal, logs) is still in $data"
}

Say ""
Say "Next step:" 'Cyan'
Say "  Open NinjaTrader 8 > New > NinjaScript Editor and press F5, so NinjaTrader forgets Quint."
Say ""
