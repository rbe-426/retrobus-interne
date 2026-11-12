using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Data;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using IneoRbe.Desktop.Services;
using Microsoft.Win32;

namespace IneoRbe.Planning
{
    // Configurateur SAEIV : on choisit un véhicule, puis on édite son profil SAEIV (annonces sonores, écrans).
    // La configuration est enregistrée par véhicule, exportable vers l'UC, et publiable sous forme de révision de contenu.
    public sealed class ConfiguratorView : DockPanel
    {
        private static readonly string[][] Places =
        {
            new[] { "FRONT_DESTINATION", "Girouette avant", "78", "4", "18", "1920", "300" },
            new[] { "SIDE_DESTINATION", "Girouette latérale", "52", "4", "14", "1280", "300" },
            new[] { "REAR_DESTINATION", "Girouette arrière", "4", "4", "14", "1280", "300" },
            new[] { "INSIDE_FRONT", "Intérieur avant", "72", "38", "16", "1280", "720" },
            new[] { "INSIDE_MIDDLE", "Intérieur milieu", "42", "38", "16", "1280", "720" },
            new[] { "INSIDE_REAR", "Intérieur arrière", "12", "38", "16", "1280", "720" },
            new[] { "CUSTOM", "Emplacement libre", "40", "64", "16", "1280", "720" },
        };

        private SaeivConfig _config = new SaeivConfig();
        private string _parc;
        private readonly ComboBox _vehicle = new ComboBox { MinWidth = 320, DisplayMemberPath = "Value", SelectedValuePath = "Key" };
        private readonly TextBlock _vehicleInfo = Ui.Text(string.Empty, 11, false, Ui.Muted);
        private readonly TabControl _tabs = new TabControl();
        private readonly DataGrid _lineGrid = new DataGrid { AutoGenerateColumns = false, IsReadOnly = true, CanUserAddRows = false, HeadersVisibility = DataGridHeadersVisibility.Column, SelectionMode = DataGridSelectionMode.Single };
        private readonly TextBlock _lineSummary = Ui.Text(string.Empty, 12, true);
        private UIElement[] _vehicleTabs;
        private readonly ListBox _announcementList = new ListBox { MinWidth = 260 };
        private readonly ListBox _screenList = new ListBox { MinWidth = 260 };
        private readonly TextBlock _status = Ui.Text(string.Empty, 11, false, Ui.Muted);
        private readonly CheckBox _engine = new CheckBox { Content = "Moteur d'annonces actif", Margin = new Thickness(12, 4, 0, 0), VerticalAlignment = VerticalAlignment.Center };
        private bool _loading;
        private readonly NormsView _norms = new NormsView();
        private Dictionary<string, object> _profiles = new Dictionary<string, object>();

        private readonly TextBox _name = new TextBox();
        private readonly ComboBox _trigger = new ComboBox();
        private readonly TextBox _latitude = new TextBox();
        private readonly TextBox _longitude = new TextBox();
        private readonly TextBox _distance = new TextBox();
        private readonly TextBox _speech = new TextBox { MaxLength = 500 };
        private readonly TextBlock _sound = Ui.Text(string.Empty, 12);
        private readonly CheckBox _enabled = new CheckBox { Content = "Annonce activée", Margin = new Thickness(0, 8, 0, 0) };

        private readonly TextBox _screenName = new TextBox();
        private readonly ComboBox _place = new ComboBox { DisplayMemberPath = "Value", SelectedValuePath = "Key", ItemsSource = Places.Select(p => new KeyValuePair<string, string>(p[0], p[1])).ToList() };
        private readonly TextBox _x = new TextBox();
        private readonly TextBox _y = new TextBox();
        private readonly TextBox _widthPct = new TextBox();
        private readonly TextBox _widthPx = new TextBox();
        private readonly TextBox _heightPx = new TextBox();
        private readonly TextBlock _offline = Ui.Text(string.Empty, 12);
        private readonly TextBlock _online = Ui.Text(string.Empty, 12);
        private readonly TextBlock _count = Ui.Text(string.Empty, 11, true);
        private readonly Canvas _plan = new Canvas { Background = Ui.Panel, Height = 160, Width = 400, HorizontalAlignment = HorizontalAlignment.Left };
        private StackPanel _screenForm;
        private StackPanel _announcementForm;

        public ConfiguratorView()
        {
            Margin = new Thickness(14);
            _engine.Click += (s, e) => { _config.EngineEnabled = _engine.IsChecked == true; };
            var bar = Ui.Toolbar(
                Ui.Button("Enregistrer", (s, e) => Save(), true),
                Ui.Button("Exporter vers l'UC…", (s, e) => Export()),
                Ui.Button("Publier la révision actuelle…", (s, e) => Publish()),
                _engine);
            SetDock(bar, Dock.Top);

            var title = Ui.Title("Configurateur SAEIV");
            SetDock(title, Dock.Top);
            Children.Add(title);

            var chooser = new StackPanel { Margin = new Thickness(0, 6, 0, 6) };
            chooser.Children.Add(Ui.Text("Véhicule à configurer", 11, true, Ui.Muted));
            chooser.Children.Add(new StackPanel { Orientation = Orientation.Horizontal, Children = { _vehicle } });
            chooser.Children.Add(_vehicleInfo);
            SetDock(chooser, Dock.Top);
            Children.Add(chooser);
            Children.Add(bar);
            SetDock(_status, Dock.Bottom);
            Children.Add(_status);

            var announcementsTab = BuildAnnouncements();
            var screensTab = BuildScreens();
            _vehicleTabs = new[] { announcementsTab, screensTab };
            foreach (var tab in _vehicleTabs) tab.IsEnabled = false;
            _tabs.Items.Add(new TabItem { Header = "Équipements embarqués : annonces sonores", Content = announcementsTab });
            _tabs.Items.Add(new TabItem { Header = "Profil d'écrans", Content = screensTab });
            _tabs.Items.Add(new TabItem { Header = "Lignes", Content = BuildLines() });
            _tabs.Items.Add(new TabItem { Header = "Normes SAEIV", Content = _norms });
            _tabs.Items.Add(new TabItem { Header = "Messages exceptionnels", Content = new ExceptionalView() });
            Children.Add(_tabs);

            _trigger.Items.Add("Pré-annonce");
            _trigger.Items.Add("Point GPS");
            _trigger.Items.Add("À l'allumage du véhicule");
            bar.IsEnabled = false;
            _vehicle.SelectionChanged += (s, e) => { if (!_loading) SelectVehicle(_vehicle.SelectedValue as string); };
            Loaded += (s, e) => { if (_vehicle.Items.Count == 0) LoadVehicles(bar); RefreshLineChanges(); };
        }

        private const string PilotParc = "PILOTE";

        private static object SafePilot()
        {
            try { return Json.Get(Api.Get("/ineo/pilot"), "pilot"); }
            catch (Exception) { return null; }
        }

        private void LoadVehicles(UIElement bar)
        {
            _status.Text = "Chargement des véhicules…";
            Ui.Run(Dispatcher, () => new object[] { Data.Vehicles(), Data.List("/ineo/vehicle-profiles", "profiles"), SafePilot() }, data =>
            {
                _profiles = new Dictionary<string, object>();
                foreach (var profile in (List<object>)data[1]) _profiles[Json.Str(profile, "vehicleParc")] = profile;
                var options = Data.Options((List<object>)data[0], v => Json.Str(v, "parc"), Data.VehicleLabel);
                // Le véhicule pilote n'existe que dans les outils Inéo : il est ajouté ici, jamais dans la liste des véhicules du parc.
                var pilot = data[2];
                _profiles[PilotParc] = pilot ?? new Dictionary<string, object>();
                var pilotName = pilot == null ? string.Empty : Json.Str(pilot, "name");
                options.Insert(0, new KeyValuePair<string, string>(PilotParc, PilotParc + " — " + (pilotName.Length == 0 ? "Véhicule pilote" : pilotName)));
                _vehicle.ItemsSource = options;
                bar.IsEnabled = true;
                _status.Text = "Choisissez un véhicule pour éditer son profil SAEIV.";
            }, error => _status.Text = "Erreur : " + error);
        }

        private void SelectVehicle(string parc)
        {
            if (string.IsNullOrEmpty(parc)) return;
            if (_parc != null) SaeivStore.Save(_config, _parc);
            _parc = parc;
            _config = SaeivStore.Load(parc);
            _engine.IsChecked = _config.EngineEnabled;
            _norms.SetVehicle(_config);
            foreach (var tab in _vehicleTabs) tab.IsEnabled = true;
            object profile;
            if (parc == PilotParc)
            {
                var pilotSerial = _profiles.ContainsKey(PilotParc) ? Json.Str(_profiles[PilotParc], "ucSerial") : string.Empty;
                _vehicleInfo.Text = "Véhicule pilote (PC de test, absent du parc et des autres écrans) — UC associé : " + (pilotSerial.Length == 0 ? "aucun (à renseigner dans « Véhicule pilote »)" : pilotSerial);
            }
            else if (_profiles.TryGetValue(parc, out profile))
            {
                var serial = Json.Str(profile, "ucSerial");
                _vehicleInfo.Text = "UC associé : " + (serial.Length == 0 ? "aucun (à renseigner dans « Profils véhicules »)" : serial);
            }
            else _vehicleInfo.Text = "Aucun profil véhicule : créez-le dans « Profils véhicules » pour associer un UC.";
            RefreshAnnouncements(-1);
            RefreshScreens(-1);
            _status.Text = "Profil SAEIV du véhicule " + parc + " chargé.";
        }

        private static StackPanel Field(string label, UIElement control)
        {
            var panel = new StackPanel { Margin = new Thickness(0, 0, 0, 8) };
            panel.Children.Add(Ui.Text(label, 11, true, Ui.Muted));
            panel.Children.Add(control);
            return panel;
        }

        private UIElement BuildAnnouncements()
        {
            var grid = new Grid { Margin = new Thickness(0, 10, 0, 0) };
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            grid.ColumnDefinitions.Add(new ColumnDefinition());

            var left = new DockPanel { Margin = new Thickness(0, 0, 12, 0) };
            var buttons = Ui.Toolbar(Ui.Button("Ajouter", (s, e) => AddAnnouncement()), Ui.Button("Supprimer", (s, e) => RemoveAnnouncement()));
            DockPanel.SetDock(buttons, Dock.Bottom);
            left.Children.Add(buttons);
            left.Children.Add(_announcementList);
            grid.Children.Add(left);

            _announcementForm = new StackPanel { Width = 420, HorizontalAlignment = HorizontalAlignment.Left };
            _announcementForm.Children.Add(Field("Nom", _name));
            _announcementForm.Children.Add(Field("Condition de déclenchement", _trigger));
            _announcementForm.Children.Add(Field("Latitude", _latitude));
            _announcementForm.Children.Add(Field("Longitude", _longitude));
            _announcementForm.Children.Add(Field("Distance de déclenchement (m)", _distance));
            var soundRow = new StackPanel { Orientation = Orientation.Horizontal };
            soundRow.Children.Add(Ui.Button("Choisir un son…", (s, e) => ChooseSound()));
            soundRow.Children.Add(_sound);
            _announcementForm.Children.Add(Field("Fichier son (wav, mp3, wma)", soundRow));
            _announcementForm.Children.Add(Field("Texte lu par la voix embarquée (si aucun fichier son)", _speech));
            _announcementForm.Children.Add(_enabled);
            Grid.SetColumn(_announcementForm, 1);
            grid.Children.Add(_announcementForm);

            _announcementList.SelectionChanged += (s, e) => LoadAnnouncement();
            _name.TextChanged += (s, e) => ApplyAnnouncement();
            _trigger.SelectionChanged += (s, e) => ApplyAnnouncement();
            _latitude.TextChanged += (s, e) => ApplyAnnouncement();
            _longitude.TextChanged += (s, e) => ApplyAnnouncement();
            _distance.TextChanged += (s, e) => ApplyAnnouncement();
            _speech.TextChanged += (s, e) => ApplyAnnouncement();
            _enabled.Click += (s, e) => ApplyAnnouncement();
            return grid;
        }

        private UIElement BuildLines()
        {
            var panel = new DockPanel { Margin = new Thickness(0, 10, 0, 0) };
            var note = Ui.Text("Les lignes se modifient dans « Lignes et itinéraires ». Cette liste compare les lignes actuelles à la dernière révision publiée pour tous les véhicules : les lignes nouvelles, modifiées ou supprimées sont mises en évidence et partent avec « Publier la révision actuelle… ».", 11, false, Ui.Muted);
            note.TextWrapping = TextWrapping.Wrap;
            DockPanel.SetDock(note, Dock.Top);
            panel.Children.Add(note);
            var toolbar = Ui.Toolbar(Ui.Button("Actualiser", (s, e) => RefreshLineChanges()), _lineSummary);
            DockPanel.SetDock(toolbar, Dock.Top);
            panel.Children.Add(toolbar);
            _lineGrid.Columns.Add(new DataGridTextColumn { Header = "Ligne", Binding = new Binding("Name"), Width = 110 });
            _lineGrid.Columns.Add(new DataGridTextColumn { Header = "Destinations", Binding = new Binding("Destinations"), Width = 260 });
            _lineGrid.Columns.Add(new DataGridTextColumn { Header = "État", Binding = new Binding("Status"), Width = 100 });
            _lineGrid.Columns.Add(new DataGridTextColumn { Header = "Modifications depuis la dernière révision", Binding = new Binding("Detail"), Width = new DataGridLength(1, DataGridLengthUnitType.Star) });
            _lineGrid.LoadingRow += (s, e) =>
            {
                var change = e.Row.Item as LineChange;
                if (change != null) e.Row.Background = change.Highlight;
            };
            panel.Children.Add(_lineGrid);
            return panel;
        }

        public sealed class LineChange
        {
            public string Name { get; set; }
            public string Destinations { get; set; }
            public string Status { get; set; }
            public string Detail { get; set; }
            public Brush Highlight { get; set; }
        }

        private static Brush Tint(string argb) { return new SolidColorBrush((Color)ColorConverter.ConvertFromString(argb)); }

        private static string StopsSignature(object line, string key)
        {
            return string.Join(";", LineData.ReadStops(line, key).Select(s => s.City + "|" + s.Label + "|" + Num(Math.Round(s.Lat, 6)) + "|" + Num(Math.Round(s.Lng, 6))).ToArray());
        }

        private static string PathSignature(object line, string key)
        {
            return string.Join(";", LineData.ReadPath(line, key).Select(p => Num(Math.Round(p.X, 6)) + "," + Num(Math.Round(p.Y, 6))).ToArray());
        }

        // Liste des éléments qui diffèrent entre la ligne actuelle et sa version publiée.
        private static List<string> LineDifferences(object current, object published)
        {
            var parts = new List<string>();
            if (Json.Str(current, "name") != Json.Str(published, "name")) parts.Add("nom");
            if (Json.Str(current, "destination1") != Json.Str(published, "destination1") || Json.Str(current, "destination2") != Json.Str(published, "destination2")) parts.Add("destinations");
            if (!string.Equals(Json.Str(current, "color"), Json.Str(published, "color"), StringComparison.OrdinalIgnoreCase)) parts.Add("couleur");
            if (StopsSignature(current, "outboundStops") != StopsSignature(published, "outboundStops")) parts.Add("arrêts aller");
            if (PathSignature(current, "outboundPath") != PathSignature(published, "outboundPath")) parts.Add("tracé aller");
            if (StopsSignature(current, "returnStops") != StopsSignature(published, "returnStops")) parts.Add("arrêts retour");
            if (PathSignature(current, "returnPath") != PathSignature(published, "returnPath")) parts.Add("tracé retour");
            return parts;
        }

        private void RefreshLineChanges()
        {
            _lineSummary.Text = "Comparaison avec la dernière révision…";
            Api.Refresh();
            Ui.Run(Dispatcher, () => new object[] { Data.List("/ineo/lines", "lines"), Api.Get("/ineo/content-revisions/latest-lines") }, data =>
            {
                var current = (List<object>)data[0];
                var latest = data[1];
                var published = Json.List(latest, "lines");
                var rows = new List<LineChange>();
                foreach (var line in current)
                {
                    var match = published.FirstOrDefault(p => Json.Str(p, "id") == Json.Str(line, "id"));
                    var change = new LineChange { Name = Json.Str(line, "name"), Destinations = Json.Str(line, "destination1") + " ⇄ " + Json.Str(line, "destination2") };
                    if (match == null) { change.Status = "Nouvelle"; change.Detail = "Jamais publiée"; change.Highlight = Tint("#4016A34A"); }
                    else
                    {
                        var diff = LineDifferences(line, match);
                        if (diff.Count == 0) { change.Status = "Inchangée"; change.Detail = string.Empty; change.Highlight = Brushes.Transparent; }
                        else { change.Status = "Modifiée"; change.Detail = string.Join(", ", diff.ToArray()); change.Highlight = Tint("#40EA580C"); }
                    }
                    rows.Add(change);
                }
                foreach (var old in published)
                {
                    if (current.Any(line => Json.Str(line, "id") == Json.Str(old, "id"))) continue;
                    rows.Add(new LineChange { Name = Json.Str(old, "name"), Destinations = Json.Str(old, "destination1") + " ⇄ " + Json.Str(old, "destination2"), Status = "Supprimée", Detail = "Retirée à la prochaine révision", Highlight = Tint("#40DC2626") });
                }
                _lineGrid.ItemsSource = rows.OrderBy(r => r.Status == "Inchangée" ? 1 : 0).ThenBy(r => r.Name).ToList();
                var pending = rows.Count(r => r.Status != "Inchangée");
                var revision = Json.Str(latest, "revision");
                _lineSummary.Text = (pending == 0 ? "Lignes à jour" : pending + " ligne(s) à publier") + (revision.Length == 0 ? " (aucune révision publiée)." : " (révision " + revision + ").");
                _lineSummary.Foreground = pending == 0 ? Ui.Muted : Tint("#EA580C");
            }, error => _lineSummary.Text = "Erreur : " + error);
        }

        private UIElement BuildScreens()
        {
            var grid = new Grid { Margin = new Thickness(0, 10, 0, 0) };
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            grid.ColumnDefinitions.Add(new ColumnDefinition());

            var left = new DockPanel { Margin = new Thickness(0, 0, 12, 0) };
            var buttons = Ui.Toolbar(Ui.Button("Ajouter", (s, e) => AddScreen()), Ui.Button("Supprimer", (s, e) => RemoveScreen()));
            DockPanel.SetDock(buttons, Dock.Bottom);
            DockPanel.SetDock(_count, Dock.Top);
            left.Children.Add(_count);
            left.Children.Add(buttons);
            left.Children.Add(_screenList);
            grid.Children.Add(left);

            _screenForm = new StackPanel { Width = 440, HorizontalAlignment = HorizontalAlignment.Left };
            _screenForm.Children.Add(Field("Nom de l'écran", _screenName));
            _screenForm.Children.Add(Field("Emplacement dans le véhicule", _place));
            var position = new UniformGrid { Columns = 2 };
            position.Children.Add(Field("Position horizontale (% du plan)", _x));
            position.Children.Add(Field("Position verticale (% du plan)", _y));
            position.Children.Add(Field("Largeur à l'affichage (% du plan)", _widthPct));
            position.Children.Add(new StackPanel());
            position.Children.Add(Field("Largeur de l'écran (px)", _widthPx));
            position.Children.Add(Field("Hauteur de l'écran (px)", _heightPx));
            _screenForm.Children.Add(position);
            var offlineRow = new StackPanel { Orientation = Orientation.Horizontal };
            offlineRow.Children.Add(Ui.Button("Choisir une image…", (s, e) => ChooseImage(false)));
            offlineRow.Children.Add(_offline);
            _screenForm.Children.Add(Field("Affichage hors ligne", offlineRow));
            var onlineRow = new StackPanel { Orientation = Orientation.Horizontal };
            onlineRow.Children.Add(Ui.Button("Choisir une image…", (s, e) => ChooseImage(true)));
            onlineRow.Children.Add(_online);
            _screenForm.Children.Add(Field("Affichage en ligne", onlineRow));
            _screenForm.Children.Add(Ui.Button("Simuler l'affichage…", (s, e) => Simulate(), true));
            _screenForm.Children.Add(Ui.Text("Plan du véhicule", 11, true, Ui.Muted));
            _screenForm.Children.Add(_plan);
            Grid.SetColumn(_screenForm, 1);
            grid.Children.Add(new ScrollViewer { Content = _screenForm, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, HorizontalAlignment = HorizontalAlignment.Left });
            Grid.SetColumn((UIElement)grid.Children[grid.Children.Count - 1], 1);

            _screenList.SelectionChanged += (s, e) => LoadScreen();
            _screenName.TextChanged += (s, e) => ApplyScreen();
            _place.SelectionChanged += (s, e) => ApplyPlace();
            foreach (var box in new[] { _x, _y, _widthPct, _widthPx, _heightPx }) box.TextChanged += (s, e) => ApplyScreen();
            return grid;
        }

        private Announcement CurrentAnnouncement { get { var i = _announcementList.SelectedIndex; return i >= 0 && i < _config.Announcements.Count ? _config.Announcements[i] : null; } }
        private ScreenConfig CurrentScreen { get { var i = _screenList.SelectedIndex; return i >= 0 && i < _config.Screens.Count ? _config.Screens[i] : null; } }

        private void RefreshAnnouncements(int select)
        {
            _loading = true;
            _announcementList.Items.Clear();
            foreach (var item in _config.Announcements) _announcementList.Items.Add(item.DisplayText);
            _loading = false;
            _announcementList.SelectedIndex = select;
            LoadAnnouncement();
        }

        private void RefreshScreens(int select)
        {
            _loading = true;
            _screenList.Items.Clear();
            foreach (var item in _config.Screens) _screenList.Items.Add(item.DisplayText);
            _loading = false;
            _screenList.SelectedIndex = select;
            LoadScreen();
        }

        private static string Num(double value) { return value.ToString("0.######", CultureInfo.InvariantCulture); }

        private void LoadAnnouncement()
        {
            if (_loading) return;
            var item = CurrentAnnouncement;
            _loading = true;
            _announcementForm.IsEnabled = item != null;
            _name.Text = item == null ? string.Empty : item.Name;
            _trigger.SelectedIndex = item == null ? 0 : item.Trigger == AnnouncementTrigger.Gps ? 1 : item.Trigger == AnnouncementTrigger.Startup ? 2 : 0;
            _latitude.Text = item == null ? string.Empty : Num(item.Latitude);
            _longitude.Text = item == null ? string.Empty : Num(item.Longitude);
            _distance.Text = item == null ? string.Empty : item.DistanceMeters.ToString(CultureInfo.InvariantCulture);
            _sound.Text = item == null || string.IsNullOrEmpty(item.SoundName) ? "  (aucun son)" : "  " + item.SoundName;
            _enabled.IsChecked = item != null && item.Enabled;
            _speech.Text = item == null ? string.Empty : item.Text ?? string.Empty;
            UpdateTriggerFields();
            _loading = false;
        }

        // Une annonce à l'allumage ne dépend d'aucune position GPS.
        private void UpdateTriggerFields()
        {
            var positional = _trigger.SelectedIndex != 2;
            _latitude.IsEnabled = _longitude.IsEnabled = _distance.IsEnabled = positional;
        }

        private static double ParseDouble(string text)
        {
            double value;
            double.TryParse((text ?? string.Empty).Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out value);
            return value;
        }

        private void ApplyAnnouncement()
        {
            if (_loading) return;
            var item = CurrentAnnouncement;
            if (item == null) return;
            item.Name = _name.Text;
            item.Trigger = _trigger.SelectedIndex == 1 ? AnnouncementTrigger.Gps : _trigger.SelectedIndex == 2 ? AnnouncementTrigger.Startup : AnnouncementTrigger.PreAnnouncement;
            item.Latitude = ParseDouble(_latitude.Text);
            item.Longitude = ParseDouble(_longitude.Text);
            item.DistanceMeters = (int)ParseDouble(_distance.Text);
            item.Enabled = _enabled.IsChecked == true;
            item.Text = _speech.Text;
            var index = _announcementList.SelectedIndex;
            _loading = true;
            _announcementList.Items[index] = item.DisplayText;
            _announcementList.SelectedIndex = index;
            UpdateTriggerFields();
            _loading = false;
        }

        private void AddAnnouncement()
        {
            _config.Announcements.Add(new Announcement { Name = "Nouvelle annonce" });
            RefreshAnnouncements(_config.Announcements.Count - 1);
        }

        private void RemoveAnnouncement()
        {
            var item = CurrentAnnouncement;
            if (item == null || !Ui.Confirm("Supprimer l'annonce « " + item.Name + " » ?")) return;
            SaeivStore.DeleteStored(SaeivStore.SoundsFolder, item.SoundFile);
            _config.Announcements.Remove(item);
            RefreshAnnouncements(-1);
        }

        private void ChooseSound()
        {
            var item = CurrentAnnouncement;
            if (item == null) return;
            var dialog = new OpenFileDialog { Filter = "Sons (*.wav;*.mp3;*.wma)|*.wav;*.mp3;*.wma" };
            if (dialog.ShowDialog() != true) return;
            try
            {
                var stored = SaeivStore.Import(dialog.FileName, SaeivStore.SoundsFolder, SaeivStore.SoundExtensions, SaeivStore.MaxSoundBytes);
                SaeivStore.DeleteStored(SaeivStore.SoundsFolder, item.SoundFile);
                item.SoundFile = stored;
                item.SoundName = Path.GetFileName(dialog.FileName);
                LoadAnnouncement();
            }
            catch (Exception exception) { Ui.Error(exception.Message); }
        }

        private void LoadScreen()
        {
            if (_loading) return;
            var item = CurrentScreen;
            _loading = true;
            _screenForm.IsEnabled = item != null;
            _screenName.Text = item == null ? string.Empty : item.Name;
            _place.SelectedValue = item == null ? null : item.Place;
            _x.Text = item == null ? string.Empty : Num(item.X);
            _y.Text = item == null ? string.Empty : Num(item.Y);
            _widthPct.Text = item == null ? string.Empty : Num(item.WidthPct);
            _widthPx.Text = item == null ? string.Empty : item.WidthPx.ToString(CultureInfo.InvariantCulture);
            _heightPx.Text = item == null ? string.Empty : item.HeightPx.ToString(CultureInfo.InvariantCulture);
            _offline.Text = item == null || string.IsNullOrEmpty(item.OfflineName) ? "  (aucune image)" : "  " + item.OfflineName;
            _online.Text = item == null || string.IsNullOrEmpty(item.OnlineName) ? "  (aucune image)" : "  " + item.OnlineName;
            _loading = false;
            DrawPlan();
        }

        private void ApplyPlace()
        {
            if (_loading) return;
            var item = CurrentScreen;
            var key = _place.SelectedValue as string;
            if (item == null || key == null) return;
            var preset = Places.First(p => p[0] == key);
            _loading = true;
            _x.Text = preset[2]; _y.Text = preset[3]; _widthPct.Text = preset[4]; _widthPx.Text = preset[5]; _heightPx.Text = preset[6];
            _loading = false;
            ApplyScreen();
        }

        private void ApplyScreen()
        {
            if (_loading) return;
            var item = CurrentScreen;
            if (item == null) return;
            item.Name = _screenName.Text;
            item.Place = _place.SelectedValue as string ?? "CUSTOM";
            item.X = Math.Max(0, Math.Min(100, ParseDouble(_x.Text)));
            item.Y = Math.Max(0, Math.Min(100, ParseDouble(_y.Text)));
            item.WidthPct = Math.Max(1, Math.Min(100, ParseDouble(_widthPct.Text)));
            item.WidthPx = Math.Max(16, (int)ParseDouble(_widthPx.Text));
            item.HeightPx = Math.Max(16, (int)ParseDouble(_heightPx.Text));
            var index = _screenList.SelectedIndex;
            _loading = true;
            _screenList.Items[index] = item.DisplayText;
            _screenList.SelectedIndex = index;
            _loading = false;
            DrawPlan();
        }

        private void DrawPlan()
        {
            _count.Text = "Nombre d'écrans : " + _config.Screens.Count;
            _plan.Children.Clear();
            var selected = CurrentScreen;
            var number = 0;
            foreach (var screen in _config.Screens)
            {
                number++;
                var width = Math.Max(10, _plan.Width * screen.WidthPct / 100);
                var height = Math.Max(6, width * screen.HeightPx / Math.Max(1, screen.WidthPx));
                var rect = new Border
                {
                    Width = width, Height = height,
                    Background = screen == selected ? Ui.Brush("#FBD5E3") : Ui.Brush("#E2E8F0"),
                    BorderBrush = screen == selected ? Ui.Red : Ui.Muted,
                    BorderThickness = new Thickness(screen == selected ? 2 : 1),
                    Child = new TextBlock { Text = number.ToString(CultureInfo.InvariantCulture), FontSize = 10, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center },
                };
                Canvas.SetLeft(rect, Math.Min(_plan.Width - width, _plan.Width * screen.X / 100));
                Canvas.SetTop(rect, Math.Min(_plan.Height - height, _plan.Height * screen.Y / 100));
                _plan.Children.Add(rect);
            }
        }

        private void AddScreen()
        {
            _config.Screens.Add(new ScreenConfig { Name = "Nouvel écran" });
            RefreshScreens(_config.Screens.Count - 1);
        }

        private void RemoveScreen()
        {
            var item = CurrentScreen;
            if (item == null || !Ui.Confirm("Supprimer l'écran « " + item.Name + " » ?")) return;
            SaeivStore.DeleteStored(SaeivStore.ScreensFolder, item.OfflineImage);
            SaeivStore.DeleteStored(SaeivStore.ScreensFolder, item.OnlineImage);
            _config.Screens.Remove(item);
            RefreshScreens(-1);
        }

        private void ChooseImage(bool online)
        {
            var item = CurrentScreen;
            if (item == null) return;
            var dialog = new OpenFileDialog { Filter = "Images (*.png;*.jpg;*.jpeg;*.bmp;*.gif)|*.png;*.jpg;*.jpeg;*.bmp;*.gif" };
            if (dialog.ShowDialog() != true) return;
            try
            {
                var stored = SaeivStore.Import(dialog.FileName, SaeivStore.ScreensFolder, SaeivStore.ImageExtensions, SaeivStore.MaxImageBytes);
                if (online) { SaeivStore.DeleteStored(SaeivStore.ScreensFolder, item.OnlineImage); item.OnlineImage = stored; item.OnlineName = Path.GetFileName(dialog.FileName); }
                else { SaeivStore.DeleteStored(SaeivStore.ScreensFolder, item.OfflineImage); item.OfflineImage = stored; item.OfflineName = Path.GetFileName(dialog.FileName); }
                LoadScreen();
            }
            catch (Exception exception) { Ui.Error(exception.Message); }
        }

        private void Simulate()
        {
            var item = CurrentScreen;
            if (item == null) return;
            new ScreenSimulationWindow(Window.GetWindow(this), item).Show();
        }

        private bool Save()
        {
            if (_parc == null) { Ui.Error("Choisissez d'abord un véhicule."); return false; }
            try
            {
                SaeivStore.Save(_config, _parc);
                _norms.Commit();
                _status.Text = "Profil SAEIV du véhicule " + _parc + " enregistré.";
                return true;
            }
            catch (Exception exception) { Ui.Error("Enregistrement impossible : " + exception.Message); return false; }
        }

        private void Export()
        {
            if (!Save()) return;
            var dialog = new SaveFileDialog { FileName = "saeiv-config.json", Title = "Choisir le dossier de destination (clé USB)", Filter = "Configuration SAEIV|saeiv-config.json" };
            if (dialog.ShowDialog() != true) return;
            try
            {
                var target = Path.GetDirectoryName(dialog.FileName);
                File.Copy(SaeivStore.ProfilePath(_parc), Path.Combine(target, "saeiv-config.json"), true);
                foreach (var folder in new[] { SaeivStore.SoundsFolder, SaeivStore.ScreensFolder })
                {
                    var source = Path.Combine(SaeivStore.RootDirectory, folder);
                    if (!Directory.Exists(source)) continue;
                    var destination = Path.Combine(target, folder);
                    Directory.CreateDirectory(destination);
                    foreach (var file in Directory.GetFiles(source)) File.Copy(file, Path.Combine(destination, Path.GetFileName(file)), true);
                }
                _status.Text = "Exporté vers " + target + " : copiez ce contenu dans C:\\ProgramData\\IneoRbe de l'UC.";
            }
            catch (Exception exception) { Ui.Error("Export impossible : " + exception.Message); }
        }

        // Publie une nouvelle révision de contenu (annonces et écrans du véhicule choisi, avec leurs sons et images),
        // pour tous les véhicules ou uniquement pour l'UC du véhicule choisi.
        private void Publish()
        {
            if (!Save()) return;
            var dialog = new PublishRevisionWindow(Window.GetWindow(this), _parc);
            if (dialog.ShowDialog() != true) return;
            var body = new Dictionary<string, object> { { "notes", dialog.Notes } };
            if (!dialog.AllVehicles) body["targetParc"] = _parc;

            var files = new List<string>();
            var announcements = new List<object>();
            foreach (var item in _config.Announcements)
            {
                announcements.Add(new Dictionary<string, object>
                {
                    { "id", item.Id }, { "name", item.Name }, { "trigger", item.Trigger }, { "latitude", item.Latitude }, { "longitude", item.Longitude },
                    { "distanceMeters", item.DistanceMeters }, { "soundFile", item.SoundFile }, { "soundName", item.SoundName }, { "text", item.Text }, { "enabled", item.Enabled },
                });
                if (!string.IsNullOrEmpty(item.SoundFile)) files.Add(item.SoundFile);
            }
            var screens = new List<object>();
            foreach (var item in _config.Screens)
            {
                screens.Add(new Dictionary<string, object>
                {
                    { "id", item.Id }, { "name", item.Name }, { "place", item.Place }, { "x", item.X }, { "y", item.Y }, { "widthPct", item.WidthPct },
                    { "widthPx", item.WidthPx }, { "heightPx", item.HeightPx }, { "offlineImage", item.OfflineImage }, { "offlineName", item.OfflineName },
                    { "onlineImage", item.OnlineImage }, { "onlineName", item.OnlineName },
                });
                if (!string.IsNullOrEmpty(item.OfflineImage)) files.Add(item.OfflineImage);
                if (!string.IsNullOrEmpty(item.OnlineImage)) files.Add(item.OnlineImage);
            }
            body["config"] = new Dictionary<string, object> { { "announcements", announcements }, { "screens", screens }, { "norms", NormsView.ToJson(_norms.Effective(_config)) }, { "exceptional", ExceptionalView.ToJson() } };
            var effective = _norms.Effective(_config);
            if (!string.IsNullOrEmpty(effective.Screens.BaseImage)) files.Add(effective.Screens.BaseImage);
            var names = files.Distinct().Select(name => (object)name).ToList();
            var summary = announcements.Count + " annonce(s), " + screens.Count + " écran(s)";

            _status.Text = "Envoi du contenu (" + summary + ") et publication…";
            Ui.Run(Dispatcher, () =>
            {
                Api.Refresh();
                var lines = new List<object>();
                foreach (var line in Data.List("/ineo/lines", "lines"))
                {
                    lines.Add(new Dictionary<string, object>
                    {
                        { "id", Json.Str(line, "id") }, { "name", Json.Str(line, "name") }, { "color", Json.Str(line, "color") },
                        { "destination1", Json.Str(line, "destination1") }, { "destination2", Json.Str(line, "destination2") },
                        { "outboundStops", Json.Get(line, "outboundStops") }, { "outboundPath", Json.Get(line, "outboundPath") },
                        { "returnStops", Json.Get(line, "returnStops") }, { "returnPath", Json.Get(line, "returnPath") },
                    });
                }
                ((Dictionary<string, object>)body["config"])["lines"] = lines;
                var missing = names.Count == 0 ? new List<object>() : Json.List(Api.Post("/ineo/content-files/missing", new Dictionary<string, object> { { "names", names } }), "missing");
                foreach (var entry in missing)
                {
                    var name = Convert.ToString(entry);
                    var folder = Array.IndexOf(SaeivStore.ImageExtensions, Path.GetExtension(name).ToLowerInvariant()) >= 0 ? SaeivStore.ScreensFolder : SaeivStore.SoundsFolder;
                    var path = SaeivStore.ResolvePath(folder, name);
                    if (path == null || !File.Exists(path)) throw new InvalidOperationException("Fichier introuvable sur ce PC : « " + name + " ». Réimportez le son ou l'image concerné.");
                    var bytes = File.ReadAllBytes(path);
                    if (bytes.Length > 25 * 1024 * 1024) throw new InvalidOperationException("Le fichier « " + name + " » dépasse 25 Mo : utilisez un fichier plus léger.");
                    Api.Put("/ineo/content-files/" + name, new Dictionary<string, object> { { "dataBase64", Convert.ToBase64String(bytes) } });
                }
                return Api.Post("/ineo/content-revisions", body);
            }, result =>
            {
                var revision = Json.Str(result, "revision.revision");
                _status.Text = "Révision " + revision + " publiée (" + summary + " et lignes) " + (dialog.AllVehicles ? "pour tous les véhicules." : "pour le véhicule " + _parc + " (UC associé).");
                RefreshLineChanges();
            }, error => { _status.Text = "Publication impossible : " + error; Ui.Error(error); });
        }
    }

    // Choix de la portée d'une révision : tous les véhicules ou seulement le profil du véhicule sélectionné.
    public sealed class PublishRevisionWindow : Window
    {
        private readonly RadioButton _all = new RadioButton { Content = "Tous les véhicules", Margin = new Thickness(0, 6, 0, 0) };
        private readonly RadioButton _one = new RadioButton { IsChecked = true, Margin = new Thickness(0, 6, 0, 0) };
        private readonly TextBox _notes = new TextBox { MaxLength = 500, Margin = new Thickness(0, 4, 0, 12) };

        public bool AllVehicles { get { return _all.IsChecked == true; } }
        public string Notes { get { return _notes.Text.Trim(); } }

        public PublishRevisionWindow(Window owner, string parc)
        {
            Owner = owner;
            Title = "Publier la révision actuelle";
            Width = 460; SizeToContent = SizeToContent.Height;
            WindowStartupLocation = WindowStartupLocation.CenterOwner;
            ResizeMode = ResizeMode.NoResize;
            _one.Content = "Seulement le profil du véhicule " + parc + " (assignée à son UC associé)";
            var panel = new StackPanel { Margin = new Thickness(16) };
            panel.Children.Add(Ui.Text("À quels véhicules s'applique cette révision ?", 13, true));
            panel.Children.Add(_all);
            panel.Children.Add(_one);
            panel.Children.Add(Ui.Text("Notes (facultatif)", 11, true, Ui.Muted));
            panel.Children.Add(_notes);
            panel.Children.Add(new StackPanel
            {
                Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right,
                Children = { Ui.Button("Publier", (s, e) => { DialogResult = true; }, true), Ui.Button("Annuler", (s, e) => { DialogResult = false; }) },
            });
            Content = panel;
        }
    }

    // Fenêtre de simulation : affiche l'écran à sa résolution réelle (réduite pour tenir dans l'écran du PC), en ligne ou hors ligne.
    public sealed class ScreenSimulationWindow : Window
    {
        private readonly ScreenConfig _screen;
        private readonly Border _surface = new Border { Background = Brushes.Black, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
        private readonly Image _image = new Image { Stretch = Stretch.Fill };
        private readonly TextBlock _caption = new TextBlock { Foreground = Brushes.White, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center, TextAlignment = TextAlignment.Center };
        private readonly TextBlock _info = Ui.Text(string.Empty, 11, false, Ui.Muted);

        public ScreenSimulationWindow(Window owner, ScreenConfig screen)
        {
            _screen = screen;
            Owner = owner;
            Title = "Simulation : " + screen.Name;
            WindowStartupLocation = WindowStartupLocation.CenterOwner;
            ShowInTaskbar = false;

            var area = SystemParameters.WorkArea;
            var scale = Math.Min(1.0, Math.Min((area.Width - 80) / screen.WidthPx, (area.Height - 160) / screen.HeightPx));
            var width = Math.Max(40, Math.Floor(screen.WidthPx * scale));
            var height = Math.Max(24, Math.Floor(screen.HeightPx * scale));
            _surface.Width = width; _surface.Height = height;
            var layer = new Grid();
            layer.Children.Add(_image);
            layer.Children.Add(_caption);
            _surface.Child = layer;
            _info.Text = screen.WidthPx + " × " + screen.HeightPx + " px — affiché à " + Math.Round(scale * 100) + " %";

            var online = Ui.Button("En ligne", (s, e) => Show(true), true);
            var offline = Ui.Button("Hors ligne", (s, e) => Show(false));
            var bar = Ui.Toolbar(online, offline, _info);
            DockPanel.SetDock(bar, Dock.Top);
            var root = new DockPanel { Margin = new Thickness(10) };
            root.Children.Add(bar);
            root.Children.Add(_surface);
            Content = root;
            SizeToContent = SizeToContent.WidthAndHeight;
            MinWidth = 380;
            Show(true);
        }

        private void Show(bool online)
        {
            var stored = online ? _screen.OnlineImage : _screen.OfflineImage;
            var path = SaeivStore.ResolvePath(SaeivStore.ScreensFolder, stored);
            _image.Source = null;
            if (path != null && File.Exists(path))
            {
                try
                {
                    var bitmap = new BitmapImage();
                    bitmap.BeginInit();
                    bitmap.CacheOption = BitmapCacheOption.OnLoad;
                    bitmap.UriSource = new Uri(path);
                    bitmap.EndInit();
                    _image.Source = bitmap;
                    _caption.Text = string.Empty;
                    return;
                }
                catch (Exception) { }
            }
            _caption.Text = (online ? "Affichage en ligne" : "Affichage hors ligne") + "\n(aucune image définie)";
        }
    }
}
