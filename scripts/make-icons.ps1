# Builds the app icons in public/ from assets/Airplane.png, using Windows' built-in
# System.Drawing (no npm packages). Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1
#
# The source is a dark circular badge on a white square. iPhone shows white corners as a white
# tile, so the white background (only the part connected to the edges, not the white plane) is
# recolored to the badge's dark gray, giving one solid dark icon.

param(
  [string]$Source = (Join-Path $PSScriptRoot '..\assets\Airplane.png')
)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System.Collections.Generic;
using System.Drawing;

public static class IconTools {
  // Flood-fills near-white pixels reachable from the image border with `fill`.
  public static void FillBackground(Bitmap bmp, Color fill, int threshold) {
    int w = bmp.Width, h = bmp.Height;
    var seen = new bool[w, h];
    var queue = new Queue<Point>();
    for (int x = 0; x < w; x++) { queue.Enqueue(new Point(x, 0)); queue.Enqueue(new Point(x, h - 1)); }
    for (int y = 0; y < h; y++) { queue.Enqueue(new Point(0, y)); queue.Enqueue(new Point(w - 1, y)); }
    while (queue.Count > 0) {
      var p = queue.Dequeue();
      if (p.X < 0 || p.Y < 0 || p.X >= w || p.Y >= h || seen[p.X, p.Y]) continue;
      seen[p.X, p.Y] = true;
      var c = bmp.GetPixel(p.X, p.Y);
      bool background = c.A < 16 || (c.R >= threshold && c.G >= threshold && c.B >= threshold);
      if (!background) continue;
      bmp.SetPixel(p.X, p.Y, fill);
      queue.Enqueue(new Point(p.X + 1, p.Y)); queue.Enqueue(new Point(p.X - 1, p.Y));
      queue.Enqueue(new Point(p.X, p.Y + 1)); queue.Enqueue(new Point(p.X, p.Y - 1));
    }
  }
}
'@

$out = Join-Path $PSScriptRoot '..\public'
New-Item -ItemType Directory -Force $out | Out-Null

$bg = [System.Drawing.Color]::FromArgb(255, 58, 58, 58)
$src = New-Object System.Drawing.Bitmap ([System.Drawing.Bitmap]::FromFile((Resolve-Path $Source)))
[IconTools]::FillBackground($src, $bg, 150)

# $scale: how much of the square the badge fills. Maskable icons (Android) get cropped to a
# circle, so they need more padding.
function Save-Icon([int]$size, [string]$name, [double]$scale) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'
  $g.Clear($bg)
  $fit = $size * $scale / [Math]::Max($src.Width, $src.Height)
  $w = $src.Width * $fit; $h = $src.Height * $fit
  $g.DrawImage($src, [single](($size - $w) / 2), [single](($size - $h) / 2), [single]$w, [single]$h)
  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Save-Icon 512 'pwa-512x512.png' 0.92
Save-Icon 192 'pwa-192x192.png' 0.92
Save-Icon 512 'pwa-maskable-512x512.png' 0.78
Save-Icon 180 'apple-touch-icon.png' 0.92
Save-Icon 64 'favicon.png' 1.0
$src.Dispose()
Write-Output "Icons written to $((Resolve-Path $out).Path)"
