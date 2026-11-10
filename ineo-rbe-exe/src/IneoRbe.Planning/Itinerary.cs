using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Media;

namespace IneoRbe.Planning
{
    public sealed class StopRow
    {
        public string City { get; set; }
        public string Label { get; set; }
        public double Lat { get; set; }
        public double Lng { get; set; }
    }

    public sealed class CourseRow
    {
        public string LineId { get; set; }
        public string Direction { get; set; }
        public string DepartureTime { get; set; }
    }

    // Conversions entre le JSON de l'API et les lignes des tableaux.
    public static class LineData
    {
        public static List<StopRow> ReadStops(object line, string key)
        {
            var rows = new List<StopRow>();
            foreach (var stop in Json.List(line, key))
            {
                rows.Add(new StopRow { City = Json.Str(stop, "city"), Label = Json.Str(stop, "label"), Lat = Json.Num(stop, "lat") ?? 0, Lng = Json.Num(stop, "lng") ?? 0 });
            }
            return rows;
        }

        public static List<Point> ReadPath(object line, string key)
        {
            var points = new List<Point>();
            foreach (var item in Json.Arr(Json.Get(line, key)))
            {
                var pair = item as List<object>;
                if (pair == null || pair.Count < 2 || !(pair[0] is double) || !(pair[1] is double)) continue;
                points.Add(new Point((double)pair[0], (double)pair[1]));
            }
            return points;
        }

        public static List<object> StopsJson(IEnumerable<StopRow> stops)
        {
            return stops.Select(s => (object)new Dictionary<string, object> { { "city", s.City ?? string.Empty }, { "label", s.Label }, { "lat", s.Lat }, { "lng", s.Lng } }).ToList();
        }

        public static List<object> PathJson(IEnumerable<Point> path)
        {
            return path.Select(p => (object)new List<object> { Math.Round(p.X, 6), Math.Round(p.Y, 6) }).ToList();
        }

        public static List<CourseRow> ReadCourses(object mission)
        {
            var rows = new List<CourseRow>();
            foreach (var course in Json.List(mission, "courses"))
            {
                rows.Add(new CourseRow { LineId = Json.Str(course, "lineId"), Direction = Json.Str(course, "direction"), DepartureTime = Json.Str(course, "departureTime") });
            }
            return rows;
        }

        public static string DirectionLabel(string direction)
        {
            if (direction == "ALLER") return "Aller";
            if (direction == "RETOUR") return "Retour";
            return "HLP";
        }
    }

    // Éditeur d'itinéraire : tableau VILLE | ARRÊT | LATITUDE | LONGITUDE et carte OpenStreetMap (clic = arrêt ou point du tracé).
    public sealed class ItineraryDialog : Window
    {
        private readonly ObservableCollection<StopRow> _stops;
        private readonly List<Point> _path;
        private readonly MapControl _map = new MapControl { MinHeight = 300 };
        private readonly DataGrid _grid = new DataGrid { AutoGenerateColumns = false, CanUserAddRows = false, CanUserSortColumns = false, HeadersVisibility = DataGridHeadersVisibility.Column, SelectionMode = DataGridSelectionMode.Single };
        private readonly RadioButton _modeStops = new RadioButton { Content = "Clic sur la carte = ajouter un arrêt", IsChecked = true, Margin = new Thickness(0, 0, 14, 0) };
        private readonly RadioButton _modePath = new RadioButton { Content = "Clic sur la carte = tracer l'itinéraire" };
        private readonly TextBlock _hint = Ui.Text(string.Empty, 11, false, Ui.Muted);
        private readonly Brush _color;
        private bool _fitted;

        public List<StopRow> Stops { get { return _stops.ToList(); } }
        public List<Point> Path { get { return new List<Point>(_path); } }

        public ItineraryDialog(Window owner, string title, string colorHex, List<StopRow> stops, List<Point> path)
        {
            Owner = owner;
            Title = title;
            Width = 1120; Height = 700;
            WindowStartupLocation = WindowStartupLocation.CenterOwner;
            _color = Ui.Brush(string.IsNullOrEmpty(colorHex) ? "#9F063A" : colorHex);
            _stops = new ObservableCollection<StopRow>(stops);
            _path = new List<Point>(path);

            var root = new Grid { Margin = new Thickness(12) };
            root.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(470) });
            root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(12) });
            root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            var left = new DockPanel();
            var tools = new WrapPanel { Margin = new Thickness(0, 0, 0, 8) };
            tools.Children.Add(Ui.Button("Chercher un lieu…", (s, e) => SearchPlace()));
            tools.Children.Add(Ui.Button("Supprimer l'arrêt", (s, e) => RemoveSelected()));
            tools.Children.Add(Ui.Button("▲", (s, e) => Move(-1)));
            tools.Children.Add(Ui.Button("▼", (s, e) => Move(1)));
            DockPanel.SetDock(tools, Dock.Top);
            left.Children.Add(tools);
            BuildGrid();
            left.Children.Add(_grid);
            Grid.SetRow(left, 0); Grid.SetColumn(left, 0);
            root.Children.Add(left);

            var right = new DockPanel();
            var modes = new WrapPanel { Margin = new Thickness(0, 0, 0, 8) };
            modes.Children.Add(_modeStops);
            modes.Children.Add(_modePath);
            modes.Children.Add(Ui.Button("Annuler le dernier point", (s, e) => { if (_path.Count > 0) _path.RemoveAt(_path.Count - 1); Refresh(); }));
            modes.Children.Add(Ui.Button("Effacer le tracé", (s, e) => { _path.Clear(); Refresh(); }));
            DockPanel.SetDock(modes, Dock.Top);
            right.Children.Add(modes);
            DockPanel.SetDock(_hint, Dock.Bottom);
            _hint.Margin = new Thickness(0, 6, 0, 0);
            right.Children.Add(_hint);
            right.Children.Add(_map);
            Grid.SetRow(right, 0); Grid.SetColumn(right, 2);
            root.Children.Add(right);

            var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 12, 0, 0) };
            buttons.Children.Add(Ui.Button("Valider l'itinéraire", (s, e) => Accept(), true));
            buttons.Children.Add(Ui.Button("Annuler", (s, e) => { DialogResult = false; }));
            Grid.SetRow(buttons, 1); Grid.SetColumnSpan(buttons, 3);
            root.Children.Add(buttons);
            Content = root;

            _map.MapClicked += OnMapClicked;
            _grid.CellEditEnding += (s, e) => Dispatcher.BeginInvoke(new Action(Refresh));
            _modeStops.Checked += (s, e) => UpdateHint();
            _modePath.Checked += (s, e) => UpdateHint();
            UpdateHint();
            Loaded += (s, e) => { Fit(); Refresh(); };
            _map.SizeChanged += (s, e) => { if (!_fitted && _map.ActualWidth > 50) { Fit(); Refresh(); } };
        }

        private void BuildGrid()
        {
            _grid.ItemsSource = _stops;
            _grid.Columns.Add(new DataGridTextColumn { Header = "Ville", Binding = new Binding("City"), Width = 110 });
            _grid.Columns.Add(new DataGridTextColumn { Header = "Arrêt", Binding = new Binding("Label"), Width = 140 });
            _grid.Columns.Add(new DataGridTextColumn { Header = "Latitude", Binding = new Binding("Lat") { ConverterCulture = CultureInfo.InvariantCulture, StringFormat = "0.000000" }, Width = 90 });
            _grid.Columns.Add(new DataGridTextColumn { Header = "Longitude", Binding = new Binding("Lng") { ConverterCulture = CultureInfo.InvariantCulture, StringFormat = "0.000000" }, Width = 90 });
        }

        private void UpdateHint()
        {
            _hint.Text = _modeStops.IsChecked == true
                ? "Chaque clic ajoute un arrêt en bas du tableau. Renommez la ville et l'arrêt dans le tableau. Molette = zoom, glisser = déplacer."
                : "Chaque clic ajoute un point au tracé (trait de la couleur de la ligne). Sans tracé, la carte relie simplement les arrêts.";
        }

        private void Fit()
        {
            if (_map.ActualWidth < 50) return;
            _fitted = true;
            var points = _stops.Select(s => new Point(s.Lat, s.Lng)).Concat(_path).ToList();
            if (points.Count > 0) _map.FitTo(points);
            else _map.SetView(48.62, 2.35, 10);
        }

        private void Refresh()
        {
            _map.Markers.Clear();
            var number = 1;
            foreach (var stop in _stops)
            {
                _map.Markers.Add(new MapMarker { Lat = stop.Lat, Lng = stop.Lng, Label = number + ". " + stop.Label, Color = _color });
                number++;
            }
            _map.Lines.Clear();
            var points = _path.Count >= 2 ? _path : _stops.Select(s => new Point(s.Lat, s.Lng)).ToList();
            if (points.Count >= 2) _map.Lines.Add(new MapLine { LatLng = new List<Point>(points), Color = _color });
            _map.Render();
        }

        private void OnMapClicked(double lat, double lng)
        {
            if (_modePath.IsChecked == true) _path.Add(new Point(Math.Round(lat, 6), Math.Round(lng, 6)));
            else
            {
                _stops.Add(new StopRow { City = string.Empty, Label = "Arrêt " + (_stops.Count + 1), Lat = Math.Round(lat, 6), Lng = Math.Round(lng, 6) });
                _grid.SelectedIndex = _stops.Count - 1;
                _grid.ScrollIntoView(_grid.SelectedItem);
            }
            Refresh();
        }

        private void SearchPlace()
        {
            var dialog = new GeocodeDialog(this);
            if (dialog.ShowDialog() != true) return;
            var parts = dialog.Label.Split(',');
            _stops.Add(new StopRow { City = string.Empty, Label = parts[0].Trim(), Lat = Math.Round(dialog.Lat, 6), Lng = Math.Round(dialog.Lng, 6) });
            _map.SetView(dialog.Lat, dialog.Lng, 15);
            Refresh();
        }

        private void RemoveSelected()
        {
            var stop = _grid.SelectedItem as StopRow;
            if (stop == null) return;
            _stops.Remove(stop);
            Refresh();
        }

        private void Move(int delta)
        {
            var index = _grid.SelectedIndex;
            var target = index + delta;
            if (index < 0 || target < 0 || target >= _stops.Count) return;
            _stops.Move(index, target);
            _grid.SelectedIndex = target;
            Refresh();
        }

        private void Accept()
        {
            _grid.CommitEdit(DataGridEditingUnit.Row, true);
            if (_stops.Any(s => string.IsNullOrWhiteSpace(s.Label))) { Ui.Error("Chaque arrêt doit avoir un nom."); return; }
            DialogResult = true;
        }
    }

    // Courses d'un service : une ligne + un sens (aller, retour, haut-le-pied) + heure de départ facultative.
    public sealed class CoursesDialog : Window
    {
        private readonly ObservableCollection<CourseRow> _courses;
        private readonly DataGrid _grid = new DataGrid { AutoGenerateColumns = false, CanUserAddRows = false, CanUserSortColumns = false, HeadersVisibility = DataGridHeadersVisibility.Column, SelectionMode = DataGridSelectionMode.Single };
        private readonly List<KeyValuePair<string, string>> _lines;

        public List<CourseRow> Courses { get { return _courses.ToList(); } }

        public CoursesDialog(Window owner, List<KeyValuePair<string, string>> lines, List<CourseRow> courses)
        {
            Owner = owner;
            Title = "Courses du service";
            Width = 640; Height = 520;
            WindowStartupLocation = WindowStartupLocation.CenterOwner;
            _lines = lines;
            _courses = new ObservableCollection<CourseRow>(courses);

            var directions = new List<KeyValuePair<string, string>>
            {
                new KeyValuePair<string, string>("ALLER", "Aller (destination 1 → 2)"),
                new KeyValuePair<string, string>("RETOUR", "Retour (destination 2 → 1)"),
                new KeyValuePair<string, string>("HLP", "Haut-le-pied (HLP)"),
            };
            _grid.ItemsSource = _courses;
            _grid.Columns.Add(new DataGridComboBoxColumn { Header = "Ligne", ItemsSource = _lines, SelectedValueBinding = new Binding("LineId"), SelectedValuePath = "Key", DisplayMemberPath = "Value", Width = 200 });
            _grid.Columns.Add(new DataGridComboBoxColumn { Header = "Sens", ItemsSource = directions, SelectedValueBinding = new Binding("Direction"), SelectedValuePath = "Key", DisplayMemberPath = "Value", Width = 190 });
            _grid.Columns.Add(new DataGridTextColumn { Header = "Départ (HH:mm)", Binding = new Binding("DepartureTime"), Width = 110 });

            var root = new DockPanel { Margin = new Thickness(12) };
            var tools = new WrapPanel { Margin = new Thickness(0, 0, 0, 8) };
            tools.Children.Add(Ui.Button("+ Aller", (s, e) => Add("ALLER")));
            tools.Children.Add(Ui.Button("+ Retour", (s, e) => Add("RETOUR")));
            tools.Children.Add(Ui.Button("+ Aller-retour", (s, e) => { Add("ALLER"); Add("RETOUR"); }));
            tools.Children.Add(Ui.Button("+ HLP", (s, e) => Add("HLP")));
            tools.Children.Add(Ui.Button("Supprimer", (s, e) => { var row = _grid.SelectedItem as CourseRow; if (row != null) _courses.Remove(row); }));
            tools.Children.Add(Ui.Button("▲", (s, e) => Move(-1)));
            tools.Children.Add(Ui.Button("▼", (s, e) => Move(1)));
            DockPanel.SetDock(tools, Dock.Top);
            root.Children.Add(tools);
            var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 12, 0, 0) };
            buttons.Children.Add(Ui.Button("Valider", (s, e) => Accept(), true));
            buttons.Children.Add(Ui.Button("Annuler", (s, e) => { DialogResult = false; }));
            DockPanel.SetDock(buttons, Dock.Bottom);
            root.Children.Add(buttons);
            root.Children.Add(_grid);
            Content = root;
        }

        private void Add(string direction)
        {
            var previous = _courses.LastOrDefault(c => !string.IsNullOrEmpty(c.LineId));
            var lineId = previous != null ? previous.LineId : (_lines.Count > 0 ? _lines[0].Key : string.Empty);
            _courses.Add(new CourseRow { LineId = direction == "HLP" ? string.Empty : lineId, Direction = direction, DepartureTime = string.Empty });
        }

        private void Move(int delta)
        {
            var index = _grid.SelectedIndex;
            var target = index + delta;
            if (index < 0 || target < 0 || target >= _courses.Count) return;
            _courses.Move(index, target);
            _grid.SelectedIndex = target;
        }

        private void Accept()
        {
            _grid.CommitEdit(DataGridEditingUnit.Row, true);
            foreach (var course in _courses)
            {
                if (course.Direction != "HLP" && string.IsNullOrEmpty(course.LineId)) { Ui.Error("Choisissez une ligne pour chaque course (sauf HLP)."); return; }
                if (!string.IsNullOrEmpty(course.DepartureTime) && !System.Text.RegularExpressions.Regex.IsMatch(course.DepartureTime.Trim(), @"^\d{2}:\d{2}$")) { Ui.Error("Heure de départ invalide : « " + course.DepartureTime + " » (format HH:mm)."); return; }
            }
            DialogResult = true;
        }
    }
}
