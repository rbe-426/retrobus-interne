using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Planning
{
    // Onglet « Messages exceptionnels » : annonces vocales ponctuelles (déviation, perturbation…) relues toutes les N minutes
    // pendant leur période, partout, sur des lignes choisies ou sur les lignes qui desservent des arrêts choisis.
    public sealed class ExceptionalView : DockPanel
    {
        private sealed class LineChoice
        {
            public string Id;
            public string Name;
            public List<string> Stops = new List<string>();
        }

        private List<ExceptionalMessage> _messages = SaeivStore.LoadExceptional();
        private List<LineChoice> _lines = new List<LineChoice>();
        private bool _loading;

        private readonly ListBox _list = new ListBox { MinWidth = 260, Margin = new Thickness(0, 0, 12, 0) };
        private readonly TextBox _title = new TextBox();
        private readonly TextBox _text = new TextBox { AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, MinHeight = 80, VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
        private readonly CheckBox _enabled = new CheckBox { Content = "Message activé", Margin = new Thickness(0, 8, 0, 0) };
        private readonly TextBox _interval = new TextBox();
        private readonly TextBox _starts = new TextBox();
        private readonly TextBox _ends = new TextBox();
        private readonly ComboBox _scope = new ComboBox { DisplayMemberPath = "Value", SelectedValuePath = "Key" };
        private readonly StackPanel _linePanel = new StackPanel();
        private readonly StackPanel _stopPanel = new StackPanel();
        private readonly TextBlock _status = Ui.Text(string.Empty, 11, false, Ui.Muted);
        private readonly List<CheckBox> _lineChecks = new List<CheckBox>();
        private readonly List<CheckBox> _stopChecks = new List<CheckBox>();
        private readonly StackPanel _editor = new StackPanel { IsEnabled = false };

        public ExceptionalView()
        {
            Margin = new Thickness(0, 10, 0, 0);
            _scope.ItemsSource = new[]
            {
                new KeyValuePair<string, string>(ExceptionalMessage.ScopeAll, "Diffuser partout"),
                new KeyValuePair<string, string>(ExceptionalMessage.ScopeLines, "Choisir les lignes"),
                new KeyValuePair<string, string>(ExceptionalMessage.ScopeStops, "Choisir le secteur concerné (arrêts)"),
            };

            var left = new DockPanel();
            var buttons = Ui.Toolbar(Ui.Button("Ajouter", (s, e) => Add()), Ui.Button("Supprimer", (s, e) => Remove()));
            SetDock(buttons, Dock.Top);
            left.Children.Add(buttons);
            left.Children.Add(_list);
            SetDock(left, Dock.Left);
            Children.Add(left);

            _editor.Children.Add(Field("Titre (repère interne)", _title));
            _editor.Children.Add(Field("Texte lu par la voix — variables : {ligne}, {arrets}", _text));
            _editor.Children.Add(Field("Relire toutes les … minutes", _interval));
            _editor.Children.Add(Field("Début (AAAA-MM-JJ HH:mm, vide = tout de suite)", _starts));
            _editor.Children.Add(Field("Fin (AAAA-MM-JJ HH:mm, vide = jusqu'à désactivation)", _ends));
            _editor.Children.Add(_enabled);
            _editor.Children.Add(Field("Lignes qui diffusent le message", _scope));
            _editor.Children.Add(_linePanel);
            _editor.Children.Add(_stopPanel);
            _editor.Children.Add(Ui.Toolbar(Ui.Button("Tester la lecture", (s, e) => Test()), Ui.Button("Actualiser les lignes", (s, e) => LoadLines()), _status));
            _editor.Children.Add(Ui.Text("Les messages sont publiés avec la révision (bouton « Publier la révision actuelle… »). L'UC connaît la ligne en service par la console du véhicule ; sans ligne connue, seuls les messages « partout » sont lus.", 11, false, Ui.Muted));
            Children.Add(new ScrollViewer { Content = _editor, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });

            _list.SelectionChanged += (s, e) => Load();
            _title.TextChanged += (s, e) => Apply();
            _text.TextChanged += (s, e) => Apply();
            _interval.TextChanged += (s, e) => Apply();
            _starts.TextChanged += (s, e) => Apply();
            _ends.TextChanged += (s, e) => Apply();
            _enabled.Click += (s, e) => Apply();
            _scope.SelectionChanged += (s, e) => Apply();
            Loaded += (s, e) => { if (_lines.Count == 0) LoadLines(); };
            Refresh(-1);
        }

        private static StackPanel Field(string label, UIElement control)
        {
            var panel = new StackPanel { Margin = new Thickness(0, 6, 0, 0) };
            panel.Children.Add(Ui.Text(label, 11, true, Ui.Muted));
            panel.Children.Add(control);
            return panel;
        }

        private ExceptionalMessage Current { get { var i = _list.SelectedIndex; return i >= 0 && i < _messages.Count ? _messages[i] : null; } }

        private void Refresh(int select)
        {
            _loading = true;
            _list.Items.Clear();
            foreach (var message in _messages) _list.Items.Add(message.DisplayText);
            _list.SelectedIndex = select;
            _loading = false;
            Load();
        }

        private void LoadLines()
        {
            _status.Text = "  Chargement des lignes…";
            Ui.Run(Dispatcher, () => Data.List("/ineo/lines", "lines"), data =>
            {
                _lines = new List<LineChoice>();
                foreach (var line in data)
                {
                    var choice = new LineChoice { Id = Json.Str(line, "id"), Name = Json.Str(line, "name") };
                    foreach (var key in new[] { "outboundStops", "returnStops" })
                    {
                        foreach (var stop in Json.List(line, key))
                        {
                            var label = Json.Str(stop, "label");
                            if (label.Length > 0 && !choice.Stops.Contains(label)) choice.Stops.Add(label);
                        }
                    }
                    _lines.Add(choice);
                }
                _status.Text = "  " + _lines.Count + " ligne(s) chargée(s).";
                BuildChoices();
            }, error => _status.Text = "  Erreur : " + error);
        }

        // Cases à cocher des lignes et des arrêts (par ligne) : un arrêt commun à plusieurs lignes reste synchronisé.
        private void BuildChoices()
        {
            _linePanel.Children.Clear();
            _stopPanel.Children.Clear();
            _lineChecks.Clear();
            _stopChecks.Clear();
            foreach (var line in _lines)
            {
                var lineId = line.Id;
                var check = new CheckBox { Content = line.Name, Tag = lineId, Margin = new Thickness(0, 2, 12, 2) };
                check.Click += (s, e) => Apply();
                _lineChecks.Add(check);
                _linePanel.Children.Add(check);

                var wrap = new WrapPanel { Margin = new Thickness(12, 2, 0, 6) };
                foreach (var label in line.Stops)
                {
                    var stop = new CheckBox { Content = label, Tag = label, Margin = new Thickness(0, 2, 14, 2) };
                    stop.Click += (s, e) => Apply();
                    _stopChecks.Add(stop);
                    wrap.Children.Add(stop);
                }
                _stopPanel.Children.Add(new Expander { Header = "Arrêts de la ligne " + line.Name, Content = wrap });
            }
            Load();
        }

        private void Load()
        {
            if (_loading) return;
            var item = Current;
            _loading = true;
            _editor.IsEnabled = item != null;
            _title.Text = item == null ? string.Empty : item.Title;
            _text.Text = item == null ? string.Empty : item.Text;
            _interval.Text = item == null ? string.Empty : item.IntervalMinutes.ToString(CultureInfo.InvariantCulture);
            _starts.Text = item == null ? string.Empty : item.StartsAt;
            _ends.Text = item == null ? string.Empty : item.EndsAt;
            _enabled.IsChecked = item != null && item.Enabled;
            _scope.SelectedValue = item == null ? ExceptionalMessage.ScopeAll : item.Scope;
            foreach (var check in _lineChecks) check.IsChecked = item != null && item.LineIds.Contains((string)check.Tag);
            foreach (var check in _stopChecks) check.IsChecked = item != null && item.Stops.Any(s => string.Equals(s, (string)check.Tag, StringComparison.OrdinalIgnoreCase));
            _loading = false;
            UpdateScopePanels();
        }

        private void UpdateScopePanels()
        {
            var scope = _scope.SelectedValue as string;
            _linePanel.Visibility = scope == ExceptionalMessage.ScopeLines ? Visibility.Visible : Visibility.Collapsed;
            _stopPanel.Visibility = scope == ExceptionalMessage.ScopeStops ? Visibility.Visible : Visibility.Collapsed;
        }

        private void Apply()
        {
            if (_loading) return;
            var item = Current;
            if (item == null) return;
            item.Title = _title.Text.Trim();
            item.Text = _text.Text.Trim();
            int minutes;
            item.IntervalMinutes = int.TryParse(_interval.Text.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out minutes) ? Math.Max(1, Math.Min(240, minutes)) : 10;
            item.StartsAt = _starts.Text.Trim();
            item.EndsAt = _ends.Text.Trim();
            item.Enabled = _enabled.IsChecked == true;
            item.Scope = _scope.SelectedValue as string ?? ExceptionalMessage.ScopeAll;
            item.LineIds = _lineChecks.Where(c => c.IsChecked == true).Select(c => (string)c.Tag).ToList();
            item.Stops = _stopChecks.Where(c => c.IsChecked == true).Select(c => (string)c.Tag).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            UpdateScopePanels();
            SyncStopChecks(item);
            Save();
            var index = _list.SelectedIndex;
            _loading = true;
            _list.Items[index] = item.DisplayText;
            _list.SelectedIndex = index;
            _loading = false;
        }

        private void SyncStopChecks(ExceptionalMessage item)
        {
            _loading = true;
            foreach (var check in _stopChecks) check.IsChecked = item.Stops.Any(s => string.Equals(s, (string)check.Tag, StringComparison.OrdinalIgnoreCase));
            _loading = false;
        }

        private void Save()
        {
            try { SaeivStore.SaveExceptional(_messages); }
            catch (Exception exception) { Ui.Error("Enregistrement impossible : " + exception.Message); }
        }

        private void Add()
        {
            _messages.Add(new ExceptionalMessage { Title = "Nouveau message", Text = "Information voyageurs : " });
            Save();
            Refresh(_messages.Count - 1);
        }

        private void Remove()
        {
            var item = Current;
            if (item == null || !Ui.Confirm("Supprimer le message « " + item.Title + " » ?")) return;
            _messages.Remove(item);
            Save();
            Refresh(-1);
        }

        private void Test()
        {
            var item = Current;
            if (item == null || item.Text.Length == 0) return;
            var line = _lines.Count > 0 && item.Scope == ExceptionalMessage.ScopeLines ? _lines.FirstOrDefault(l => item.LineIds.Contains(l.Id)) : null;
            var spoken = item.SpokenText(line == null ? null : new LineConfig { Name = line.Name });
            TtsEngine.Cancel();
            _status.Text = "  Lecture en cours…";
            TtsEngine.Speak(spoken, SaeivStore.LoadNorms().Tts, error => Dispatcher.BeginInvoke(new Action(() => _status.Text = error == null ? "  Lecture terminée." : "  Erreur : " + error)));
        }

        // Messages à publier : uniquement ceux qui ont un texte.
        public static List<object> ToJson()
        {
            var result = new List<object>();
            foreach (var item in SaeivStore.LoadExceptional())
            {
                if (string.IsNullOrEmpty(item.Text)) continue;
                result.Add(new Dictionary<string, object>
                {
                    { "id", item.Id }, { "title", item.Title }, { "text", item.Text }, { "enabled", item.Enabled }, { "scope", item.Scope },
                    { "lineIds", item.LineIds.Cast<object>().ToList() }, { "stops", item.Stops.Cast<object>().ToList() },
                    { "intervalMinutes", item.IntervalMinutes }, { "startsAt", item.StartsAt }, { "endsAt", item.EndsAt },
                });
            }
            return result;
        }
    }
}
