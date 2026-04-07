$postgresCtl = 'D:\Dev\Scoop\apps\postgresql16\current\bin\pg_ctl.exe'
$postgresData = 'D:\Dev\Scoop\apps\postgresql16\current\data'
$redisScript = 'D:\Dev\SmartShelf\Redis\start-redis.ps1'
$minioScript = 'D:\Dev\SmartShelf\MinIO\start-minio.ps1'
$backendLogDir = 'C:\Users\rasha\Desktop\SmartShelf_WCP\SmartShelf_WCP_backend'

function Test-PortListening($port) {
  return [bool](Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $port } | Select-Object -First 1)
}

if (-not (Test-PortListening 5432)) {
  if (-not (Test-Path $postgresCtl)) {
    throw 'PostgreSQL pg_ctl bulunamadi.'
  }
  & $postgresCtl -D $postgresData -l (Join-Path $backendLogDir 'postgres.runtime.log') start | Out-Null
  Start-Sleep -Seconds 3
}

if (-not (Test-PortListening 6379) -and (Test-Path $redisScript)) {
  Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$redisScript`"" -WindowStyle Hidden | Out-Null
  Start-Sleep -Seconds 2
}

if (-not (Test-PortListening 9000) -and (Test-Path $minioScript)) {
  Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$minioScript`"" -WindowStyle Hidden | Out-Null
  Start-Sleep -Seconds 3
}

if (-not (Test-PortListening 5432)) { throw 'PostgreSQL baslatilamadi.' }
if (-not (Test-PortListening 6379)) { throw 'Redis baslatilamadi.' }
if (-not (Test-PortListening 9000)) { throw 'MinIO baslatilamadi.' }
