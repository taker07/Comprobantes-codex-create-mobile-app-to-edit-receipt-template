$ErrorActionPreference = 'Stop'

$projectDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$editorUrl = 'http://127.0.0.1:4173/template-designer.html'

function Test-EditorServer {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $editorUrl -TimeoutSec 1
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Test-EditorServer)) {
  $bundledPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
  $pythonCommand = Get-Command py.exe -ErrorAction SilentlyContinue

  if (-not $pythonCommand) {
    $pythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue
  }

  $pythonExecutable = if ($pythonCommand) {
    $pythonCommand.Source
  } elseif (Test-Path -LiteralPath $bundledPython) {
    $bundledPython
  } else {
    throw 'No se encontró Python. Instala Python 3 o ejecuta el editor desde Codex.'
  }

  Start-Process `
    -FilePath $pythonExecutable `
    -ArgumentList '-m', 'http.server', '4173', '--bind', '127.0.0.1' `
    -WorkingDirectory $projectDirectory `
    -WindowStyle Hidden

  $serverReady = $false
  for ($attempt = 0; $attempt -lt 20; $attempt += 1) {
    Start-Sleep -Milliseconds 250
    if (Test-EditorServer) {
      $serverReady = $true
      break
    }
  }

  if (-not $serverReady) {
    throw 'El servidor local no respondió en el puerto 4173.'
  }
}

Start-Process $editorUrl
