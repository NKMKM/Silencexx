param(
    [ValidateSet('web', 'apk')][string]$Target = 'web',
    [string]$ApiBaseUrl = '',
    [switch]$Debug
)
$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path $PSScriptRoot -Parent
# Flutter 3.35's native shader/font tools on Windows cannot reliably write
# through non-ASCII paths. Build a fresh snapshot under the temporary directory.
$stageRoot = Join-Path ([IO.Path]::GetTempPath()) ('silencexx-build-' + [guid]::NewGuid().ToString('N'))
if ($stageRoot -match '[^\x00-\x7F]') {
    throw 'TEMP must point to an ASCII-only path for the Windows Flutter toolchain.'
}
New-Item -ItemType Directory -Path $stageRoot | Out-Null
foreach ($name in @('lib', 'test', 'android', 'ios', 'web', 'pubspec.yaml', 'pubspec.lock', 'analysis_options.yaml', '.metadata')) {
    $source = Join-Path $sourceRoot $name
    if (Test-Path -LiteralPath $source) {
        Copy-Item -LiteralPath $source -Destination $stageRoot -Recurse
    }
}
$flutterCommand = Get-Command flutter -ErrorAction Stop
$flutterRoot = Split-Path (Split-Path $flutterCommand.Source -Parent) -Parent
$dart = Join-Path $flutterRoot 'bin\cache\dart-sdk\bin\dart.exe'
$snapshot = Join-Path $flutterRoot 'bin\cache\flutter_tools.snapshot'
Push-Location $stageRoot
try {
    & $dart $snapshot pub get
    if ($LASTEXITCODE -ne 0) { throw 'Flutter dependency resolution failed.' }
    $buildArguments = @('build', $Target, '--no-pub')
    if ($Debug) { $buildArguments += '--debug' }
    if ($ApiBaseUrl) { $buildArguments += "--dart-define=API_BASE_URL=$ApiBaseUrl" }
    if ($Target -eq 'apk') {
        # Preserve ASCII-only temporary paths when Gradle invokes flutter.bat.
        $originalTemp = $env:TEMP
        $originalTmp = $env:TMP
        try {
            $env:TEMP = $stageRoot
            $env:TMP = $stageRoot
            & $dart $snapshot @buildArguments --verbose
            if ($LASTEXITCODE -ne 0) { throw "Flutter $Target build failed with exit code $LASTEXITCODE. Working copy: $stageRoot" }
        } finally {
            $env:TEMP = $originalTemp
            $env:TMP = $originalTmp
        }
    } else {
        & $dart $snapshot @buildArguments
        if ($LASTEXITCODE -ne 0) { throw "Flutter $Target build failed with exit code $LASTEXITCODE. Working copy: $stageRoot" }
    }
    $outputRoot = Join-Path $sourceRoot 'build'
    New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
    if ($Target -eq 'web') {
        # Use a unique output directory to avoid retaining stale bundles.
        $destination = Join-Path $outputRoot ('web-' + [DateTime]::Now.ToString('yyyyMMdd-HHmmss'))
        Copy-Item -LiteralPath (Join-Path $stageRoot 'build\web') -Destination $destination -Recurse
    } else {
        $destination = Join-Path $outputRoot 'apk'
        New-Item -ItemType Directory -Path $destination -Force | Out-Null
        $apk = Get-ChildItem -LiteralPath (Join-Path $stageRoot 'build\app\outputs\flutter-apk') -Filter '*.apk' |
            Select-Object -First 1
        if (-not $apk) { throw 'Flutter completed without producing an APK.' }
        Copy-Item -LiteralPath $apk.FullName -Destination (Join-Path $destination 'silencexx-debug.apk')
    }
    Write-Output "Build output: $destination"
    Write-Output "Temporary build copy: $stageRoot"
} finally { Pop-Location }
