using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;

namespace IneoRbe.Planning
{
    // Mode simulation : un curseur fictif se déplace sur le tracé de la ligne d'un service en cours. Sa position part au serveur,
    // puis à l'UC (annonces sonores) et à la console, comme le ferait un vrai GPS.
    public sealed class SimulationDialog : Window
    {
        private readonly object _mission;
        private readonly List<object> _lines;
        private readonly List<int> _indexes = new List<int>();
        private readonly ComboBox _course = new ComboBox { Margin = new Thickness(0, 0, 10, 0), MinWidth = 260 };
        private readonly ComboBox _jump = new ComboBox { Margin = new Thickness(0, 0, 10, 0), MinWidth = 220, DisplayMemberPath = "Value", SelectedValuePath = "Key" };
        private readonly ComboBox _speed = new ComboBox { Margin = new Thickness(0, 0, 10, 0), Width = 90 };
        private readonly MapControl _map = new MapControl();
        private readonly Slider _slider = new Slider { Minimum = 0, Maximum = 1, Margin = new Thickness(0, 8, 0, 4) };
        private readonly TextBlock _status = Ui.Text(string.Empty, 12, false, Ui.Muted);
        private readonly Button _play;
        private readonly DispatcherTimer _timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        private readonly string _missionId;
        private List<Point> _path = new List<Point>();
        private List<double> _cumulative = new List<double>();
        private List<StopRow> _stops = new List<StopRow>();
        private double _distance;
        private bool _playing;
        private bool _updating;
        private bool _manual;
        private int _failures;

        public SimulationDialog(Window owner, object mission, List<object> lines)
        {
            Owner = owner;
            _mission = mission;
            _lines = lines;
            _missionId = Json.Str(mission, "id");
            Title = "Simulation – service " + Json.Str(mission, "serviceReference");
            Width = 980; Height = 700;
            WindowStartupLocation = WindowStartupLocation.CenterOwner;

            var courses = Json.List(mission, "courses");
            var current = (int)(Json.Num(mission, "courseIndex") ?? 0);
            for (var i = 0; i < courses.Count; i++)
            {
                var direction = Json.Str(courses[i], "direction");
                if (direction == "HLP") continue;
                _indexes.Add(i);
                _course.Items.Add((i + 1) + ". " + Json.Str(courses[i], "lineName") + (direction == "ALLER" ? " (aller)" : " (retour)"));
            }
            _speed.ItemsSource = new[] { "20 km/h", "30 km/h", "50 km/h", "80 km/h" };
            _speed.SelectedIndex = 1;
            _play = Ui.Button("▶ Lecture", (s, e) => SetPlaying(!_playing), true);

            var top = new WrapPanel { Margin = new Thickness(0, 0, 0, 8) };
            top.Children.Add(Ui.Text("Course", 12, true)); top.Children.Add(new Border { Width = 6 }); top.Children.Add(_course);
            top.Children.Add(Ui.Text("Aller à l'arrêt", 12, true)); top.Children.Add(new Border { Width = 6 }); top.Children.Add(_jump);
            var bottom = new WrapPanel { Margin = new Thickness(0, 4, 0, 0) };
            bottom.Children.Add(_play);
            bottom.Children.Add(Ui.Text("Vitesse", 12, true)); bottom.Children.Add(new Border { Width = 6 }); bottom.Children.Add(_speed);
            bottom.Children.Add(Ui.Button("Arrêter la simulation", (s, e) => { SetPlaying(false); Stop(); Close(); }));

            var root = new Grid { Margin = new Thickness(12) };
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            root.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            root.Children.Add(top);
            Grid.SetRow(_map, 1); root.Children.Add(_map);
            var foot = new StackPanel();
            foot.Children.Add(_slider);
            foot.Children.Add(bottom);
            foot.Children.Add(_status);
            Grid.SetRow(foot, 2); root.Children.Add(foot);
            Content = root;

            _course.SelectionChanged += (s, e) => LoadCourse(true);
            _jump.SelectionChanged += (s, e) => JumpToStop();
            _slider.ValueChanged += (s, e) => { if (_updating) return; _distance = _slider.Value; _manual = true; Refresh(); };
            _map.MapClicked += (lat, lng) => { _distance = Project(lat, lng); _manual = true; SetSlider(); Refresh(); };
            _timer.Tick += (s, e) => Tick();
            Closed += (s, e) => { _timer.Stop(); Stop(); };

            var start = _indexes.FindIndex(i => i >= current);
            if (start < 0) start = _indexes.Count - 1;
            _course.SelectedIndex = _course.Items.Count == 0 ? -1 : Math.Max(0, start);
            _timer.Start();
        }

        private static double Meters(Point a, Point b)
        {
            var dLat = (b.X - a.X) * Math.PI / 180.0;
            var dLng = (b.Y - a.Y) * Math.PI / 180.0 * Math.Cos((a.X + b.X) / 2 * Math.PI / 180.0);
            return Math.Sqrt(dLat * dLat + dLng * dLng) * 6371000.0;
        }

        private void LoadCourse(bool fromUser)
        {
            _stops.Clear(); _path = new List<Point>(); _cumulative = new List<double>();
            if (_course.SelectedIndex < 0) { _status.Text = "Ce service n'a aucune course avec une ligne."; return; }
            var courseIndex = _indexes[_course.SelectedIndex];
            var course = Json.List(_mission, "courses")[courseIndex];
            var direction = Json.Str(course, "direction");
            var line = _lines.FirstOrDefault(l => Json.Str(l, "id") == Json.Str(course, "lineId"));
            if (line != null)
            {
                _stops = LineData.ReadStops(line, direction == "ALLER" ? "outboundStops" : "returnStops");
                _path = LineData.ReadPath(line, direction == "ALLER" ? "outboundPath" : "returnPath");
            }
            if (_path.Count < 2) _path = _stops.Select(s => new Point(s.Lat, s.Lng)).ToList();
            _cumulative.Add(0);
            for (var i = 1; i < _path.Count; i++) _cumulative.Add(_cumulative[i - 1] + Meters(_path[i - 1], _path[i]));
            var total = _cumulative.Count == 0 ? 0 : _cumulative[_cumulative.Count - 1];
            _updating = true;
            _slider.Maximum = Math.Max(1, total);
            _jump.ItemsSource = _stops.Select((s, i) => new KeyValuePair<int, string>(i, (i + 1) + ". " + s.Label)).ToList();
            _updating = false;

            _map.Lines.Clear();
            var color = Json.Str(line, "color");
            _map.Lines.Add(new MapLine { LatLng = _path, Color = string.IsNullOrEmpty(color) ? Ui.Red : Ui.Brush(color), Thickness = 5 });
            if (_path.Count > 0) _map.FitTo(_path);

            _distance = 0;
            var currentCourse = (int)(Json.Num(_mission, "courseIndex") ?? 0);
            var stopIndex = (int)(Json.Num(_mission, "stopIndex") ?? 0);
            if (!fromUser && courseIndex == currentCourse && stopIndex > 0 && stopIndex < _stops.Count) _distance = Project(_stops[stopIndex].Lat, _stops[stopIndex].Lng);
            _manual = true;
            SetSlider();
            Refresh();
        }

        private void SetSlider() { _updating = true; _slider.Value = Math.Max(0, Math.Min(_slider.Maximum, _distance)); _updating = false; }

        private void JumpToStop()
        {
            if (_updating || !(_jump.SelectedValue is int)) return;
            var stop = _stops[(int)_jump.SelectedValue];
            // On se place un peu avant l'arrêt pour laisser jouer l'annonce d'approche.
            _distance = Math.Max(0, Project(stop.Lat, stop.Lng) - 150);
            _manual = true; SetSlider(); Refresh();
        }

        // Distance le long du tracé du point le plus proche de (lat, lng).
        private double Project(double lat, double lng)
        {
            var p = new Point(lat, lng);
            var best = double.MaxValue; var along = 0.0;
            for (var i = 0; i + 1 < _path.Count; i++)
            {
                var a = _path[i]; var b = _path[i + 1];
                var dx = b.X - a.X; var dy = b.Y - a.Y;
                var len2 = dx * dx + dy * dy;
                var t = len2 < 1e-18 ? 0 : Math.Max(0, Math.Min(1, ((p.X - a.X) * dx + (p.Y - a.Y) * dy) / len2));
                var q = new Point(a.X + t * dx, a.Y + t * dy);
                var d = Meters(p, q);
                if (d < best) { best = d; along = _cumulative[i] + t * (_cumulative[i + 1] - _cumulative[i]); }
            }
            return along;
        }

        private Point PositionAt(double distance)
        {
            if (_path.Count == 0) return new Point();
            for (var i = 1; i < _path.Count; i++)
            {
                if (_cumulative[i] < distance) continue;
                var span = _cumulative[i] - _cumulative[i - 1];
                var t = span < 1e-6 ? 0 : (distance - _cumulative[i - 1]) / span;
                return new Point(_path[i - 1].X + t * (_path[i].X - _path[i - 1].X), _path[i - 1].Y + t * (_path[i].Y - _path[i - 1].Y));
            }
            return _path[_path.Count - 1];
        }

        private double SpeedKmh()
        {
            var text = _speed.SelectedItem as string;
            double value;
            return text != null && double.TryParse(text.Split(' ')[0], out value) ? value : 30;
        }

        private void SetPlaying(bool playing)
        {
            _playing = playing && _path.Count > 1;
            _play.Content = _playing ? "⏸ Pause" : "▶ Lecture";
        }

        private void Refresh()
        {
            _map.Markers.Clear();
            for (var i = 0; i < _stops.Count; i++)
                _map.Markers.Add(new MapMarker { Lat = _stops[i].Lat, Lng = _stops[i].Lng, Label = _stops[i].Label, Color = Brushes.White, Size = 10 });
            if (_path.Count > 0)
            {
                var position = PositionAt(_distance);
                _map.Markers.Add(new MapMarker { Lat = position.X, Lng = position.Y, Color = Brushes.Red, Size = 20, Label = "Véhicule fictif" });
            }
            _map.Render();
        }

        private void Tick()
        {
            if (_path.Count < 2) return;
            if (_playing)
            {
                _distance += SpeedKmh() / 3.6;
                if (_distance >= _slider.Maximum) { _distance = _slider.Maximum; SetPlaying(false); }
                SetSlider();
                Refresh();
            }
            var position = PositionAt(_distance);
            var speed = _playing ? SpeedKmh() : (_manual ? 20.0 : 0.0);
            _manual = false;
            var body = new Dictionary<string, object> { { "latitude", position.X }, { "longitude", position.Y }, { "speedKmh", speed } };
            var missionId = _missionId;
            // Envoyée toutes les secondes, même à l'arrêt : sans nouvelle position, la simulation expire côté serveur.
            Ui.Run(Dispatcher, () => Api.Send("POST", "/ineo/missions/" + missionId + "/simulate", body), r => { _failures = 0; ShowStatus(); }, error =>
            {
                _failures++;
                _status.Text = "Simulation interrompue : " + error;
                if (_failures >= 3) SetPlaying(false);
            });
        }

        private void ShowStatus()
        {
            var next = _stops.Select((s, i) => new { s, i }).Where(x => Project(x.s.Lat, x.s.Lng) >= _distance - 20).Select(x => x.s.Label).FirstOrDefault();
            _status.Text = "Position envoyée au serveur, à l'UC et à la console. " + (_distance / 1000.0).ToString("0.00") + " km parcourus"
                + (next == null ? "." : " – prochain arrêt : " + next + ".");
        }

        private void Stop()
        {
            var id = _missionId;
            Ui.Run(Dispatcher, () => Api.Send("POST", "/ineo/missions/" + id + "/simulate", new Dictionary<string, object> { { "stop", true } }), r => { }, error => { });
        }
    }
}
