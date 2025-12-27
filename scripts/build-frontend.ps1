param(
  [string]$RepoRoot = (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) ".."))
)

Set-Location $RepoRoot

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw "pnpm is not installed. Install it first (corepack enable or npm i -g pnpm)."
}

if (-not (Test-Path "node_modules")) {
  pnpm install
}

pnpm build

if (-not (Test-Path "dist")) {
  throw "dist/ not found after build."
}

Write-Host ""
Write-Host "Build complete."
Write-Host "Upload the contents of dist/ to your Strato webspace folder."
