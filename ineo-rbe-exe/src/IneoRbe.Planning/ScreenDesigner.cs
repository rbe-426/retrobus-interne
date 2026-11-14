using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Planning
{
    // Éditeur de disposition des écrans TFT : le gabarit (image de fond) est affiché tel quel et chaque information
    // (ligne, destination, heure, arrêt, diapositive, texte libre) se déplace, se redimensionne et se met en forme.
    public sealed class ScreenDesigner : Window
    {
        private const int GridStep = 4;
        private const double HandleSize = 12;

        private static readonly KeyValuePair<string, string>[] Kinds =
        {
            new KeyValuePair<string, string>(ElementKind.Line, "Numéro de ligne"),
            new KeyValuePair<string, string>(ElementKind.Destination, "Destination (arrêt)"),
            new KeyValuePair<string, string>(ElementKind.DestinationCity, "Ville de destination"),
            new KeyValuePair<string, string>(ElementKind.Clock, "Heure"),
            new KeyValuePair<string, string>(ElementKind.Date, "Date"),
            new KeyValuePair<string, string>(ElementKind.NextStop, "Prochain arrêt"),
            new KeyValuePair<string, string>(ElementKind.Stops, "Liste d'arrêts"),
            new KeyValuePair<string, string>(ElementKind.Delay, "Délai d'arrivée"),
            new KeyValuePair<string, string>(ElementKind.Slide, "Contenu de la diapositive"),
            new KeyValuePair<string, string>(ElementKind.Text, "Texte libre"),
            new KeyValuePair<string, string>(ElementKind.Band, "Bandeau / fond coloré"),
            new KeyValuePair<string, string>(ElementKind.ShapeLine, "Forme : ligne droite"),
            new KeyValuePair<string, string>(ElementKind.ShapeArrow, "Forme : flèche"),
            new KeyValuePair<string, string>(ElementKind.ShapeRect, "Forme : rectangle"),
            new KeyValuePair<string, string>(ElementKind.ShapeEllipse, "Forme : cercle / ellipse"),
        };

        private static readonly string[][] SampleStops =
        {
            new[] { "Évry", "Place de la Mairie", "2 min", "1" }, new[] { "Évry", "Rue Victor Hugo", "4 min", "0" }, new[] { "Courcouronnes", "Gare d'Évry", "7 min", "1" },
            new[] { "Corbeil-Essonnes", "Hôpital", "11 min", "1" }, new[] { "Corbeil-Essonnes", "Centre commercial", "15 min", "1" }, new[] { "Saint-Germain", "Lycée", "19 min", "0" },
        };

        private static readonly string[] FontNames =
        {
            "Segoe UI", "Arial", "Arial Narrow", "Arial Black", "Verdana", "Tahoma", "Calibri", "Trebuchet MS",
            "Georgia", "Times New Roman", "Consolas", "Courier New", "Impact", "Lucida Console",
        };

        private static readonly string[][] HandleModes =
        {
            new[] { "nw", "0", "0" }, new[] { "n", "0.5", "0" }, new[] { "ne", "1", "0" }, new[] { "e", "1", "0.5" },
            new[] { "se", "1", "1" }, new[] { "s", "0.5", "1" }, new[] { "sw", "0", "1" }, new[] { "w", "0", "0.5" },
        };

        private readonly ScreenNorm _screens;
        private readonly List<ScreenElement> _elements;
        private readonly Canvas _canvas = new Canvas { ClipToBounds = true, Focusable = true };
        private readonly Dictionary<ScreenElement, Border> _views = new Dictionary<ScreenElement, Border>();
        private readonly List<Rectangle> _handles = new List<Rectangle>();
        private readonly ListBox _list = new ListBox { MinHeight = 110, MaxHeight = 170 };
        private readonly ComboBox _newKind = new ComboBox { DisplayMemberPath = "Value", SelectedValuePath = "Key", ItemsSource = Kinds, SelectedIndex = 0 };
        private readonly SlideNorm _slide;
        private readonly TextBlock _baseInfo = Ui.Text(string.Empty, 11, false, Ui.Muted);
        private readonly TextBox _sampleLine = new TextBox();
        private readonly TextBox _format = new TextBox();
        private readonly TextBox _thickness = new TextBox();
        private readonly TextBox _rotation = new TextBox();
        private readonly TextBox _rows = new TextBox();
        private readonly ComboBox _fillMode = new ComboBox
        {
            DisplayMemberPath = "Value",
            SelectedValuePath = "Key",
            ItemsSource = new[] { new KeyValuePair<string, string>("SOLID", "Plein"), new KeyValuePair<string, string>("NONE", "Vide (contour seul)"), new KeyValuePair<string, string>("GRADIENT", "Dégradé") },
        };
        private readonly TextBox _color2 = new TextBox();
        private readonly TextBox _gradientAngle = new TextBox();
        private readonly TextBox _strokeColor = new TextBox();
        private readonly TextBox _strokeWidth = new TextBox();
        private readonly TextBox _manual = new TextBox { AcceptsReturn = true, Height = 90, TextWrapping = TextWrapping.NoWrap, VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
        private readonly CheckBox _nearEnd = new CheckBox { Content = "Aperçu : terminus proche (3 arrêts max)" };
        private readonly StackPanel _areaForm = new StackPanel();
        private readonly StackPanel _stopsForm = new StackPanel();
        private readonly ComboBox _arrow = new ComboBox
        {
            DisplayMemberPath = "Value",
            SelectedValuePath = "Key",
            ItemsSource = new[] { new KeyValuePair<string, string>("POINTED", "Flèche droite (pointe pleine)"), new KeyValuePair<string, string>("CUT", "Flèche coupée") },
        };
        private readonly CheckBox _showDelay = new CheckBox { Content = "Afficher le délai d'arrivée" };
        private readonly CheckBox _mainOnly = new CheckBox { Content = "Arrêts principaux seulement" };
        private readonly CheckBox _colorLine = new CheckBox { Content = "Couleur du texte / de la forme = couleur de la ligne en cours" };
        private readonly CheckBox _backgroundLine = new CheckBox { Content = "Fond = couleur de la ligne en cours" };
        private readonly StackPanel _form = new StackPanel();
        private readonly TextBlock _kindName = Ui.Text(string.Empty, 12, true);
        private readonly TextBox _label = new TextBox();
        private readonly TextBox _text = new TextBox { AcceptsReturn = true, Height = 44, TextWrapping = TextWrapping.Wrap };
        private readonly TextBox _x = new TextBox();
        private readonly TextBox _y = new TextBox();
        private readonly TextBox _w = new TextBox();
        private readonly TextBox _h = new TextBox();
        private readonly ComboBox _font = new ComboBox { IsEditable = true };
        private readonly TextBox _size = new TextBox();
        private readonly CheckBox _bold = new CheckBox { Content = "Gras" };
        private readonly CheckBox _italic = new CheckBox { Content = "Italique" };
        private readonly CheckBox _underline = new CheckBox { Content = "Souligné" };
        private readonly ComboBox _align = new ComboBox
        {
            DisplayMemberPath = "Value",
            SelectedValuePath = "Key",
            ItemsSource = new[] { new KeyValuePair<string, string>("LEFT", "Gauche"), new KeyValuePair<string, string>("CENTER", "Centré"), new KeyValuePair<string, string>("RIGHT", "Droite") },
        };
        private readonly TextBox _color = new TextBox();
        private readonly TextBox _background = new TextBox();

        private ScreenElement _selected;
        private bool _loading;
        private string _mode;
        private Point _start;
        private int _ox, _oy, _ow, _oh;

        public ScreenDesigner(ScreenNorm screens, SlideNorm slide)
        {
            _screens = screens;
            _slide = slide;
            _elements = slide.Elements.Select(e => e.Copy()).ToList();
            Title = "Éditeur de disposition — " + (string.IsNullOrEmpty(slide.Name) ? SlideTypeName(slide.Type) : slide.Name);
            Width = 1240;
            Height = 780;
            WindowStartupLocation = WindowStartupLocation.CenterOwner;
            Background = Ui.Panel;

            var root = new DockPanel { Margin = new Thickness(10) };

            var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 8, 0, 0) };
            buttons.Children.Add(Ui.Button("Annuler", (s, e) => { DialogResult = false; }));
            buttons.Children.Add(Ui.Button("Enregistrer la disposition", (s, e) => Save(), true));
            DockPanel.SetDock(buttons, Dock.Bottom);
            root.Children.Add(buttons);

            var side = new ScrollViewer { Width = 360, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Margin = new Thickness(10, 0, 0, 0) };
            DockPanel.SetDock(side, Dock.Right);
            var panel = new StackPanel();
            side.Content = panel;
            root.Children.Add(side);

            panel.Children.Add(Ui.Text("Éléments de l'écran", 13, true));
            panel.Children.Add(_list);
            panel.Children.Add(Ui.Toolbar(_newKind, Ui.Button("Ajouter", (s, e) => AddElement())));
            panel.Children.Add(Ui.Toolbar(
                Ui.Button("Dupliquer", (s, e) => Duplicate()),
                Ui.Button("Supprimer", (s, e) => Remove()),
                Ui.Button("▲", (s, e) => Reorder(1)),
                Ui.Button("▼", (s, e) => Reorder(-1)),
                Ui.Button("Disposition standard", (s, e) => ResetAll())));
            panel.Children.Add(Ui.Toolbar(Ui.Button("Gabarit de cette diapositive…", (s, e) => ChooseBase()), Ui.Button("Retirer", (s, e) => ClearBase())));
            panel.Children.Add(_baseInfo);
            panel.Children.Add(Field("Couleur de ligne d'exemple (aperçu, #RRGGBB)", _sampleLine));
            _sampleLine.Text = _screens.BandColor;

            _form.Children.Add(_kindName);
            _form.Children.Add(Field("Libellé affiché avant la valeur", _label));
            _form.Children.Add(Field("Texte (texte libre)", _text));
            var pos = new UniformGrid { Columns = 4 };
            pos.Children.Add(Field("X", _x));
            pos.Children.Add(Field("Y", _y));
            pos.Children.Add(Field("Largeur", _w));
            pos.Children.Add(Field("Hauteur", _h));
            _form.Children.Add(pos);
            _font.ItemsSource = FontNames.Where(n => Fonts.SystemFontFamilies.Any(f => string.Equals(f.Source, n, StringComparison.OrdinalIgnoreCase))).ToList();
            var fontRow = new Grid();
            fontRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(2, GridUnitType.Star) });
            fontRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            var fontField = Field("Police", _font);
            var sizeField = Field("Taille", _size);
            Grid.SetColumn(sizeField, 1);
            fontRow.Children.Add(fontField);
            fontRow.Children.Add(sizeField);
            _form.Children.Add(fontRow);
            var style = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 8) };
            _bold.Margin = _italic.Margin = _underline.Margin = new Thickness(0, 0, 14, 0);
            style.Children.Add(_bold);
            style.Children.Add(_italic);
            style.Children.Add(_underline);
            _form.Children.Add(style);
            _form.Children.Add(Field("Alignement", _align));
            _form.Children.Add(Field("Couleur du texte / de la forme (#RRGGBB, vide = automatique)", _color));
            _form.Children.Add(Ui.Toolbar(Ui.Button("Palette texte…", (s, e) => Pick(_color)), Ui.Button("Auto", (s, e) => _color.Text = string.Empty)));
            _form.Children.Add(_colorLine);
            _form.Children.Add(Field("Fond (#RRGGBB, vide = transparent)", _background));
            _form.Children.Add(Ui.Toolbar(Ui.Button("Palette fond…", (s, e) => Pick(_background)), Ui.Button("Aucun", (s, e) => _background.Text = string.Empty)));
            _form.Children.Add(_backgroundLine);
            _form.Children.Add(Field("Format de date / heure (ex. dd/MM/yyyy, dddd d MMMM, HH:mm)", _format));
            var shape = new UniformGrid { Columns = 2 };
            shape.Children.Add(Field("Épaisseur du trait", _thickness));
            shape.Children.Add(Field("Rotation (°)", _rotation));
            _form.Children.Add(shape);
            _form.Children.Add(Field("Type de flèche", _arrow));
            _areaForm.Children.Add(Field("Remplissage", _fillMode));
            _areaForm.Children.Add(Field("Couleur de fin du dégradé (#RRGGBB ou LINE)", _color2));
            var gradient = new UniformGrid { Columns = 2 };
            gradient.Children.Add(Field("Angle du dégradé (°)", _gradientAngle));
            gradient.Children.Add(Field("Épaisseur du contour", _strokeWidth));
            _areaForm.Children.Add(gradient);
            _areaForm.Children.Add(Field("Contour (#RRGGBB ou LINE, vide = aucun)", _strokeColor));
            _form.Children.Add(_areaForm);
            _stopsForm.Children.Add(Field("Nombre d'arrêts affichés (4 max, 3 si le terminus est proche)", _rows));
            _stopsForm.Children.Add(_showDelay);
            _stopsForm.Children.Add(_mainOnly);
            _stopsForm.Children.Add(_nearEnd);
            _stopsForm.Children.Add(Field("Saisie manuelle si dépassement (une ligne « VILLE - Arrêt » par arrêt, vide = automatique)", _manual));
            _form.Children.Add(_stopsForm);
            panel.Children.Add(_form);
            panel.Children.Add(Ui.Text("Glisser pour déplacer, poignées pour redimensionner, flèches pour décaler (Maj = 10), Suppr pour supprimer. L'image de fond est le gabarit choisi dans les normes ; le bandeau prend la couleur de la ligne si l'option est cochée.", 11, false, Ui.Muted));
            ((TextBlock)panel.Children[panel.Children.Count - 1]).TextWrapping = TextWrapping.Wrap;

            _canvas.Width = _screens.Width;
            _canvas.Height = _screens.Height;
            var view = new Viewbox { Stretch = Stretch.Uniform, Child = _canvas };
            root.Children.Add(new Border { Background = new SolidColorBrush(Color.FromRgb(0x33, 0x41, 0x55)), Padding = new Thickness(10), Child = view });

            Content = root;

            _canvas.MouseLeftButtonDown += (s, e) => { _canvas.Focus(); Select(null); };
            _list.SelectionChanged += (s, e) =>
            {
                if (_loading) return;
                var i = _list.SelectedIndex;
                Select(i >= 0 ? _elements[_elements.Count - 1 - i] : null, false);
            };
            _sampleLine.TextChanged += (s, e) => RefreshAll();
            foreach (var box in new[] { _label, _text, _x, _y, _w, _h,             _size, _color, _background, _format, _thickness, _rotation, _rows, _color2, _gradientAngle, _strokeColor, _strokeWidth, _manual }) box.TextChanged += (s, e) => ApplyFields();
                        _fillMode.SelectionChanged += (s, e) => ApplyFields();
            _arrow.SelectionChanged += (s, e) => ApplyFields();
                        foreach (var box in new[] { _showDelay, _mainOnly, _nearEnd }) box.Click += (s, e) => ApplyFields();
            _colorLine.Click += (s, e) => _color.Text = _colorLine.IsChecked == true ? "LINE" : string.Empty;
            _backgroundLine.Click += (s, e) => _background.Text = _backgroundLine.IsChecked == true ? "LINE" : string.Empty;
            _font.AddHandler(System.Windows.Controls.Primitives.TextBoxBase.TextChangedEvent, new TextChangedEventHandler((s, e) => ApplyFields()));
            _font.SelectionChanged += (s, e) => ApplyFields();
            _align.SelectionChanged += (s, e) => ApplyFields();
            foreach (var box in new[] { _bold, _italic, _underline }) box.Click += (s, e) => ApplyFields();
            PreviewKeyDown += OnKey;

            RebuildCanvas();
            RefreshList();
            Select(_elements.Count > 0 ? _elements[_elements.Count - 1] : null);
        }

        private static StackPanel Field(string label, UIElement control)
        {
            var panel = new StackPanel { Margin = new Thickness(0, 0, 8, 6) };
            panel.Children.Add(Ui.Text(label, 11, true, Ui.Muted));
            panel.Children.Add(control);
            return panel;
        }

        private static int ParseInt(string text, int fallback)
        {
            int value;
            return int.TryParse((text ?? string.Empty).Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out value) ? value : fallback;
        }

        private static string Int(int value) { return value.ToString(CultureInfo.InvariantCulture); }

        private static string KindName(string kind)
        {
            foreach (var item in Kinds) if (item.Key == kind) return item.Value;
            return kind;
        }

        private static string SlideTypeName(string type)
        {
            switch (type)
            {
                case SlideType.Cover: return "Page de garde";
                case SlideType.NextStops: return "Prochains arrêts";
                case SlideType.MainStops: return "Arrêts principaux et délai";
                case SlideType.NextStop: return "Prochain arrêt";
                case SlideType.Correspondences: return "Correspondances";
                case SlideType.Destination: return "Destination";
                case SlideType.Clock: return "Heure";
                default: return "Message libre";
            }
        }

        private void Save()
        {
            _slide.Elements = _elements;
            _slide.Customized = true;
            DialogResult = true;
        }

        private void ChooseBase()
        {
            var dialog = new Microsoft.Win32.OpenFileDialog { Filter = "Images (*.png;*.jpg;*.jpeg;*.bmp;*.gif)|*.png;*.jpg;*.jpeg;*.bmp;*.gif" };
            if (dialog.ShowDialog() != true) return;
            try
            {
                _slide.BaseImage = SaeivStore.Import(dialog.FileName, SaeivStore.ScreensFolder, SaeivStore.ImageExtensions, SaeivStore.MaxImageBytes);
                _slide.BaseName = System.IO.Path.GetFileName(dialog.FileName);
                RebuildCanvas();
            }
            catch (Exception exception) { Ui.Error(exception.Message); }
        }

        private void ClearBase()
        {
            _slide.BaseImage = string.Empty;
            _slide.BaseName = string.Empty;
            RebuildCanvas();
        }

        private void Pick(TextBox target)
        {
            var dialog = new System.Windows.Forms.ColorDialog { FullOpen = true, AnyColor = true };
            var current = ColorBrushConverter.Parse(target.Text);
            if (current.HasValue) dialog.Color = System.Drawing.Color.FromArgb(current.Value.R, current.Value.G, current.Value.B);
            if (dialog.ShowDialog() != System.Windows.Forms.DialogResult.OK) return;
            target.Text = string.Format("#{0:X2}{1:X2}{2:X2}", dialog.Color.R, dialog.Color.G, dialog.Color.B);
        }

        // ---- Éléments ----

        private void AddElement()
        {
            var kind = _newKind.SelectedValue as string ?? ElementKind.Text;
            var element = new ScreenElement { Kind = kind, X = 40, Y = 120 };
            switch (kind)
            {
                case ElementKind.Line: element.W = 96; element.H = 56; element.FontSize = 36; element.Bold = true; element.Align = "CENTER"; break;
                case ElementKind.Clock: element.W = 152; element.H = 56; element.FontSize = 28; element.Align = "RIGHT"; break;
                case ElementKind.Date: element.W = 300; element.H = 56; element.FontSize = 28; break;
                case ElementKind.Delay: element.W = 160; element.H = 56; element.FontSize = 32; element.Bold = true; element.Label = "Dans "; break;
                case ElementKind.Stops: element.W = 700; element.H = 300; element.FontSize = 32; element.Rows = ElementKind.MaxStops; break;
                case ElementKind.ShapeEllipse: element.W = 120; element.H = 120; element.Color = "LINE"; break;
                case ElementKind.ShapeLine: element.W = 300; element.H = 12; element.Thickness = 6; element.Color = "LINE"; break;
                case ElementKind.ShapeArrow: element.W = 160; element.H = 48; element.Thickness = 12; element.Color = "LINE"; break;
                case ElementKind.ShapeRect: element.W = 160; element.H = 100; element.Color = "LINE"; break;
                case ElementKind.NextStop: element.Label = "Prochain arrêt : "; element.W = 560; element.H = 56; element.FontSize = 30; break;
                case ElementKind.Slide: element.W = 600; element.H = 200; element.FontSize = 40; element.Align = "CENTER"; break;
                case ElementKind.Band: element.W = 800; element.H = 72; element.X = 0; element.Y = 0; break;
                case ElementKind.Text: element.Text = "Texte"; break;
                case ElementKind.DestinationCity: element.W = 400; element.H = 48; element.FontSize = 26; break;
            }
            _elements.Add(element);
            RebuildCanvas();
            RefreshList();
            Select(element);
        }

        private void Duplicate()
        {
            if (_selected == null) return;
            var copy = _selected.Copy();
            copy.Id = Guid.NewGuid().ToString("N");
            copy.X += 16;
            copy.Y += 16;
            _elements.Add(copy);
            RebuildCanvas();
            RefreshList();
            Select(copy);
        }

        private void Remove()
        {
            if (_selected == null) return;
            _elements.Remove(_selected);
            RebuildCanvas();
            RefreshList();
            Select(null);
        }

        // delta > 0 : vers l'avant (dessiné plus tard).
        private void Reorder(int delta)
        {
            if (_selected == null) return;
            var index = _elements.IndexOf(_selected);
            var target = index + delta;
            if (target < 0 || target >= _elements.Count) return;
            _elements.RemoveAt(index);
            _elements.Insert(target, _selected);
            RebuildCanvas();
            RefreshList();
            Select(_selected);
        }

        private void ResetAll()
        {
            if (!Ui.Confirm("Remplacer la disposition par la disposition standard ?")) return;
            _elements.Clear();
            _elements.AddRange(ScreenNorm.DefaultElements(_slide.Type));
            RebuildCanvas();
            RefreshList();
            Select(null);
        }

        private string Describe(ScreenElement element)
        {
            var extra = element.Kind == ElementKind.Text ? element.Text : element.Label;
            extra = (extra ?? string.Empty).Replace("\r", " ").Replace("\n", " ").Trim();
            return KindName(element.Kind) + (extra.Length > 0 ? " — " + extra : string.Empty);
        }

        // La liste montre le premier plan en haut.
        private void RefreshList()
        {
            _loading = true;
            _list.Items.Clear();
            for (var i = _elements.Count - 1; i >= 0; i--) _list.Items.Add(Describe(_elements[i]));
            if (_selected != null)
            {
                var index = _elements.IndexOf(_selected);
                if (index >= 0) _list.SelectedIndex = _elements.Count - 1 - index;
            }
            _loading = false;
        }

        private void Select(ScreenElement element, bool updateList = true)
        {
            _selected = element;
            _loading = true;
            _form.IsEnabled = element != null;
            if (element != null)
            {
                _kindName.Text = KindName(element.Kind);
                _label.Text = element.Label ?? string.Empty;
                _text.Text = element.Text ?? string.Empty;
                _text.IsEnabled = element.Kind == ElementKind.Text;
                var shapeKind = ElementKind.IsShape(element.Kind);
                _label.IsEnabled = element.Kind != ElementKind.Text && element.Kind != ElementKind.Band && !shapeKind;
                _format.IsEnabled = element.Kind == ElementKind.Date || element.Kind == ElementKind.Clock;
                _format.Text = element.Format ?? string.Empty;
                _thickness.IsEnabled = element.Kind == ElementKind.ShapeLine || element.Kind == ElementKind.ShapeArrow;
                _thickness.Text = Int(element.Thickness);
                _rotation.IsEnabled = shapeKind;
                _rotation.Text = Int(element.Rotation);
                _arrow.IsEnabled = element.Kind == ElementKind.ShapeArrow;
                _arrow.SelectedValue = element.ArrowStyle == "CUT" ? "CUT" : "POINTED";
                _rows.IsEnabled = element.Kind == ElementKind.Stops;
                _rows.Text = Int(element.Rows);
                _areaForm.Visibility = ElementKind.IsArea(element.Kind) ? Visibility.Visible : Visibility.Collapsed;
                _stopsForm.Visibility = element.Kind == ElementKind.Stops ? Visibility.Visible : Visibility.Collapsed;
                _fillMode.SelectedValue = element.FillMode ?? "SOLID";
                _color2.Text = element.Color2 ?? string.Empty;
                _gradientAngle.Text = Int(element.GradientAngle);
                _strokeColor.Text = element.StrokeColor ?? string.Empty;
                _strokeWidth.Text = Int(element.StrokeWidth);
                _manual.Text = element.ManualStops ?? string.Empty;
                _showDelay.IsEnabled = _mainOnly.IsEnabled = element.Kind == ElementKind.Stops;
                _showDelay.IsChecked = element.ShowDelay;
                _mainOnly.IsChecked = element.MainOnly;
                _colorLine.IsChecked = element.Color == "LINE";
                _backgroundLine.IsChecked = element.Background == "LINE";
                _x.Text = Int(element.X);
                _y.Text = Int(element.Y);
                _w.Text = Int(element.W);
                _h.Text = Int(element.H);
                _font.Text = element.FontFamily ?? "Segoe UI";
                _size.Text = Int(element.FontSize);
                _bold.IsChecked = element.Bold;
                _italic.IsChecked = element.Italic;
                _underline.IsChecked = element.Underline;
                _align.SelectedValue = element.Align ?? "LEFT";
                _color.Text = element.Color ?? string.Empty;
                _background.Text = element.Background ?? string.Empty;
            }
            else
            {
                _kindName.Text = "Aucun élément sélectionné";
            }
            _loading = false;
            if (updateList) RefreshList();
            PositionHandles();
        }

        private void ApplyFields()
        {
            if (_loading || _selected == null) return;
            var el = _selected;
            el.Label = _label.Text;
            el.Text = _text.Text;
            el.X = ParseInt(_x.Text, el.X);
            el.Y = ParseInt(_y.Text, el.Y);
            el.W = Math.Max(8, ParseInt(_w.Text, el.W));
            el.H = Math.Max(8, ParseInt(_h.Text, el.H));
            el.FontFamily = string.IsNullOrWhiteSpace(_font.Text) ? "Segoe UI" : _font.Text.Trim();
            el.FontSize = Math.Max(6, Math.Min(300, ParseInt(_size.Text, el.FontSize)));
            el.Bold = _bold.IsChecked == true;
            el.Italic = _italic.IsChecked == true;
            el.Underline = _underline.IsChecked == true;
            el.Align = _align.SelectedValue as string ?? "LEFT";
            el.Color = _color.Text.Trim();
            el.Background = _background.Text.Trim();
            el.Format = _format.Text.Trim();
            el.Thickness = Math.Max(1, Math.Min(400, ParseInt(_thickness.Text, el.Thickness)));
            el.Rotation = ((ParseInt(_rotation.Text, el.Rotation) % 360) + 360) % 360;
            el.ArrowStyle = _arrow.SelectedValue as string == "CUT" ? "CUT" : "POINTED";
            el.Rows = Math.Max(1, Math.Min(ElementKind.MaxStops, ParseInt(_rows.Text, el.Rows)));
            el.FillMode = _fillMode.SelectedValue as string ?? "SOLID";
            el.Color2 = _color2.Text.Trim();
            el.GradientAngle = ((ParseInt(_gradientAngle.Text, el.GradientAngle) % 360) + 360) % 360;
            el.StrokeColor = _strokeColor.Text.Trim();
            el.StrokeWidth = Math.Max(1, Math.Min(100, ParseInt(_strokeWidth.Text, el.StrokeWidth)));
            el.ManualStops = _manual.Text;
            el.ShowDelay = _showDelay.IsChecked == true;
            el.MainOnly = _mainOnly.IsChecked == true;
            _loading = true;
            _colorLine.IsChecked = el.Color == "LINE";
            _backgroundLine.IsChecked = el.Background == "LINE";
            _loading = false;
            RefreshAll();
            var index = _elements.IndexOf(el);
            if (index >= 0 && _list.Items.Count > _elements.Count - 1 - index)
            {
                _loading = true;
                _list.Items[_elements.Count - 1 - index] = Describe(el);
                _list.SelectedIndex = _elements.Count - 1 - index;
                _loading = false;
            }
        }

        // ---- Dessin ----

        private Color BaseColor()
        {
            return ColorBrushConverter.Parse(string.IsNullOrEmpty(_slide.BaseColor) ? _screens.BaseColor : _slide.BaseColor) ?? Colors.Black;
        }

        // Couleur de la ligne en cours (valeur d'exemple pour l'aperçu).
        private Color LineColor() { return ColorBrushConverter.Parse(_sampleLine.Text) ?? ColorBrushConverter.Parse(_screens.BandColor) ?? Colors.DarkRed; }

        private Color? Resolve(string value)
        {
            if (value == "LINE") return LineColor();
            return ColorBrushConverter.Parse(value);
        }

        private Color BandFill(ScreenElement band)
        {
            var own = Resolve(band.Background);
            if (own.HasValue) return own.Value;
            return _screens.LineColorBand ? LineColor() : BaseColor();
        }

        // Couleur du fond situé sous un élément : son propre fond, un bandeau qui le recouvre, sinon le fond de l'écran.
        private Color UnderColor(ScreenElement element)
        {
            var own = Resolve(element.Background);
            if (own.HasValue) return own.Value;
            var cx = element.X + element.W / 2;
            var cy = element.Y + element.H / 2;
            for (var i = _elements.Count - 1; i >= 0; i--)
            {
                var other = _elements[i];
                if (other == element || other.Kind != ElementKind.Band) continue;
                if (cx >= other.X && cx <= other.X + other.W && cy >= other.Y && cy <= other.Y + other.H) return BandFill(other);
            }
            return BaseColor();
        }

        private string SampleSlide()
        {
            switch (_slide.Type)
            {
                case SlideType.Correspondences: return "Correspondances : ligne 12, ligne 402";
                case SlideType.Destination: return "Direction Gare d'Évry";
                case SlideType.Clock: return DateTime.Now.ToString("HH:mm", CultureInfo.GetCultureInfo("fr-FR"));
                case SlideType.Message: return string.IsNullOrEmpty(_slide.Text) ? "Message libre d'exemple" : _slide.Text;
                default: return "Prochain arrêt : Place de la Mairie";
            }
        }

        private static string FormatNow(string format, string fallback)
        {
            var culture = CultureInfo.GetCultureInfo("fr-FR");
            try { return DateTime.Now.ToString(string.IsNullOrWhiteSpace(format) ? fallback : format, culture); }
            catch (FormatException) { return DateTime.Now.ToString(fallback, culture); }
        }

        // Lignes « VILLE - Arrêt » : saisie manuelle si renseignée, sinon arrêts d'exemple (4 max, 3 si le terminus est proche).
        private List<string[]> StopRows(ScreenElement element)
        {
            var max = Math.Max(1, Math.Min(element.Rows, _nearEnd.IsChecked == true ? ElementKind.MaxStopsNearTerminus : ElementKind.MaxStops));
            var rows = new List<string[]>();
            if (!string.IsNullOrWhiteSpace(element.ManualStops))
            {
                foreach (var raw in element.ManualStops.Replace("\r", string.Empty).Split('\n'))
                {
                    var line = raw.Trim();
                    if (line.Length == 0) continue;
                    var cut = line.IndexOf(" - ", StringComparison.Ordinal);
                    rows.Add(cut > 0 ? new[] { line.Substring(0, cut).Trim(), line.Substring(cut + 3).Trim(), string.Empty } : new[] { string.Empty, line, string.Empty });
                }
                return rows;
            }
            foreach (var stop in SampleStops)
            {
                if (element.MainOnly && stop[3] != "1") continue;
                rows.Add(new[] { stop[0], stop[1], element.ShowDelay ? stop[2] : string.Empty });
                if (rows.Count >= max) break;
            }
            return rows;
        }

        private void FillStops(TextBlock text, ScreenElement element)
        {
            text.Inlines.Clear();
            var first = true;
            foreach (var row in StopRows(element))
            {
                if (!first) text.Inlines.Add(new LineBreak());
                first = false;
                if (row[0].Length > 0) text.Inlines.Add(new Run(row[0].ToUpper(CultureInfo.GetCultureInfo("fr-FR")) + " - "));
                text.Inlines.Add(new Run(row[1]) { FontWeight = FontWeights.Bold });
                if (row[2].Length > 0) text.Inlines.Add(new Run("  —  " + row[2]));
            }
        }

        private string Value(ScreenElement element)
        {
            switch (element.Kind)
            {
                case ElementKind.Line: return "7";
                case ElementKind.Destination: return "Gare d'Évry";
                case ElementKind.DestinationCity: return "Courcouronnes";
                case ElementKind.Clock: return FormatNow(element.Format, "HH:mm");
                case ElementKind.Date: return FormatNow(element.Format, "dd/MM/yyyy");
                case ElementKind.NextStop: return "Place de la Mairie";
                case ElementKind.Stops: return string.Empty;
                case ElementKind.Delay: return "3 min";
                case ElementKind.Slide: return SampleSlide();
                case ElementKind.Text: return element.Text;
                default: return string.Empty;
            }
        }

        private void RebuildCanvas()
        {
            _canvas.Children.Clear();
            _views.Clear();
            _handles.Clear();
            _canvas.Background = new SolidColorBrush(BaseColor());
            var image = string.IsNullOrEmpty(_slide.BaseImage) ? _screens.BaseImage : _slide.BaseImage;
            _baseInfo.Text = string.IsNullOrEmpty(_slide.BaseImage)
                ? (string.IsNullOrEmpty(_screens.BaseImage) ? "Aucun gabarit : fond uni." : "Gabarit par défaut de la norme : " + _screens.BaseName)
                : "Gabarit de la diapositive : " + _slide.BaseName;
            if (!string.IsNullOrEmpty(image))
            {
                try
                {
                    var path = SaeivStore.ResolvePath(SaeivStore.ScreensFolder, image);
                    if (System.IO.File.Exists(path))
                    {
                        var bitmap = new BitmapImage();
                        bitmap.BeginInit();
                        bitmap.CacheOption = BitmapCacheOption.OnLoad;
                        bitmap.UriSource = new Uri(path);
                        bitmap.EndInit();
                        bitmap.Freeze();
                        _canvas.Children.Add(new Image { Source = bitmap, Stretch = Stretch.Fill, Width = _screens.Width, Height = _screens.Height, IsHitTestVisible = false });
                    }
                }
                catch (Exception) { }
            }
            foreach (var element in _elements)
            {
                var text = new TextBlock { TextWrapping = TextWrapping.Wrap, VerticalAlignment = VerticalAlignment.Center };
                var border = new Border { Child = text, Padding = new Thickness(4, 0, 4, 0), Cursor = Cursors.SizeAll, Tag = element, SnapsToDevicePixels = true };
                border.MouseLeftButtonDown += OnDown;
                border.MouseMove += OnMove;
                border.MouseLeftButtonUp += OnUp;
                _views[element] = border;
                _canvas.Children.Add(border);
            }
            foreach (var mode in HandleModes)
            {
                var handle = new Rectangle
                {
                    Width = HandleSize, Height = HandleSize, Fill = Brushes.White, Stroke = Brushes.DodgerBlue, StrokeThickness = 2,
                    Tag = mode, Visibility = Visibility.Collapsed, Cursor = HandleCursor(mode[0]),
                };
                handle.MouseLeftButtonDown += OnDown;
                handle.MouseMove += OnMove;
                handle.MouseLeftButtonUp += OnUp;
                _handles.Add(handle);
                _canvas.Children.Add(handle);
            }
            RefreshAll();
        }

        private static Cursor HandleCursor(string mode)
        {
            switch (mode)
            {
                case "nw": case "se": return Cursors.SizeNWSE;
                case "ne": case "sw": return Cursors.SizeNESW;
                case "n": case "s": return Cursors.SizeNS;
                default: return Cursors.SizeWE;
            }
        }

        private void RefreshAll()
        {
            foreach (var element in _elements) Refresh(element);
            PositionHandles();
        }

        private Brush ShapeBrush(ScreenElement el)
        {
            var color = Resolve(el.Color);
            return color.HasValue ? new SolidColorBrush(color.Value) : ColorBrushConverter.ForegroundFor(UnderColor(el));
        }

        private UIElement BuildShape(ScreenElement el)
        {
            var fill = ShapeBrush(el);
            double w = el.W, h = el.H;
            var host = new Canvas { Width = w, Height = h, RenderTransformOrigin = new Point(0.5, 0.5), IsHitTestVisible = false };
            if (el.Rotation != 0) host.RenderTransform = new RotateTransform(el.Rotation);
            var t = Math.Max(1, Math.Min(el.Thickness, h));
            if (ElementKind.IsArea(el.Kind))
            {
                Brush area;
                var mode = el.FillMode ?? "SOLID";
                if (mode == "NONE") area = Brushes.Transparent;
                else if (mode == "GRADIENT")
                {
                    var end = Resolve(el.Color2);
                    var start = Resolve(el.Color) ?? Colors.White;
                    var radians = el.GradientAngle * Math.PI / 180.0;
                    var dx = Math.Cos(radians) / 2; var dy = Math.Sin(radians) / 2;
                    area = new LinearGradientBrush(start, end ?? Colors.Black, new Point(0.5 - dx, 0.5 - dy), new Point(0.5 + dx, 0.5 + dy));
                }
                else area = fill;
                var stroke = Resolve(el.StrokeColor);
                var strokeWidth = stroke.HasValue ? Math.Min(el.StrokeWidth, Math.Min(w, h) / 2) : 0;
                if (mode == "NONE" && !stroke.HasValue) stroke = Resolve(el.Color) ?? LineColor();
                if (mode == "NONE") strokeWidth = Math.Min(Math.Max(1, el.StrokeWidth), Math.Min(w, h) / 2);
                var strokeBrush = stroke.HasValue ? (Brush)new SolidColorBrush(stroke.Value) : null;
                var inset = strokeWidth / 2;
                Shape shape = el.Kind == ElementKind.ShapeEllipse ? (Shape)new Ellipse() : new Rectangle();
                shape.Width = Math.Max(1, w - strokeWidth); shape.Height = Math.Max(1, h - strokeWidth);
                shape.Fill = area; shape.Stroke = strokeBrush; shape.StrokeThickness = strokeWidth;
                Canvas.SetLeft(shape, inset); Canvas.SetTop(shape, inset);
                host.Children.Add(shape);
            }
            else if (el.Kind == ElementKind.ShapeLine)
            {
                var line = new Rectangle { Width = w, Height = t, Fill = fill };
                Canvas.SetTop(line, (h - t) / 2);
                host.Children.Add(line);
            }
            else
            {
                var mid = h / 2;
                var head = Math.Min(h, w);
                var points = new PointCollection();
                if (el.ArrowStyle == "CUT")
                {
                    points.Add(new Point(0, mid - t / 2)); points.Add(new Point(w - head, mid - t / 2)); points.Add(new Point(w - head, 0));
                    points.Add(new Point(w, mid + t / 2)); points.Add(new Point(0, mid + t / 2));
                }
                else
                {
                    points.Add(new Point(0, mid - t / 2)); points.Add(new Point(w - head, mid - t / 2)); points.Add(new Point(w - head, 0));
                    points.Add(new Point(w, mid)); points.Add(new Point(w - head, h)); points.Add(new Point(w - head, mid + t / 2)); points.Add(new Point(0, mid + t / 2));
                }
                host.Children.Add(new Polygon { Points = points, Fill = fill });
            }
            return host;
        }

        private void Refresh(ScreenElement el)
        {
            Border border;
            if (!_views.TryGetValue(el, out border)) return;
            Canvas.SetLeft(border, el.X);
            Canvas.SetTop(border, el.Y);
            border.Width = el.W;
            border.Height = el.H;
            border.BorderBrush = el == _selected ? Brushes.DodgerBlue : new SolidColorBrush(Color.FromArgb(90, 148, 163, 184));
            border.BorderThickness = new Thickness(el == _selected ? 2 : 1);
            if (ElementKind.IsShape(el.Kind))
            {
                border.Padding = new Thickness(0);
                border.Background = Brushes.Transparent;
                border.Child = BuildShape(el);
                return;
            }
            border.Padding = new Thickness(4, 0, 4, 0);
            var text = border.Child as TextBlock;
            if (text == null)
            {
                text = new TextBlock { TextWrapping = TextWrapping.Wrap, VerticalAlignment = VerticalAlignment.Center };
                border.Child = text;
            }
            var under = UnderColor(el);
            if (el.Kind == ElementKind.Band) border.Background = new SolidColorBrush(BandFill(el));
            else
            {
                var own = Resolve(el.Background);
                border.Background = own.HasValue ? new SolidColorBrush(own.Value) : Brushes.Transparent;
            }
            var color = Resolve(el.Color);
            text.Foreground = color.HasValue ? new SolidColorBrush(color.Value)
                : (_screens.AdaptiveText ? ColorBrushConverter.ForegroundFor(under) : new SolidColorBrush(ColorBrushConverter.Parse(_screens.TextColor) ?? Colors.White));
            text.FontFamily = new FontFamily(string.IsNullOrWhiteSpace(el.FontFamily) ? "Segoe UI" : el.FontFamily);
            text.FontSize = Math.Max(6, el.FontSize);
            text.FontWeight = el.Bold ? FontWeights.Bold : FontWeights.Normal;
            text.FontStyle = el.Italic ? FontStyles.Italic : FontStyles.Normal;
            text.TextDecorations = el.Underline ? TextDecorations.Underline : null;
            text.TextAlignment = el.Align == "CENTER" ? TextAlignment.Center : el.Align == "RIGHT" ? TextAlignment.Right : TextAlignment.Left;
            if (el.Kind == ElementKind.Stops) { FillStops(text, el); return; }
            text.Text = el.Kind == ElementKind.Band ? string.Empty : (el.Kind == ElementKind.Text ? string.Empty : el.Label) + Value(el);
        }

        private void PositionHandles()
        {
            foreach (var element in _elements) Refresh(element);
            foreach (var handle in _handles)
            {
                if (_selected == null) { handle.Visibility = Visibility.Collapsed; continue; }
                var mode = (string[])handle.Tag;
                var fx = double.Parse(mode[1], CultureInfo.InvariantCulture);
                var fy = double.Parse(mode[2], CultureInfo.InvariantCulture);
                Canvas.SetLeft(handle, _selected.X + _selected.W * fx - HandleSize / 2);
                Canvas.SetTop(handle, _selected.Y + _selected.H * fy - HandleSize / 2);
                Panel.SetZIndex(handle, 1000);
                handle.Visibility = Visibility.Visible;
            }
        }

        // ---- Souris et clavier ----

        private void OnDown(object sender, MouseButtonEventArgs e)
        {
            var fe = (FrameworkElement)sender;
            var handle = fe.Tag as string[];
            if (handle != null) _mode = handle[0];
            else
            {
                var element = (ScreenElement)fe.Tag;
                if (element != _selected) Select(element);
                _mode = "move";
            }
            if (_selected == null) return;
            _canvas.Focus();
            _start = e.GetPosition(_canvas);
            _ox = _selected.X; _oy = _selected.Y; _ow = _selected.W; _oh = _selected.H;
            fe.CaptureMouse();
            e.Handled = true;
        }

        private static int Snap(double value) { return (int)Math.Round(value / GridStep) * GridStep; }

        private void OnMove(object sender, MouseEventArgs e)
        {
            if (_mode == null || _selected == null || e.LeftButton != MouseButtonState.Pressed) return;
            var p = e.GetPosition(_canvas);
            var dx = p.X - _start.X;
            var dy = p.Y - _start.Y;
            int x = _ox, y = _oy, w = _ow, h = _oh;
            const int min = 8;
            if (_mode == "move") { x = Snap(_ox + dx); y = Snap(_oy + dy); }
            else
            {
                if (_mode.Contains("e")) w = Math.Max(min, Snap(_ow + dx));
                if (_mode.Contains("s")) h = Math.Max(min, Snap(_oh + dy));
                if (_mode.Contains("w")) { var nx = Math.Min(Snap(_ox + dx), _ox + _ow - min); w = _ow + (_ox - nx); x = nx; }
                if (_mode.Contains("n")) { var ny = Math.Min(Snap(_oy + dy), _oy + _oh - min); h = _oh + (_oy - ny); y = ny; }
            }
            _selected.X = x; _selected.Y = y; _selected.W = w; _selected.H = h;
            PositionHandles();
            SyncPosition();
        }

        private void OnUp(object sender, MouseButtonEventArgs e)
        {
            _mode = null;
            ((FrameworkElement)sender).ReleaseMouseCapture();
        }

        private void SyncPosition()
        {
            _loading = true;
            _x.Text = Int(_selected.X);
            _y.Text = Int(_selected.Y);
            _w.Text = Int(_selected.W);
            _h.Text = Int(_selected.H);
            _loading = false;
        }

        private void OnKey(object sender, KeyEventArgs e)
        {
            if (Keyboard.FocusedElement is TextBox || Keyboard.FocusedElement is ComboBox || Keyboard.FocusedElement is ListBoxItem) return;
            if (_selected == null) return;
            var step = (Keyboard.Modifiers & ModifierKeys.Shift) != 0 ? 10 : 1;
            switch (e.Key)
            {
                case Key.Left: _selected.X -= step; break;
                case Key.Right: _selected.X += step; break;
                case Key.Up: _selected.Y -= step; break;
                case Key.Down: _selected.Y += step; break;
                case Key.Delete: Remove(); e.Handled = true; return;
                default: return;
            }
            e.Handled = true;
            PositionHandles();
            SyncPosition();
        }
    }
}
