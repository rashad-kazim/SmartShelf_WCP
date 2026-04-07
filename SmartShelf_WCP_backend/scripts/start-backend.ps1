$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = Split-Path -Parent $scriptDir

& (Join-Path $scriptDir 'ensure-local-services.ps1')

Set-Location $backendRoot
go run ./cmd/api
