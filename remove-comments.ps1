param([string]$filePath)

$content = Get-Content -Path $filePath -Raw
if ($null -eq $content) { return }

# Remove single-line comments but preserve strings
$inString = $false
$inComment = $false
$result = @()
$line = ""
$i = 0

while ($i -lt $content.Length) {
  $char = $content[$i]
  $nextChar = if ($i + 1 -lt $content.Length) { $content[$i + 1] } else { "" }
  
  if (!$inString) {
    if ($char -eq '"' -or $char -eq "'" -or $char -eq '`') {
      $inString = $true
      $line += $char
    } elseif ($char -eq '/' -and $nextChar -eq '/') {
      $i += 2
      while ($i -lt $content.Length -and $content[$i] -ne "`n") { $i++ }
      continue
    } elseif ($char -eq '/' -and $nextChar -eq '*') {
      $i += 2
      while ($i -lt $content.Length) {
        if ($content[$i] -eq '*' -and $i + 1 -lt $content.Length -and $content[$i + 1] -eq '/') {
          $i += 2
          break
        }
        $i++
      }
      continue
    } else {
      $line += $char
    }
  } else {
    if ($char -eq '"' -or $char -eq "'" -or $char -eq '`') {
      $inString = $false
    }
    $line += $char
  }
  
  if ($char -eq "`n") {
    $result += $line
    $line = ""
  }
  
  $i++
}

if ($line) { $result += $line }

# Remove empty lines
$cleaned = ($result | Where-Object { $_.Trim() } | Join-String -Separator "`n")
Set-Content -Path $filePath -Value $cleaned -NoNewline
