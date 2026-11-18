<#
  Install-Quint.ps1
  Copies Quint Control into NinjaTrader 8. Safe to run as many times as you like.

  How to run it:
    1. Right-click this file and choose "Run with PowerShell".
       (If Windows blocks it, open PowerShell and run:
        powershell -ExecutionPolicy Bypass -File "<path to>\Install-Quint.ps1")
    2. When it finishes, open NinjaTrader, then New > NinjaScript Editor, and press F5.

  What it does:
    - Finds your Documents\NinjaTrader 8 folder (works with OneDrive Documents too).
    - Backs up any Quint files already installed to Documents\NinjaTrader 8\quint\backups\<date-time>.
    - Replaces only Quint's own folders. It never touches other NinjaScript files,
      your settings, your journal or your NinjaTrader workspaces.
    - Copies the dashboard website and the firm presets next to your Quint data.

  This file uses plain ASCII on purpose: Windows PowerShell 5.1 misreads other characters.
#>

[CmdletBinding()]
param(
  # The quint-control folder. By default, the folder this script sits in, one level up.
  [string]$Source = "",
  # Use a different NinjaTrader 8 folder (only for testing).
  [string]$NinjaTraderFolder = ""
)

$ErrorActionPreference = 'Stop'
$KeepBackups = 10
if ($Source -eq "") { $Source = Split-Path -Parent $PSScriptRoot }

function Say([string]$text, [string]$colour = 'Gray') { Write-Host $text -ForegroundColor $colour }

Say ""
Say "Quint Control installer" 'Cyan'
Say "-----------------------" 'Cyan'

# 1. Find the NinjaTrader 8 folder.
if ($NinjaTraderFolder -eq "") {
  $docs = [Environment]::GetFolderPath('MyDocuments')
  $NinjaTraderFolder = Join-Path $docs 'NinjaTrader 8'
}
$custom = Join-Path $NinjaTraderFolder 'bin\Custom'
if (-not (Test-Path -LiteralPath $custom -PathType Container)) {
  Say "I can't find $custom" 'Red'
  Say "Open NinjaTrader 8 once (so it creates that folder), close it, then run this again." 'Yellow'
  exit 1
}
if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
  Say "I can't find the Quint Control files at $Source" 'Red'
  exit 1
}
Say "NinjaTrader folder: $NinjaTraderFolder"
Say "Installing from:    $Source"

# 2. Where each part goes. Only these folders are ever replaced.
$data = Join-Path $NinjaTraderFolder 'quint'
$targets = @(
  @{ From = 'core';                 To = (Join-Path $custom 'AddOns\Quint\Core');       Filter = '*.cs';   Name = 'trading logic' },
  @{ From = 'engine';               To = (Join-Path $custom 'AddOns\Quint\Engine');     Filter = '*.cs';   Name = 'engine' },
  @{ From = 'strategies';           To = (Join-Path $custom 'AddOns\Quint\Strategies'); Filter = '*.cs';   Name = 'bots' },
  @{ From = 'strategies\wrappers';  To = (Join-Path $custom 'Strategies\Quint');        Filter = '*.cs';   Name = 'Strategy Analyzer wrappers' },
  @{ From = 'engine\indicators';    To = (Join-Path $custom 'Indicators\Quint');        Filter = '*.cs';   Name = 'chart indicator' },
  @{ From = 'web\dist';             To = (Join-Path $data 'web');                       Filter = '*';      Name = 'dashboard website' },
  @{ From = 'firms';                To = (Join-Path $data 'firms\presets');             Filter = '*.json'; Name = 'firm presets' }
)

# 3. Back up whatever Quint already has installed.
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $data "backups\$stamp"
$backedUp = 0
foreach ($t in $targets) {
  if (Test-Path -LiteralPath $t.To) {
    $relative = $t.To.Substring($NinjaTraderFolder.Length).TrimStart('\')
    $dest = Join-Path $backupRoot $relative
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Copy-Item -Path (Join-Path $t.To '*') -Destination $dest -Recurse -Force
    $backedUp++
  }
}
if ($backedUp -gt 0) { Say "Backed up the old Quint files to $backupRoot" 'Green' }
else { Say "No old Quint files found, so nothing to back up." }

# Keep only the newest backups so the folder doesn't grow for ever.
$backupsFolder = Join-Path $data 'backups'
if (Test-Path -LiteralPath $backupsFolder) {
  Get-ChildItem -LiteralPath $backupsFolder -Directory | Sort-Object Name -Descending |
    Select-Object -Skip $KeepBackups | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
}

# 4. Replace each Quint folder with the new files.
$installed = 0
foreach ($t in $targets) {
  $from = Join-Path $Source $t.From
  $files = @()
  if (Test-Path -LiteralPath $from -PathType Container) {
    # Only the files directly in this folder (sub-folders are their own targets),
    # skipping notes and anything starting with an underscore (like the bot template _Template.cs).
    $files = @(Get-ChildItem -LiteralPath $from -File -Filter $t.Filter |
      Where-Object { $_.Name -ne 'README.md' -and $_.Name -notlike '_*' -and $_.Name -ne 'firm.schema.json' })
  }
  if (Test-Path -LiteralPath $t.To) { Remove-Item -LiteralPath $t.To -Recurse -Force }
  if ($files.Count -eq 0) {
    Say ("  {0,-28} nothing to install yet" -f $t.Name) 'DarkGray'
    continue
  }
  New-Item -ItemType Directory -Force -Path $t.To | Out-Null
  foreach ($f in $files) {
    $dest = Join-Path $t.To $f.Name
    Copy-Item -LiteralPath $f.FullName -Destination $dest -Force
    # Files from a download are marked as "from the internet"; NinjaTrader needs them unblocked.
    Unblock-File -LiteralPath $dest -ErrorAction SilentlyContinue
  }
  $installed += $files.Count
  Say ("  {0,-28} {1} file(s) -> {2}" -f $t.Name, $files.Count, $t.To) 'Green'
}

# 5. Make sure the data folders exist. Your settings and journal are never overwritten.
foreach ($folder in @('logs', 'journal', 'settings')) {
  New-Item -ItemType Directory -Force -Path (Join-Path $data $folder) | Out-Null
}

Say ""
Say "Done: $installed file(s) installed." 'Cyan'
Say "Next step:" 'Cyan'
Say "  1. Open NinjaTrader 8 (it can stay open if it already is)."
Say "  2. Control Center > New > NinjaScript Editor."
Say "  3. Press F5 and wait for the sound. The bottom of the editor should show no errors."
Say "  4. If you see errors, copy them exactly and paste them to Claude."
Say ""
