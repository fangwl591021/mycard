param(
  [string]$ReferenceRepo = "C:\Users\User\line-ref-mycard",
  [string]$TargetWorker = "https://myvard.fangwl591021.workers.dev",
  [string]$DatabaseName = "actmaster_db",
  [string]$WorkerName = "myvard",
  [int]$BatchSize = 4
)

$ErrorActionPreference = "Stop"

function Get-WranglerResults {
  param([string]$Output)

  $start = $Output.IndexOf("[")
  if ($start -lt 0) {
    throw "Wrangler output did not contain JSON results."
  }

  $json = $Output.Substring($start)
  return $json | ConvertFrom-Json
}

$token = [guid]::NewGuid().ToString("N")
$env:CLOUDFLARE_API_TOKEN = $null

Push-Location $PSScriptRoot\..
try {
  $token | npx.cmd wrangler secret put MIGRATION_ADMIN_TOKEN --name $WorkerName
  npx.cmd wrangler deploy
}
finally {
  Pop-Location
}

$query = "SELECT row_id,line_id,name,industry,gender,phone,birthday,region,address,socials,created_at,role,store_id,referrer_id,network_id,points,legacy_line_id,point_line_id,identity_source,migrated_at FROM users ORDER BY created_at, row_id;"

Push-Location $ReferenceRepo
try {
  $raw = npx.cmd wrangler d1 execute $DatabaseName --remote --command $query
}
finally {
  Pop-Location
}

$wrangler = Get-WranglerResults -Output ($raw -join "`n")
$users = @($wrangler[0].results)
if ($users.Count -eq 0) {
  throw "No users were returned from $DatabaseName."
}

$importedCount = 0
$skippedCount = 0

for ($offset = 0; $offset -lt $users.Count; $offset += $BatchSize) {
  $batch = @($users | Select-Object -Skip $offset -First $BatchSize)
  $payload = @{ users = $batch } | ConvertTo-Json -Depth 20
  $response = Invoke-RestMethod `
    -Uri "$TargetWorker/api/admin/import/line-users" `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Headers @{ "x-admin-migration-token" = $token } `
    -Body $payload

  $importedCount += [int]$response.imported_count
  $skippedCount += [int]$response.skipped_count
}

$safeSummary = [pscustomobject]@{
  ok = $true
  source_users = $users.Count
  imported_count = $importedCount
  skipped_count = $skippedCount
  batch_size = $BatchSize
}

$safeSummary | ConvertTo-Json -Depth 5
