using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;
using Microsoft.Win32;

namespace IneoRbe.Planning
{
    public static class Views2
    {
        // ----- Suivi en temps réel -----

        public static UIElement Live()
        {
            var root = new Grid { Margin = new Thickness(14) };
            root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(260) });
            root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(14) });
            root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            var list = new ListBox();
            var map = new MapControl();
            Grid.SetColumn(map, 2);
            root.Children.Add(list);
            root.Children.Add(map);
            var timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(10) };
            var fitted = false;
            var busy = false;

            Action refresh = null;
            refresh = () =>
            {
                if (busy) return;
                busy = true;
                Ui.Run(root.Dispatcher, () => new[] { Data.List("/ineo/vehicle-trackers", "trackers"), Data.List("/ineo/free-tracking-sessions", "sessions") }, data =>
                {
                    busy = false;
                    map.Markers.Clear();
                    var lines = new List<string>();
                    var points = new List<Point>();
                    foreach (var tracker in data[0])
                    {
                        var lat = Json.Num(tracker, "lastLatitude");
                        var lng = Json.Num(tracker, "lastLongitude");
                        var name = Json.Str(tracker, "vehicleParc");
                        if (lat == null || lng == null) { lines.Add(name + " — pas de position"); continue; }
                        var speed = Json.Num(tracker, "lastSpeedKmh");
                        map.Markers.Add(new MapMarker { Lat = lat.Value, Lng = lng.Value, Label = name + (speed == null ? string.Empty : " · " + Math.Round(speed.Value) + " km/h") });
                        points.Add(new Point(lat.Value, lng.Value));
                        lines.Add(name + " — " + Data.Date(tracker, "lastPositionAt"));
                    }
                    foreach (var session in data[1].Where(s => Json.Str(s, "status") == "ACTIVE"))
                    {
                        var lat = Json.Num(session, "lastLatitude");
                        var lng = Json.Num(session, "lastLongitude");
                        if (lat == null || lng == null) continue;
                        var name = "Libre " + Json.Str(session, "courseCode");
                        map.Markers.Add(new MapMarker { Lat = lat.Value, Lng = lng.Value, Label = name, Color = Ui.Brush("#1D4ED8") });
                        points.Add(new Point(lat.Value, lng.Value));
                        lines.Add(name + " — " + Json.Str(session, "vehicleParc"));
                    }
                    list.ItemsSource = lines.Count == 0 ? new List<string> { "Aucun véhicule suivi." } : lines;
                    if (!fitted && points.Count > 0) { fitted = true; map.FitTo(points); } else map.Render();
                }, error => { busy = false; list.ItemsSource = new List<string> { "Erreur : " + error }; });
            };
            timer.Tick += (s, e) => refresh();
            root.Loaded += (s, e) => { refresh(); timer.Start(); };
            root.Unloaded += (s, e) => timer.Stop();
            return root;
        }

        // ----- Traçage libre -----

        public static UIElement FreeTracking()
        {
            var root = new Grid { Margin = new Thickness(14) };
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            root.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(14) });
            root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1.4, GridUnitType.Star) });
            var list = new ListView();
            var grid = new GridView();
            var headers = new[] { "Code", "Statut", "Véhicule", "Distance" };
            var widths = new[] { 110.0, 80, 70, 70 };
            for (var i = 0; i < headers.Length; i++)
                grid.Columns.Add(new GridViewColumn { Header = headers[i], Width = widths[i], DisplayMemberBinding = new System.Windows.Data.Binding("[" + i + "]") });
            list.View = grid;
            var map = new MapControl();
            var status = Ui.Text(string.Empty, 11, false, Ui.Muted);
            var sessions = new List<object>();

            Action reload = null;
            reload = () =>
            {
                status.Text = "Chargement…";
                Ui.Run(root.Dispatcher, () => Data.List("/ineo/free-tracking-sessions", "sessions"), found =>
                {
                    sessions = found;
                    list.ItemsSource = found.Select(s => (object)new[]
                    {
                        Json.Str(s, "courseCode"), Json.Str(s, "status"), Json.Str(s, "vehicleParc"),
                        ((Json.Num(s, "distanceMeters") ?? 0) / 1000).ToString("0.0", CultureInfo.CurrentCulture) + " km",
                    }).ToList();
                    status.Text = found.Count + " traçage(s).";
                }, error => status.Text = "Erreur : " + error);
            };

            Action<bool> create = stopByStop => Ui.Run(root.Dispatcher, () => Api.Post("/ineo/free-tracking-sessions", new Dictionary<string, object> { { "stopByStop", stopByStop } }), r =>
            {
                MessageBox.Show("Code course à saisir sur l'UC : " + Json.Str(Json.Get(r, "session"), "courseCode") + "\nCode service : RBE-999-999", "Traçage libre", MessageBoxButton.OK, MessageBoxImage.Information);
                reload();
            }, null);

            var toolbar = Ui.Toolbar(
                Ui.Button("Actualiser", (s, e) => reload()),
                Ui.Button("Nouveau code (continu)", (s, e) => create(false), true),
                Ui.Button("Nouveau code (arrêt par arrêt)", (s, e) => create(true)),
                Ui.Button("Tout supprimer", (s, e) =>
                {
                    if (Ui.Confirm("Supprimer tous les traçages libres ?")) Ui.Run(root.Dispatcher, () => Api.Delete("/ineo/free-tracking-sessions"), r => reload(), null);
                }));
            Grid.SetColumnSpan(toolbar, 3);
            root.Children.Add(toolbar);
            Grid.SetRow(list, 1);
            Grid.SetRow(map, 1);
            Grid.SetColumn(map, 2);
            root.Children.Add(list);
            root.Children.Add(map);
            Grid.SetRow(status, 1);
            status.VerticalAlignment = VerticalAlignment.Bottom;
            status.Margin = new Thickness(4);
            root.Children.Add(status);

            list.SelectionChanged += (s, e) =>
            {
                var index = list.SelectedIndex;
                if (index < 0 || index >= sessions.Count) return;
                var session = sessions[index];
                var positions = Json.List(session, "positions");
                var line = new MapLine { Color = Ui.Red };
                foreach (var p in positions)
                {
                    var lat = Json.Num(p, "latitude");
                    var lng = Json.Num(p, "longitude");
                    if (lat != null && lng != null) line.LatLng.Add(new Point(lat.Value, lng.Value));
                }
                map.Lines.Clear();
                map.Markers.Clear();
                map.Lines.Add(line);
                foreach (var stop in Json.List(session, "stops"))
                {
                    var lat = Json.Num(stop, "latitude");
                    var lng = Json.Num(stop, "longitude");
                    if (lat != null && lng != null) map.Markers.Add(new MapMarker { Lat = lat.Value, Lng = lng.Value, Label = "Arrêt " + Json.Str(stop, "sequence"), Color = Ui.Brush("#1D4ED8") });
                }
                if (line.LatLng.Count > 0) map.FitTo(line.LatLng); else map.Render();
                status.Text = "Vitesse max : " + Math.Round(Json.Num(session, "maxSpeedKmh") ?? 0) + " km/h · " + line.LatLng.Count + " position(s).";
            };
            root.Loaded += (s, e) => { if (sessions.Count == 0) reload(); };
            return root;
        }

        // ----- Véhicule pilote -----

        public static UIElement Pilot()
        {
            var name = new TextBox();
            var serial = new TextBox();
            var screens = new ComboBox { DisplayMemberPath = "Value", SelectedValuePath = "Key" };
            var state = Ui.Text(string.Empty, 12);
            var commands = new ListBox { Height = 200 };
            var root = new StackPanel { Margin = new Thickness(14), MaxWidth = 560, HorizontalAlignment = HorizontalAlignment.Left };

            Action reload = null;
            reload = () => Ui.Run(root.Dispatcher, () => new[] { Api.Get("/ineo/pilot"), Api.Get("/ineo/screen-profiles") }, data =>
            {
                var options = new List<KeyValuePair<string, string>> { new KeyValuePair<string, string>(string.Empty, "—") };
                options.AddRange(Data.Options(Json.List(data[1], "profiles"), p => Json.Str(p, "id"), p => Json.Str(p, "name")));
                screens.ItemsSource = options;
                var pilot = Json.Get(data[0], "pilot");
                if (!name.IsKeyboardFocused) name.Text = pilot == null ? "Véhicule pilote" : Json.Str(pilot, "name");
                if (!serial.IsKeyboardFocused) serial.Text = Json.Str(pilot, "ucSerial");
                screens.SelectedValue = Json.Str(pilot, "screenProfileId");
                var device = Json.Get(pilot, "device");
                state.Text = device == null ? "Aucun PC pilote n'a encore été vu." : (Json.Bool(device, "online") ? "● En ligne" : "○ Hors ligne") + " · version " + Json.Str(device, "appVersion") + " · vu le " + Data.Date(device, "lastSeenAt");
                commands.ItemsSource = Json.List(pilot, "commands").Select(c => Json.Str(c, "type") + " — " + Json.Str(c, "status") + " — " + Data.Date(c, "createdAt")).ToList();
            }, error => state.Text = "Erreur : " + error);

            Func<string, UIElement> label = text => Ui.Text(text, 11, false, Ui.Muted);
            root.Children.Add(Ui.Title("Véhicule pilote"));
            root.Children.Add(Ui.Text("PC de test : reçoit les profils d'écrans et les commandes à distance.", 11, false, Ui.Muted));
            root.Children.Add(label("Nom")); root.Children.Add(name);
            root.Children.Add(label("N° de série du PC pilote")); root.Children.Add(serial);
            root.Children.Add(label("Profil d'écrans")); root.Children.Add(screens);
            root.Children.Add(new StackPanel
            {
                Orientation = Orientation.Horizontal, Margin = new Thickness(0, 10, 0, 10),
                Children =
                {
                    Ui.Button("Enregistrer", (s, e) => Ui.Run(root.Dispatcher, () => Api.Put("/ineo/pilot", new Dictionary<string, object> { { "name", name.Text.Trim() }, { "ucSerial", serial.Text.Trim() }, { "screenProfileId", screens.SelectedValue as string ?? string.Empty } }), r => reload(), null), true),
                    Ui.Button("Actualiser", (s, e) => reload()),
                },
            });
            root.Children.Add(state);
            var commandBar = new WrapPanel { Margin = new Thickness(0, 10, 0, 6) };
            foreach (var pair in new[] { new[] { "CHECK_UPDATE", "Vérifier la mise à jour" }, new[] { "RELOAD", "Recharger" }, new[] { "TEST_SOUND", "Test son" }, new[] { "TEST_SCREEN", "Test écrans" } })
            {
                var type = pair[0];
                commandBar.Children.Add(Ui.Button(pair[1], (s, e) => Ui.Run(root.Dispatcher, () => Api.Post("/ineo/pilot/commands", new Dictionary<string, object> { { "type", type } }), r => reload(), null)));
            }
            root.Children.Add(commandBar);
            root.Children.Add(commands);

            var timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(5) };
            timer.Tick += (s, e) => reload();
            root.Loaded += (s, e) => { reload(); timer.Start(); };
            root.Unloaded += (s, e) => timer.Stop();
            return new ScrollViewer { Content = root, VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
        }

        // ----- Profils d'écrans -----

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

        public static UIElement ScreenProfiles()
        {
            var profiles = new List<object>();
            Dictionary<string, object> profile = null;
            List<object> screens = new List<object>();
            Dictionary<string, object> screen = null;
            var updating = false;

            var profileList = new ListBox { DisplayMemberPath = "Key" };
            var name = new TextBox();
            var description = new TextBox();
            var screenList = new ListBox { Height = 110, DisplayMemberPath = "Key" };
            var screenName = new TextBox();
            var place = new ComboBox { DisplayMemberPath = "Value", SelectedValuePath = "Key", ItemsSource = Places.Select(p => new KeyValuePair<string, string>(p[0], p[1])).ToList() };
            var px = new TextBox(); var py = new TextBox(); var widthPct = new TextBox(); var widthPx = new TextBox(); var heightPx = new TextBox();
            var offline = Ui.Text(string.Empty, 11, false, Ui.Muted);
            var online = Ui.Text(string.Empty, 11, false, Ui.Muted);
            var status = Ui.Text(string.Empty, 11, false, Ui.Muted);
            var plan = new Canvas { Background = Ui.Panel, Height = 160, Width = 400, HorizontalAlignment = HorizontalAlignment.Left };
            var form = new StackPanel { IsEnabled = false };

            Action drawPlan = () =>
            {
                plan.Children.Clear();
                foreach (Dictionary<string, object> s in screens)
                {
                    var w = (Json.Num(s, "widthPct") ?? 10) / 100.0 * plan.Width;
                    var h = (Json.Num(s, "widthPct") ?? 10) * 2.5 * ((Json.Num(s, "heightPx") ?? 720) / Math.Max(1, Json.Num(s, "widthPx") ?? 1280)) / 100.0 * plan.Height;
                    var rect = new Border
                    {
                        Width = Math.Max(8, w), Height = Math.Max(6, h), BorderThickness = new Thickness(s == screen ? 2 : 1),
                        BorderBrush = s == screen ? Ui.Red : Ui.Carbon, Background = Brushes.White,
                        Child = new TextBlock { Text = Json.Str(s, "name"), FontSize = 8, TextTrimming = TextTrimming.CharacterEllipsis },
                    };
                    Canvas.SetLeft(rect, (Json.Num(s, "x") ?? 0) / 100.0 * plan.Width);
                    Canvas.SetTop(rect, (Json.Num(s, "y") ?? 0) / 100.0 * plan.Height);
                    plan.Children.Add(rect);
                }
            };

            Action showScreens = () =>
            {
                screenList.ItemsSource = screens.Select(s => new KeyValuePair<string, object>(Json.Str(s, "name"), s)).ToList();
                drawPlan();
            };

            Action<bool> readScreenForm = _ =>
            {
                if (screen == null || updating) return;
                screen["name"] = screenName.Text.Trim();
                screen["place"] = place.SelectedValue as string ?? "CUSTOM";
                Func<TextBox, double> num = box => { double v; return double.TryParse(box.Text.Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out v) ? v : 0; };
                screen["x"] = num(px); screen["y"] = num(py); screen["widthPct"] = num(widthPct); screen["widthPx"] = num(widthPx); screen["heightPx"] = num(heightPx);
                drawPlan();
            };
            foreach (var box in new[] { screenName, px, py, widthPct, widthPx, heightPx }) box.TextChanged += (s, e) => readScreenForm(true);
            place.SelectionChanged += (s, e) => readScreenForm(true);

            Action fillScreenForm = () =>
            {
                updating = true;
                form.IsEnabled = screen != null;
                if (screen != null)
                {
                    screenName.Text = Json.Str(screen, "name"); place.SelectedValue = Json.Str(screen, "place");
                    px.Text = Json.Str(screen, "x"); py.Text = Json.Str(screen, "y"); widthPct.Text = Json.Str(screen, "widthPct");
                    widthPx.Text = Json.Str(screen, "widthPx"); heightPx.Text = Json.Str(screen, "heightPx");
                    offline.Text = "Image hors ligne : " + (Json.Str(screen, "offlineMediaId").Length > 0 ? "définie" : "aucune");
                    online.Text = "Image en ligne : " + (Json.Str(screen, "onlineMediaId").Length > 0 ? "définie" : "aucune");
                }
                updating = false;
                drawPlan();
            };

            Func<string, string> upload = null;
            upload = key =>
            {
                var dialog = new OpenFileDialog { Filter = "Images|*.png;*.jpg;*.jpeg;*.gif;*.webp" };
                if (dialog.ShowDialog() != true) return null;
                var bytes = File.ReadAllBytes(dialog.FileName);
                if (bytes.Length > 6 * 1024 * 1024) { Ui.Error("L'image doit faire moins de 6 Mo."); return null; }
                var target = screen;
                status.Text = "Envoi de l'image…";
                Ui.Run(plan.Dispatcher, () => Api.Post("/ineo/media", new Dictionary<string, object> { { "fileName", Path.GetFileName(dialog.FileName) }, { "dataBase64", Convert.ToBase64String(bytes) } }), r =>
                {
                    target[key] = Json.Str(Json.Get(r, "media"), "id");
                    status.Text = "Image envoyée. N'oubliez pas d'enregistrer le profil.";
                    fillScreenForm();
                }, error => { status.Text = "Échec : " + error; });
                return null;
            };

            Action selectProfile = () =>
            {
                form.IsEnabled = false; screen = null;
                name.Text = profile == null ? string.Empty : Json.Str(profile, "name");
                description.Text = profile == null ? string.Empty : Json.Str(profile, "description");
                screens = profile == null ? new List<object>() : Json.List(profile, "screens");
                showScreens();
            };

            Action reload = null;
            reload = () => Ui.Run(plan.Dispatcher, () => Data.List("/ineo/screen-profiles", "profiles"), found =>
            {
                profiles = found;
                profileList.ItemsSource = found.Select(p => new KeyValuePair<string, object>(Json.Str(p, "name"), p)).ToList();
                profile = null; selectProfile();
                status.Text = found.Count + " profil(s).";
            }, error => status.Text = "Erreur : " + error);

            profileList.SelectionChanged += (s, e) =>
            {
                if (profileList.SelectedItem == null) return;
                profile = (Dictionary<string, object>)((KeyValuePair<string, object>)profileList.SelectedItem).Value;
                selectProfile();
            };
            screenList.SelectionChanged += (s, e) =>
            {
                if (screenList.SelectedItem == null) return;
                screen = (Dictionary<string, object>)((KeyValuePair<string, object>)screenList.SelectedItem).Value;
                fillScreenForm();
            };

            var root = new Grid { Margin = new Thickness(14) };
            root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(220) });
            root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(14) });
            root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            root.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            var left = new DockPanel();
            var leftButtons = Ui.Toolbar(
                Ui.Button("Nouveau", (s, e) =>
                {
                    profile = new Dictionary<string, object> { { "name", "Nouveau profil" }, { "screens", new List<object>() } };
                    profileList.SelectedItem = null;
                    selectProfile();
                    name.Text = "Nouveau profil";
                }),
                Ui.Button("Supprimer", (s, e) =>
                {
                    var id = profile == null ? string.Empty : Json.Str(profile, "id");
                    if (id.Length == 0 || !Ui.Confirm("Supprimer ce profil ?")) return;
                    Ui.Run(plan.Dispatcher, () => Api.Delete("/ineo/screen-profiles/" + Data.Encode(id)), r => reload(), null);
                }));
            DockPanel.SetDock(leftButtons, Dock.Top);
            left.Children.Add(leftButtons);
            left.Children.Add(profileList);
            root.Children.Add(left);

            Func<string, UIElement> label = text => new TextBlock { Text = text, Foreground = Ui.Muted, FontSize = 11, Margin = new Thickness(0, 6, 0, 2) };
            var right = new StackPanel();
            right.Children.Add(label("Nom du profil")); right.Children.Add(name);
            right.Children.Add(label("Description")); right.Children.Add(description);
            right.Children.Add(label("Plan du véhicule (avant à droite)")); right.Children.Add(plan);
            right.Children.Add(label("Écrans"));
            right.Children.Add(screenList);
            right.Children.Add(new StackPanel
            {
                Orientation = Orientation.Horizontal, Margin = new Thickness(0, 6, 0, 0),
                Children =
                {
                    Ui.Button("Ajouter un écran", (s, e) =>
                    {
                        if (profile == null) { Ui.Error("Sélectionnez ou créez un profil."); return; }
                        var p = Places[Math.Min(screens.Count, Places.Length - 1)];
                        screens.Add(new Dictionary<string, object>
                        {
                            { "name", p[1] }, { "place", p[0] }, { "x", double.Parse(p[2], CultureInfo.InvariantCulture) }, { "y", double.Parse(p[3], CultureInfo.InvariantCulture) },
                            { "widthPct", double.Parse(p[4], CultureInfo.InvariantCulture) }, { "widthPx", double.Parse(p[5], CultureInfo.InvariantCulture) }, { "heightPx", double.Parse(p[6], CultureInfo.InvariantCulture) },
                        });
                        showScreens();
                    }),
                    Ui.Button("Retirer l'écran", (s, e) => { if (screen != null) { screens.Remove(screen); screen = null; form.IsEnabled = false; showScreens(); } }),
                },
            });
            form.Children.Add(label("Nom de l'écran")); form.Children.Add(screenName);
            form.Children.Add(label("Emplacement")); form.Children.Add(place);
            form.Children.Add(label("Position X % / Y %")); form.Children.Add(new StackPanel { Orientation = Orientation.Horizontal, Children = { Sized(px), Sized(py) } });
            form.Children.Add(label("Largeur sur le plan %")); form.Children.Add(Sized(widthPct));
            form.Children.Add(label("Résolution (largeur × hauteur en pixels)")); form.Children.Add(new StackPanel { Orientation = Orientation.Horizontal, Children = { Sized(widthPx), Sized(heightPx) } });
            form.Children.Add(offline);
            form.Children.Add(Ui.Button("Choisir l'image hors ligne…", (s, e) => upload("offlineMediaId")));
            form.Children.Add(online);
            form.Children.Add(Ui.Button("Choisir l'image en ligne…", (s, e) => upload("onlineMediaId")));
            right.Children.Add(form);
            Grid.SetColumn(right, 2);
            var scroll = new ScrollViewer { Content = right, VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
            Grid.SetColumn(scroll, 2);
            root.Children.Add(scroll);

            var bottom = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 8, 0, 0) };
            bottom.Children.Add(Ui.Button("Enregistrer le profil", (s, e) =>
            {
                if (profile == null) { Ui.Error("Aucun profil sélectionné."); return; }
                var id = Json.Str(profile, "id");
                var body = new Dictionary<string, object>
                {
                    { "name", name.Text.Trim() }, { "description", description.Text.Trim() },
                    { "screens", screens.Select(x => (object)Json.Obj(x)).ToList() },
                };
                Ui.Run(plan.Dispatcher, () => id.Length == 0 ? Api.Post("/ineo/screen-profiles", body) : Api.Put("/ineo/screen-profiles/" + Data.Encode(id), body), r => reload(), null);
            }, true));
            bottom.Children.Add(Ui.Button("Actualiser", (s, e) => reload()));
            bottom.Children.Add(status);
            Grid.SetRow(bottom, 1);
            Grid.SetColumnSpan(bottom, 3);
            root.Children.Add(bottom);
            root.Loaded += (s, e) => { if (profiles.Count == 0) reload(); };
            return root;
        }

        private static TextBox Sized(TextBox box) { box.Width = 100; box.Margin = new Thickness(0, 0, 8, 0); return box; }

        // ----- Installateurs -----

        public static UIElement Installers()
        {
            var root = new StackPanel { Margin = new Thickness(14), MaxWidth = 720, HorizontalAlignment = HorizontalAlignment.Left };
            root.Children.Add(Ui.Title("Installateurs"));
            root.Children.Add(Ui.Text("Publication des logiciels Inéo RétroBus : UC embarqué, Maintenance et Planification.", 11, false, Ui.Muted));
            foreach (var pair in new[] { new[] { "UC", "UC embarqué" }, new[] { "MAINTENANCE", "Maintenance" }, new[] { "PLANNING", "Planification" } })
            {
                var product = pair[0];
                var list = new ListBox { Height = 110, Margin = new Thickness(0, 4, 0, 0) };
                var releases = new List<object>();
                Action reload = null;
                reload = () => Ui.Run(root.Dispatcher, () => Data.List("/ineo/desktop-releases?product=" + product, "releases"), found =>
                {
                    releases = found;
                    list.ItemsSource = found.Select(r => Json.Str(r, "version") + " — " + Math.Round((Json.Num(r, "size") ?? 0) / 1048576, 1) + " Mo — " + Data.Date(r, "createdAt")).ToList();
                }, null);
                var upload = Ui.Button("Publier un .exe…", (s, e) =>
                {
                    var dialog = new OpenFileDialog { Filter = "Installateur|*.exe" };
                    if (dialog.ShowDialog() != true) return;
                    var version = Prompt.Ask(Window.GetWindow(root), "Version (AA.MM.NNN)", "Numéro de version");
                    if (string.IsNullOrEmpty(version)) return;
                    var notes = Prompt.Ask(Window.GetWindow(root), "Notes de version (facultatif)", "Notes") ?? string.Empty;
                    var bytes = File.ReadAllBytes(dialog.FileName);
                    Ui.Run(root.Dispatcher, () => Api.Post("/ineo/desktop-releases", new Dictionary<string, object>
                    {
                        { "product", product }, { "version", version }, { "notes", notes }, { "fileName", Path.GetFileName(dialog.FileName) }, { "dataBase64", Convert.ToBase64String(bytes) },
                    }), r => reload(), null);
                });
                var delete = Ui.Button("Supprimer", (s, e) =>
                {
                    var index = list.SelectedIndex;
                    if (index < 0 || !Ui.Confirm("Supprimer cette version ?")) return;
                    var id = Json.Str(releases[index], "id");
                    Ui.Run(root.Dispatcher, () => Api.Delete("/ineo/desktop-releases/" + Data.Encode(id)), r => reload(), null);
                });
                root.Children.Add(new TextBlock { Text = pair[1], FontWeight = FontWeights.Bold, Margin = new Thickness(0, 14, 0, 0) });
                root.Children.Add(list);
                root.Children.Add(new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 4, 0, 0), Children = { upload, delete } });
                var loader = reload;
                root.Loaded += (s, e) => loader();
            }
            return new ScrollViewer { Content = root, VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
        }
    }

    public static class Prompt
    {
        public static string Ask(Window owner, string question, string title)
        {
            var box = new TextBox { MinWidth = 280, Margin = new Thickness(0, 6, 0, 10) };
            var window = new Window { Title = title, Owner = owner, SizeToContent = SizeToContent.WidthAndHeight, WindowStartupLocation = WindowStartupLocation.CenterOwner, ResizeMode = ResizeMode.NoResize };
            var ok = Ui.Button("OK", (s, e) => { window.DialogResult = true; }, true);
            window.Content = new StackPanel { Margin = new Thickness(14), Children = { new TextBlock { Text = question }, box, new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Children = { ok, Ui.Button("Annuler", (s, e) => { window.DialogResult = false; }) } } } };
            return window.ShowDialog() == true ? box.Text.Trim() : null;
        }
    }
}
