param(
  [Parameter(Mandatory = $true)][string]$TargetHost,
  [string]$RemotePath = "/srv/simulatebg",
  [string]$ServiceName = "simulatebg-worker"
)

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
  throw "ssh is not available. Install OpenSSH client first."
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
