using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;

namespace IneoRbe.Planning
{
    public enum FieldKind { Text, Multiline, Number, Check, Combo, DateTime, Hidden }

    public sealed class FieldDef
    {
        public string Key;
        public string Label;
        public FieldKind Kind;
        public bool ReadOnly;
        public string Hint;
        // Valeur, libellé. Alimenté par Prepare ou en dur.
        public List<KeyValuePair<string, string>> Options = new List<KeyValuePair<string, string>>();

        public FieldDef(string key, string label, FieldKind kind = FieldKind.Text)
        {
            Key = key; Label = label; Kind = kind;
        }
    }

    public sealed class ColDef
    {
        public string Header;
        public double Width;
        public Func<object, string> Get;
        public ColDef(string header, double width, Func<object, string> get) { Header = header; Width = width; Get = get; }
        public ColDef(string header, double width, string path) : this(header, width, item => Json.Str(item, path)) { }
    }

    // Liste à gauche, formulaire à droite : sert à la plupart des sections.
    public sealed class EditorView : Grid
    {
        public const string DateFormat = "dd/MM/yyyy HH:mm";
        private static readonly CultureInfo French = new CultureInfo("fr-FR");

        public List<FieldDef> Fields = new List<FieldDef>();
        public List<ColDef> Columns = new List<ColDef>();
        public Func<List<object>> Load;
        public Action Prepare;
        public Func<Dictionary<string, object>, object, object> Save;
        public Func<object, object> Remove;
        public Func<object, string> Describe;
        public string NewLabel = "Nouveau";
        public string Note;

        private readonly ListView _list = new ListView();
        private readonly StackPanel _form = new StackPanel();
        private readonly Dictionary<FieldDef, Control> _controls = new Dictionary<FieldDef, Control>();
        private readonly TextBlock _status = Ui.Text(string.Empty, 11, false, Ui.Muted);
        private readonly WrapPanel _toolbar = new WrapPanel { Margin = new Thickness(0, 0, 0, 8) };
        private readonly Button _saveButton;
        private readonly Button _deleteButton;
        private List<object> _items = new List<object>();
        private object _current;
        private bool _built;

        public object Selected { get { return _current; } }
        public IList<object> Items { get { return _items; } }

        public EditorView()
        {
            Margin = new Thickness(14);
            RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(3, GridUnitType.Star) });
            ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(14) });
            ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(2, GridUnitType.Star), MinWidth = 300 });

            _toolbar.Children.Add(Ui.Button("Actualiser", (s, e) => { Api.Refresh(); Reload(); }));
            _toolbar.Children.Add(Ui.Button(NewLabel, (s, e) => Select(null)));
            _deleteButton = Ui.Button("Supprimer", (s, e) => DeleteCurrent());
            _toolbar.Children.Add(_deleteButton);
            SetColumn(_toolbar, 0);
            SetColumnSpan(_toolbar, 3);
            Children.Add(_toolbar);

            _list.SelectionChanged += (s, e) =>
            {
                var index = _list.SelectedIndex;
                if (index >= 0 && index < _items.Count) FillForm(_items[index]);
            };
            SetRow(_list, 1);
            Children.Add(_list);

            var scroll = new ScrollViewer { VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Content = _form };
            SetRow(scroll, 1);
            SetColumn(scroll, 2);
            Children.Add(scroll);

            _saveButton = Ui.Button("Enregistrer", (s, e) => SaveCurrent(), true);
            SetRow(_status, 2);
            SetColumnSpan(_status, 3);
            _status.Margin = new Thickness(0, 8, 0, 0);
            Children.Add(_status);
        }

        public Button AddButton(string text, Action<object> action)
        {
            var button = Ui.Button(text, (s, e) => action(_current));
            _toolbar.Children.Add(button);
            return button;
        }

        public void SetStatus(string text) { _status.Text = text; }

        public void AppendValue(string key, string line)
        {
            foreach (var pair in _controls)
            {
                var box = pair.Value as TextBox;
                if (pair.Key.Key != key || box == null) continue;
                box.Text = box.Text.Length == 0 || box.Text.EndsWith("\n") ? box.Text + line : box.Text + "\r\n" + line;
            }
        }

        public string GetValue(string key)
        {
            foreach (var pair in _controls)
            {
                var box = pair.Value as TextBox;
                if (pair.Key.Key == key && box != null) return box.Text;
            }
            return string.Empty;
        }

        public void SetValue(string key, string value)
        {
            foreach (var pair in _controls)
            {
                if (pair.Key.Key != key) continue;
                var box = pair.Value as TextBox;
                var combo = pair.Value as ComboBox;
                if (box != null) box.Text = value;
                else if (combo != null) combo.SelectedValue = value;
            }
        }

        public void Start()
        {
            Build();
            Reload();
            // Les listes liées (trajets, véhicules, conducteurs) se resynchronisent à chaque retour sur l'écran.
            if (_syncHooked) return;
            _syncHooked = true;
            IsVisibleChanged += (s, e) => { if ((bool)e.NewValue) Reload(); };
        }

        private bool _syncHooked;

        private void Build()
        {
            if (_built) return;
            _built = true;
            if (!string.IsNullOrEmpty(Note)) _form.Children.Add(new TextBlock { Text = Note, Foreground = Ui.Muted, FontSize = 11, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 8) });
            var grid = new GridView();
            foreach (var column in Columns)
            {
                var path = column;
                grid.Columns.Add(new GridViewColumn
                {
                    Header = column.Header,
                    Width = column.Width,
                    DisplayMemberBinding = new System.Windows.Data.Binding("[" + Columns.IndexOf(column) + "]"),
                });
            }
            _list.View = grid;
            foreach (var field in Fields)
            {
                if (field.Kind == FieldKind.Hidden) { _controls[field] = new TextBox(); continue; }
                Control control;
                switch (field.Kind)
                {
                    case FieldKind.Check: control = new CheckBox { Content = field.Label, Margin = new Thickness(0, 6, 0, 0) }; break;
                    case FieldKind.Combo: control = new ComboBox { DisplayMemberPath = "Value", SelectedValuePath = "Key" }; break;
                    case FieldKind.Multiline: control = new TextBox { AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, MinHeight = 60, VerticalScrollBarVisibility = ScrollBarVisibility.Auto }; break;
                    default: control = new TextBox(); break;
                }
                if (field.Kind != FieldKind.Check)
                {
                    _form.Children.Add(new TextBlock { Text = field.Label + (string.IsNullOrEmpty(field.Hint) ? string.Empty : "  (" + field.Hint + ")"), Margin = new Thickness(0, 8, 0, 2), Foreground = Ui.Muted, FontSize = 11 });
                }
                _form.Children.Add(control);
                _controls[field] = control;
            }
            _form.Children.Add(new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 14, 0, 0), Children = { _saveButton } });
        }

        public void Reload()
        {
            _status.Text = "Chargement…";
            Ui.Run(Dispatcher, () =>
            {
                if (Prepare != null) Prepare();
                return Load();
            }, items =>
            {
                _items = items;
                RefreshOptions();
                var rows = items.Select(item => (object)Columns.Select(c => c.Get(item)).ToArray()).ToList();
                _list.ItemsSource = rows;
                _status.Text = items.Count + " élément(s).";
                var keep = _current;
                Select(null);
                if (keep != null) { }
            }, error => _status.Text = "Erreur : " + error);
        }

        private void RefreshOptions()
        {
            foreach (var pair in _controls)
            {
                var combo = pair.Value as ComboBox;
                if (combo == null) continue;
                var previous = combo.SelectedValue as string;
                var options = new List<KeyValuePair<string, string>>();
                options.Add(new KeyValuePair<string, string>(string.Empty, "—"));
                options.AddRange(pair.Key.Options);
                combo.ItemsSource = options;
                combo.SelectedValue = previous ?? string.Empty;
            }
        }

        public void Select(object item)
        {
            _list.SelectedIndex = -1;
            if (item != null) { var index = _items.IndexOf(item); if (index >= 0) _list.SelectedIndex = index; }
            FillForm(item);
        }

        private void FillForm(object item)
        {
            _current = item;
            _deleteButton.IsEnabled = item != null && Remove != null;
            foreach (var pair in _controls)
            {
                var field = pair.Key;
                var control = pair.Value;
                var value = item == null ? null : Json.Get(item, field.Key);
                control.IsEnabled = !(field.ReadOnly && item != null);
                var check = control as CheckBox;
                var combo = control as ComboBox;
                var box = control as TextBox;
                if (check != null) check.IsChecked = value is bool && (bool)value;
                else if (combo != null) combo.SelectedValue = value == null ? string.Empty : Json.Str(item, field.Key);
                else if (field.Kind == FieldKind.DateTime) box.Text = FormatDate(Json.Str(item, field.Key));
                else box.Text = item == null ? string.Empty : Json.Str(item, field.Key);
            }
            if (Describe != null) _status.Text = item == null ? "Nouvel élément." : Describe(item);
        }

        public static string FormatDate(string iso)
        {
            DateTime parsed;
            if (string.IsNullOrEmpty(iso) || !DateTime.TryParse(iso, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out parsed)) return string.Empty;
            return parsed.ToLocalTime().ToString(DateFormat, French);
        }

        public static string ToIso(string local)
        {
            DateTime parsed;
            if (string.IsNullOrWhiteSpace(local)) return null;
            if (!DateTime.TryParseExact(local.Trim(), DateFormat, French, DateTimeStyles.None, out parsed))
                throw new FormatException("Date invalide : « " + local + " » (format attendu : jj/MM/aaaa HH:mm).");
            return parsed.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss.000'Z'", CultureInfo.InvariantCulture);
        }

        private Dictionary<string, object> Collect()
        {
            var values = new Dictionary<string, object>();
            foreach (var pair in _controls)
            {
                var field = pair.Key;
                var control = pair.Value;
                var check = control as CheckBox;
                var combo = control as ComboBox;
                var box = control as TextBox;
                object value;
                if (check != null) value = check.IsChecked == true;
                else if (combo != null) value = combo.SelectedValue as string ?? string.Empty;
                else
                {
                    var text = box.Text.Trim();
                    if (field.Kind == FieldKind.Number)
                    {
                        double number;
                        if (text.Length == 0) value = null;
                        else if (double.TryParse(text.Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out number)) value = number;
                        else throw new FormatException(field.Label + " : nombre invalide.");
                    }
                    else if (field.Kind == FieldKind.DateTime) value = ToIso(text);
                    else value = text;
                }
                values[field.Key] = value;
            }
            return values;
        }

        private void SaveCurrent()
        {
            if (Save == null) return;
            Dictionary<string, object> values;
            try { values = Collect(); }
            catch (Exception exception) { Ui.Error(exception.Message); return; }
            var existing = _current;
            _saveButton.IsEnabled = false;
            _status.Text = "Enregistrement…";
            Ui.Run(Dispatcher, () => Save(values, existing), result =>
            {
                _saveButton.IsEnabled = true;
                Reload();
            }, error =>
            {
                _saveButton.IsEnabled = true;
                _status.Text = "Échec : " + error;
                Ui.Error(error);
            });
        }

        private void DeleteCurrent()
        {
            if (_current == null || Remove == null) return;
            if (!Ui.Confirm("Supprimer cet élément ?")) return;
            var target = _current;
            Ui.Run(Dispatcher, () => Remove(target), result => Reload(), error => Ui.Error(error));
        }
    }
}
