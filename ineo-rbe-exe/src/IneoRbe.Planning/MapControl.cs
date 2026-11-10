using System;
using System.Collections.Generic;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

namespace IneoRbe.Planning
{
    public sealed class MapMarker
    {
        public double Lat;
        public double Lng;
        public string Label;
        public Brush Color;
        public double Size = 14;
        public double Opacity = 1;
    }

    public sealed class MapLine
    {
        public List<Point> LatLng = new List<Point>(); // X = lat, Y = lng
        public Brush Color;
        public double Thickness = 4;
        public double Opacity = 1;
    }

    // Carte à tuiles OpenStreetMap relayées par le serveur RétroBus (glisser pour déplacer, molette pour zoomer).
    public sealed class MapControl : Canvas
    {
        private const int TileSize = 256;
        private static readonly Dictionary<string, BitmapSource> Cache = new Dictionary<string, BitmapSource>();
        private static readonly HashSet<string> Pending = new HashSet<string>();

        private double _lat = 48.62;
        private double _lng = 2.35;
        private int _zoom = 10;
        private Point _dragStart;
        private bool _dragging;
        private bool _moved;

        public List<MapMarker> Markers = new List<MapMarker>();
        public List<MapLine> Lines = new List<MapLine>();
        public event Action<double, double> MapClicked;

        public MapControl()
        {
            Background = Brushes.WhiteSmoke;
            ClipToBounds = true;
            SizeChanged += (s, e) => Render();
            MouseLeftButtonDown += (s, e) => { _dragging = true; _moved = false; _dragStart = e.GetPosition(this); CaptureMouse(); };
            MouseLeftButtonUp += OnMouseUp;
            MouseMove += OnMouseMove;
            MouseWheel += (s, e) => { SetZoom(_zoom + (e.Delta > 0 ? 1 : -1)); };
        }

        public void SetView(double lat, double lng, int zoom)
        {
            _lat = lat; _lng = lng; _zoom = Math.Max(2, Math.Min(18, zoom));
            Render();
        }

        public void FitTo(IEnumerable<Point> points)
        {
            double minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
            var any = false;
            foreach (var p in points)
            {
                any = true;
                minLat = Math.Min(minLat, p.X); maxLat = Math.Max(maxLat, p.X);
                minLng = Math.Min(minLng, p.Y); maxLng = Math.Max(maxLng, p.Y);
            }
            if (!any) return;
            _lat = (minLat + maxLat) / 2;
            _lng = (minLng + maxLng) / 2;
            var zoom = 16;
            while (zoom > 3 && (ActualWidth > 0) && (Math.Abs(LngToX(maxLng, zoom) - LngToX(minLng, zoom)) > ActualWidth - 80 || Math.Abs(LatToY(minLat, zoom) - LatToY(maxLat, zoom)) > ActualHeight - 80)) zoom--;
            _zoom = zoom;
            Render();
        }

        private void SetZoom(int zoom)
        {
            _zoom = Math.Max(2, Math.Min(18, zoom));
            Render();
        }

        private void OnMouseMove(object sender, MouseEventArgs e)
        {
            if (!_dragging) return;
            var now = e.GetPosition(this);
            var dx = now.X - _dragStart.X;
            var dy = now.Y - _dragStart.Y;
            if (Math.Abs(dx) < 1 && Math.Abs(dy) < 1) return;
            var cx = LngToX(_lng, _zoom) - dx;
            var cy = LatToY(_lat, _zoom) - dy;
            _lng = XToLng(cx, _zoom);
            _lat = YToLat(cy, _zoom);
            _dragStart = now;
            _moved = true;
            Render();
        }

        private void OnMouseUp(object sender, MouseButtonEventArgs e)
        {
            var wasDragging = _dragging;
            _dragging = false;
            ReleaseMouseCapture();
            if (!wasDragging) return;
            var p = e.GetPosition(this);
            if (MapClicked != null && !_moved)
            {
                var x = LngToX(_lng, _zoom) - ActualWidth / 2 + p.X;
                var y = LatToY(_lat, _zoom) - ActualHeight / 2 + p.Y;
                MapClicked(YToLat(y, _zoom), XToLng(x, _zoom));
            }
        }

        public void Render()
        {
            Children.Clear();
            if (ActualWidth < 10 || ActualHeight < 10) return;
            var originX = LngToX(_lng, _zoom) - ActualWidth / 2;
            var originY = LatToY(_lat, _zoom) - ActualHeight / 2;
            var count = 1 << _zoom;
            var firstX = (int)Math.Floor(originX / TileSize);
            var firstY = (int)Math.Floor(originY / TileSize);
            var lastX = (int)Math.Floor((originX + ActualWidth) / TileSize);
            var lastY = (int)Math.Floor((originY + ActualHeight) / TileSize);
            for (var tx = firstX; tx <= lastX; tx++)
            {
                for (var ty = firstY; ty <= lastY; ty++)
                {
                    if (ty < 0 || ty >= count) continue;
                    var wrapped = ((tx % count) + count) % count;
                    var key = _zoom + "/" + wrapped + "/" + ty;
                    BitmapSource tile;
                    if (Cache.TryGetValue(key, out tile))
                    {
                        var image = new Image { Source = tile, Width = TileSize, Height = TileSize };
                        SetLeft(image, tx * TileSize - originX);
                        SetTop(image, ty * TileSize - originY);
                        Children.Add(image);
                    }
                    else RequestTile(key, _zoom, wrapped, ty);
                }
            }

            foreach (var line in Lines)
            {
                var polyline = new Polyline { Stroke = line.Color ?? Ui.Red, StrokeThickness = line.Thickness, Opacity = line.Opacity, StrokeLineJoin = PenLineJoin.Round };
                foreach (var p in line.LatLng) polyline.Points.Add(new Point(LngToX(p.Y, _zoom) - originX, LatToY(p.X, _zoom) - originY));
                Children.Add(polyline);
            }

            foreach (var marker in Markers)
            {
                var x = LngToX(marker.Lng, _zoom) - originX;
                var y = LatToY(marker.Lat, _zoom) - originY;
                if (x < -50 || y < -50 || x > ActualWidth + 50 || y > ActualHeight + 50) continue;
                var dot = new Ellipse { Width = marker.Size, Height = marker.Size, Fill = marker.Color ?? Ui.Red, Stroke = Brushes.White, StrokeThickness = 2, Opacity = marker.Opacity };
                SetLeft(dot, x - marker.Size / 2);
                SetTop(dot, y - marker.Size / 2);
                Children.Add(dot);
                if (!string.IsNullOrEmpty(marker.Label))
                {
                    var label = new Border
                    {
                        Background = new SolidColorBrush(Color.FromArgb(220, 255, 255, 255)),
                        Padding = new Thickness(3, 1, 3, 1),
                        Child = new TextBlock { Text = marker.Label, FontSize = 11 },
                    };
                    SetLeft(label, x + 10);
                    SetTop(label, y - 9);
                    Children.Add(label);
                }
            }

            var credit = new TextBlock { Text = "© OpenStreetMap", FontSize = 9, Background = Brushes.White, Padding = new Thickness(2) };
            SetRight(credit, 0);
            SetBottom(credit, 0);
            Children.Add(credit);
        }

        private void RequestTile(string key, int z, int x, int y)
        {
            lock (Pending) { if (!Pending.Add(key)) return; }
            System.Threading.ThreadPool.QueueUserWorkItem(delegate
            {
                BitmapSource bitmap = null;
                try
                {
                    var bytes = Api.GetBytes("/ineo/map-tiles/" + z + "/" + x + "/" + y + ".png");
                    var decoded = new BitmapImage();
                    decoded.BeginInit();
                    decoded.CacheOption = BitmapCacheOption.OnLoad;
                    decoded.StreamSource = new MemoryStream(bytes);
                    decoded.EndInit();
                    decoded.Freeze();
                    bitmap = decoded;
                }
                catch (Exception) { }
                lock (Pending) { Pending.Remove(key); }
                if (bitmap == null) return;
                Dispatcher.BeginInvoke(new Action(() => { Cache[key] = bitmap; Render(); }));
            });
        }

        private static double LngToX(double lng, int zoom) { return (lng + 180.0) / 360.0 * TileSize * (1 << zoom); }

        private static double LatToY(double lat, int zoom)
        {
            var rad = lat * Math.PI / 180.0;
            return (1.0 - Math.Log(Math.Tan(rad) + 1.0 / Math.Cos(rad)) / Math.PI) / 2.0 * TileSize * (1 << zoom);
        }

        private static double XToLng(double x, int zoom) { return x / (TileSize * (double)(1 << zoom)) * 360.0 - 180.0; }

        private static double YToLat(double y, int zoom)
        {
            var n = Math.PI - 2.0 * Math.PI * y / (TileSize * (double)(1 << zoom));
            return 180.0 / Math.PI * Math.Atan(0.5 * (Math.Exp(n) - Math.Exp(-n)));
        }
    }
}
