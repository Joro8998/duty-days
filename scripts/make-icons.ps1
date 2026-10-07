# Draws the app icons into public/ using Windows' built-in System.Drawing (no npm packages).
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1

Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot '..\public'
New-Item -ItemType Directory -Force $out | Out-Null

function New-RoundedRect([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function Draw-Icon([int]$size, [string]$name) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $s = $size / 512.0

  # Full-bleed background: iOS and Android apply their own rounded mask.
  $g.Clear([System.Drawing.Color]::FromArgb(255, 37, 99, 201))

  # Calendar card, kept inside the central 80% "safe zone" for maskable icons.
  $cx = 116 * $s; $cy = 112 * $s; $cw = 280 * $s; $ch = 292 * $s
  $card = New-RoundedRect $cx $cy $cw $ch (36 * $s)
  $g.FillPath([System.Drawing.Brushes]::White, $card)

  # Header band.
  $g.SetClip($card)
  $band = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 22, 63, 133))
  $g.FillRectangle($band, $cx, $cy, $cw, 64 * $s)
  $g.ResetClip()

  # Binder rings.
  $ring = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 220, 230, 245))
  foreach ($rx in 184, 300) {
    $g.FillPath($ring, (New-RoundedRect ($rx * $s) (86 * $s) (28 * $s) (56 * $s) (14 * $s)))
  }

  # 3 x 3 day grid; one amber "worked day off".
  $dayBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 37, 99, 201))
  $amber = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 245, 158, 11))
  $cell = 46 * $s; $gap = 18 * $s
  $grid = 3 * $cell + 2 * $gap
  $gx = $cx + ($cw - $grid) / 2
  $gy = $cy + 64 * $s + ($ch - 64 * $s - $grid) / 2
  for ($r = 0; $r -lt 3; $r++) {
    for ($c = 0; $c -lt 3; $c++) {
      $brush = if ($r -eq 1 -and $c -eq 2) { $amber } else { $dayBrush }
      $g.FillPath($brush, (New-RoundedRect ($gx + $c * ($cell + $gap)) ($gy + $r * ($cell + $gap)) $cell $cell (12 * $s)))
    }
  }

  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Draw-Icon 512 'pwa-512x512.png'
Draw-Icon 192 'pwa-192x192.png'
Draw-Icon 180 'apple-touch-icon.png'
Draw-Icon 64 'favicon.png'
Write-Output "Icons written to $((Resolve-Path $out).Path)"
