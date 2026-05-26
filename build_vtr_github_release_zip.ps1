$ErrorActionPreference = "Stop"

$game = "C:\Users\andre\Desktop\Voxia TrainerRising"
$out = Join-Path $game "GitHubRelease"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zip = Join-Path $out "VTR_$stamp.zip"
$stage = Join-Path $out "stage_$stamp"

if (Test-Path -LiteralPath $stage) {
  Remove-Item -LiteralPath $stage -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $stage | Out-Null

$excludeTop = @(
  "GitHubRelease",
  "UpdatePackages",
  ".git",
  ".vs",
  "debuglog.txt",
  "errorlog.txt"
)

Get-ChildItem -LiteralPath $game -Force | ForEach-Object {
  if ($excludeTop -contains $_.Name) { return }
  $dest = Join-Path $stage $_.Name
  if ($_.PSIsContainer) {
    Copy-Item -LiteralPath $_.FullName -Destination $dest -Recurse -Force
  } else {
    Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
  }
}

if (Test-Path -LiteralPath $zip) {
  Remove-Item -LiteralPath $zip -Force
}
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -Force
Remove-Item -LiteralPath $stage -Recurse -Force

Write-Host $zip
