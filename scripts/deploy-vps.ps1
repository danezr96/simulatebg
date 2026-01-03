param(
  [string]$TargetHost = "root@85.215.192.58",
  [string]$RemotePath = "/srv/simulatebg",
  [string]$ServiceName = "simulatebg-worker",
  [switch]$UploadFrontend,
  [switch]$CleanFrontendAssets,
  [string]$FrontendRoot = "/var/snap/caddy/common/www"
)

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
  throw "ssh is not available. Install OpenSSH client first."
}

if ($UploadFrontend -and -not (Get-Command scp -ErrorAction SilentlyContinue)) {
  throw "scp is not available. Install OpenSSH client first."
}

$remoteCommand = @"
set -e
cd $RemotePath
git pull
pnpm install
systemctl restart $ServiceName
systemctl status $ServiceName --no-pager
"@

ssh $TargetHost $remoteCommand

if ($UploadFrontend) {
  if (-not (Test-Path "dist")) {
    throw "dist/ not found. Run scripts/build-frontend.ps1 first."
  }

  if ($CleanFrontendAssets) {
    $cleanupCommand = @"
set -e
rm -rf $FrontendRoot/assets/*
rm -f $FrontendRoot/index.html $FrontendRoot/vite.svg
"@
    ssh $TargetHost $cleanupCommand
  }

  scp -r dist/* "${TargetHost}:${FrontendRoot}/"
}
