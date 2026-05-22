param(
  [string]$ReferenceRepo = "C:\Users\User\line-ref-mycard",
  [string]$TargetWorker = "https://myvard.fangwl591021.workers.dev",
  [string]$DatabaseName = "actmaster_db",
  [string]$WorkerName = "myvard",
  [int]$BatchSize = 1
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

$tokenFile = Join-Path $PSScriptRoot "admin-import-token.local.txt"
$token = if (Test-Path $tokenFile) {
  (Get-Content -LiteralPath $tokenFile -Raw).Trim()
} else {
  [guid]::NewGuid().ToString("N")
}
Set-Content -LiteralPath $tokenFile -Value $token -Encoding ASCII

$env:CLOUDFLARE_API_TOKEN = $null

Push-Location $PSScriptRoot\..
try {
  $token | npx.cmd wrangler secret put MIGRATION_ADMIN_TOKEN --name $WorkerName
  npx.cmd wrangler deploy
}
finally {
  Pop-Location
}

$query = "SELECT row_id,line_id,name,english_name,company_name,title,department,tax_id,mobile,office_phone,extension,fax,email,website,socials,address,birthday,personality,hobbies,wealth,health,career,services,notes,creator_id,image_url,custom_config,network_id,tags,created_at,updated_at,owner_user_id,source_type,profile_user_id,visibility,ai_review_status,pool_eligible,crm_status,crm_type,crm_next_action,crm_next_followup_at,crm_ai_suggestion FROM card_contacts ORDER BY created_at, row_id;"

Push-Location $ReferenceRepo
try {
  $raw = npx.cmd wrangler d1 execute $DatabaseName --remote --command $query
}
finally {
  Pop-Location
}

$wrangler = Get-WranglerResults -Output ($raw -join "`n")
$cards = @($wrangler[0].results)
if ($cards.Count -eq 0) {
  throw "No cards were returned from $DatabaseName."
}

$importedCount = 0
$skippedCount = 0

for ($offset = 0; $offset -lt $cards.Count; $offset += $BatchSize) {
  $batch = @($cards | Select-Object -Skip $offset -First $BatchSize)
  $payload = @{ cards = $batch } | ConvertTo-Json -Depth 30
  $response = Invoke-RestMethod `
    -Uri "$TargetWorker/api/admin/import/line-cards" `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Headers @{ "x-admin-migration-token" = $token } `
    -Body $payload

  $importedCount += [int]$response.imported_count
  $skippedCount += [int]$response.skipped_count
}

[pscustomobject]@{
  ok = $true
  source_cards = $cards.Count
  imported_count = $importedCount
  skipped_count = $skippedCount
  batch_size = $BatchSize
  token_file = $tokenFile
} | ConvertTo-Json -Depth 5
