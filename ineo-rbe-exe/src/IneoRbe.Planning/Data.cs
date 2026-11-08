using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Windows;
using System.Windows.Controls;

namespace IneoRbe.Planning
{
    public static class Data
    {
        public static List<object> List(string path, string key)
        {
            var payload = Api.Get(path);
            var list = key == null ? payload as List<object> : Json.Get(payload, key) as List<object>;
            return list ?? new List<object>();
        }

        public static List<KeyValuePair<string, string>> Options(IEnumerable<object> items, Func<object, string> value, Func<object, string> label)
        {
            return items.Select(item => new KeyValuePair<string, string>(value(item), label(item))).Where(p => p.Key.Length > 0).ToList();
        }

        public static List<object> Vehicles()
        {
            var payload = Api.Get("/vehicles");
            return payload as List<object> ?? Json.List(payload, "vehicles");
        }

        public static string VehicleLabel(object vehicle)
        {
            var details = string.Join(" ", new[] { Json.Str(vehicle, "marque"), Json.Str(vehicle, "modele"), Json.Str(vehicle, "immat") }.Where(s => s.Length > 0).ToArray());
            return Json.Str(vehicle, "parc") + (details.Length == 0 ? string.Empty : " — " + details);
        }

        public static string YesNo(object item, string path) { return Json.Bool(item, path) ? "Oui" : "Non"; }

        public static string Date(object item, string path) { return EditorView.FormatDate(Json.Str(item, path)); }

        public static string Encode(string value) { return Uri.EscapeDataString(value); }

        public static object RetryFimo(Func<bool, object> send)
        {
            try { return send(false); }
            catch (ApiException exception)
            {
                if (exception.Message.IndexOf("FIMO", StringComparison.OrdinalIgnoreCase) < 0) throw;
                var accepted = (bool)Application.Current.Dispatcher.Invoke(new Func<bool>(() => Ui.Confirm(exception.Message + "\n\nAffecter malgré tout ce conducteur ?")));
                if (!accepted) throw;
                return send(true);
            }
        }
    }

    // Recherche d'un lieu (géocodage relayé par le serveur) : renvoie libellé et coordonnées.
    public sealed class GeocodeDialog : Window
    {
        private readonly TextBox _query = new TextBox { MinWidth = 280 };
        private readonly ListBox _results = new ListBox { Height = 180, Margin = new Thickness(0, 8, 0, 8), DisplayMemberPath = "Key" };
        private readonly TextBlock _status = Ui.Text(string.Empty, 11, false, Ui.Muted);

        public string Label { get; private set; }
        public double Lat { get; private set; }
        public double Lng { get; private set; }

        public GeocodeDialog(Window owner)
        {
            Owner = owner;
            Title = "Rechercher un lieu";
            Width = 460;
            SizeToContent = SizeToContent.Height;
            WindowStartupLocation = WindowStartupLocation.CenterOwner;
            ResizeMode = ResizeMode.NoResize;
            var search = Ui.Button("Chercher", (s, e) => Search(), true);
            var row = new DockPanel();
            DockPanel.SetDock(search, Dock.Right);
            row.Children.Add(search);
            row.Children.Add(_query);
            _query.KeyDown += (s, e) => { if (e.Key == System.Windows.Input.Key.Enter) Search(); };
            var ok = Ui.Button("Utiliser ce lieu", (s, e) => Accept());
            var panel = new StackPanel { Margin = new Thickness(14) };
            panel.Children.Add(row);
            panel.Children.Add(_results);
            panel.Children.Add(_status);
            panel.Children.Add(new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 8, 0, 0), Children = { ok, Ui.Button("Annuler", (s, e) => { DialogResult = false; }) } });
            Content = panel;
            _results.MouseDoubleClick += (s, e) => Accept();
        }

        private void Search()
        {
            var text = _query.Text.Trim();
            if (text.Length < 3) { _status.Text = "Saisissez au moins 3 caractères."; return; }
            _status.Text = "Recherche…";
            Ui.Run(Dispatcher, () => Api.Get("/ineo/geocode?q=" + Data.Encode(text)), payload =>
            {
                var found = Json.List(payload, "results").Select(r => new KeyValuePair<string, object>(Json.Str(r, "label"), r)).ToList();
                _results.ItemsSource = found;
                _status.Text = found.Count == 0 ? "Aucun résultat." : found.Count + " résultat(s).";
            }, error => _status.Text = "Erreur : " + error);
        }

        private void Accept()
        {
            if (_results.SelectedItem == null) return;
            var pair = (KeyValuePair<string, object>)_results.SelectedItem;
            Label = pair.Key;
            Lat = Json.Num(pair.Value, "lat") ?? 0;
            Lng = Json.Num(pair.Value, "lng") ?? 0;
            DialogResult = true;
        }
    }
}
