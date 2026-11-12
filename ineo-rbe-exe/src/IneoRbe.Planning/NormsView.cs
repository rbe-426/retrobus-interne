using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Media;
using IneoRbe.Desktop.Services;
using Microsoft.Win32;

namespace IneoRbe.Planning
{
    // Onglet « Normes SAEIV » : voix embarquée (TTS) et écrans TFT normés (couleurs, zones fixes, diapositives).
    // La norme globale s'applique à tous les véhicules ; un véhicule peut avoir sa propre norme (surcharge).
    public sealed class NormsView : DockPanel
    {
        private static readonly KeyValuePair<string, string>[] SlideTypes =
        {
            new KeyValuePair<string, string>(SlideType.NextStop, "Prochain arrêt"),
            new KeyValuePair<string, string>(SlideType.Correspondences, "Correspondances"),
            new KeyValuePair<string, string>(SlideType.Destination, "Destination"),
            new KeyValuePair<string, string>(SlideType.Clock, "Heure"),
            new KeyValuePair<string, string>(SlideType.Message, "Message libre"),
        };

        private SaeivNorms _global = SaeivStore.LoadNorms();
        private SaeivConfig _vehicle;
        private SaeivNorms _norms;
        private bool _loading;

        private readonly CheckBox _override = new CheckBox { Margin = new Thickness(0, 4, 0, 0) };
        private readonly TextBlock _scope = Ui.Text(string.Empty, 11, false, Ui.Muted);

        private readonly CheckBox _ttsEnabled = new CheckBox { Content = "Voix embarquée active" };
        private readonly ComboBox _engine = new ComboBox { ItemsSource = new[] { "SAPI4", "SAPI5", "INFOVOX" } };
        private readonly ComboBox _voice = new ComboBox { IsEditable = true };
        private readonly TextBlock _voiceInfo = Ui.Text(string.Empty, 11, false, Ui.Muted);
        private readonly TextBox _rate = new TextBox();
        private readonly TextBox _volume = new TextBox();
        private readonly TextBox _preMeters = new TextBox();
        private readonly TextBox _textLine = new TextBox();
        private readonly TextBox _textNext = new TextBox();
        private readonly TextBox _textCorr = new TextBox();
        private readonly TextBox _textTerminus = new TextBox();
        private readonly TextBlock _ttsStatus = Ui.Text(string.Empty, 11, false, Ui.Muted);

        private readonly TextBox _baseColor = new TextBox();
        private readonly TextBox _textColor = new TextBox();
        private readonly TextBox _bandColor = new TextBox();
        private readonly CheckBox _lineBand = new CheckBox { Content = "Bandeau aux couleurs de la ligne" };
        private readonly CheckBox _adaptive = new CheckBox { Content = "Texte noir ou blanc selon le fond" };
        private readonly CheckBox _showLine = new CheckBox { Content = "Zone fixe : ligne" };
        private readonly CheckBox _showDestination = new CheckBox { Content = "Zone fixe : destination" };
        private readonly CheckBox _showClock = new CheckBox { Content = "Zone fixe : heure" };
        private readonly CheckBox _showNext = new CheckBox { Content = "Zone fixe : prochain arrêt" };
        private readonly ComboBox _fixedPosition = new ComboBox { DisplayMemberPath = "Value", SelectedValuePath = "Key", ItemsSource = new[] { new KeyValuePair<string, string>("TOP", "En haut"), new KeyValuePair<string, string>("BOTTOM", "En bas") } };
        private readonly TextBox _gap = new TextBox();
        private readonly TextBlock _baseName = Ui.Text(string.Empty, 12);

        private readonly ListBox _slides = new ListBox { MinHeight = 90 };
        private readonly ComboBox _slideType = new ComboBox { DisplayMemberPath = "Value", SelectedValuePath = "Key", ItemsSource = SlideTypes };
        private readonly TextBox _slideSeconds = new TextBox();
        private readonly TextBox _slideText = new TextBox();
        private readonly StackPanel _slideForm = new StackPanel();

        private readonly Border _previewBand = new Border { Padding = new Thickness(10, 6, 10, 6) };
        private readonly TextBlock _previewLine = new TextBlock { FontWeight = FontWeights.Bold, FontSize = 20, Margin = new Thickness(0, 0, 12, 0) };
        private readonly TextBlock _previewHeader = new TextBlock { FontSize = 16, VerticalAlignment = VerticalAlignment.Center };
        private readonly Border _previewBody = new Border { Padding = new Thickness(10), MinHeight = 90 };
        private readonly TextBlock _previewSlide = new TextBlock { FontSize = 18, TextWrapping = TextWrapping.Wrap };

        public NormsView()
        {
            Margin = new Thickness(0, 10, 0, 0);
            var top = new StackPanel();
            top.Children.Add(Ui.Text("Une norme globale s'applique à tous les véhicules. Cochez la case ci-dessous pour donner au véhicule sélectionné sa propre norme (copiée depuis la globale). La norme est jointe à chaque révision publiée.", 11, false, Ui.Muted));
            ((TextBlock)top.Children[0]).TextWrapping = TextWrapping.Wrap;
            _override.Content = "Surcharger la norme pour le véhicule sélectionné";
            top.Children.Add(_override);
            top.Children.Add(_scope);
            SetDock(top, Dock.Top);
            Children.Add(top);

            var grid = new Grid { Margin = new Thickness(0, 8, 0, 0) };
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            var left = new StackPanel { Margin = new Thickness(0, 0, 14, 0) };
            left.Children.Add(Ui.Text("Voix embarquée (annonces)", 13, true));
            left.Children.Add(_ttsEnabled);
            var engineRow = new UniformGrid { Columns = 2 };
            engineRow.Children.Add(Field("Moteur vocal", _engine));
            engineRow.Children.Add(Field("Vitesse (% – 50 à 150)", _rate));
            engineRow.Children.Add(Field("Volume (% – 0 à 100)", _volume));
            left.Children.Add(engineRow);
            left.Children.Add(Field("Voix (liste des voix installées sur ce PC ; vide = voix par défaut)", _voice));
            left.Children.Add(Ui.Toolbar(Ui.Button("Actualiser les voix", (s, e) => RefreshVoices()), _voiceInfo));
            left.Children.Add(Field("Pré-annonce : distance avant l'arrêt (m)", _preMeters));
            left.Children.Add(Ui.Text("Variables : {ligne} {destination} {arret} {correspondances}", 11, false, Ui.Muted));
            left.Children.Add(Field("Annonce de ligne", _textLine));
            left.Children.Add(Field("Prochain arrêt", _textNext));
            left.Children.Add(Field("Correspondances", _textCorr));
            left.Children.Add(Field("Terminus", _textTerminus));
            left.Children.Add(Ui.Toolbar(            Ui.Button("Tester la voix", (s, e) => TestVoice()), Ui.Button("Arrêter", (s, e) => { TtsEngine.Cancel(); _ttsStatus.Text = "  Lecture arrêtée."; }), Ui.Button("Voix installées…", (s, e) => ShowVoices()), _ttsStatus));
                        left.Children.Add(Ui.Text("SAPI4 utilise la voix choisie dans le panneau « Parole » de l'UC. INFOVOX (Acapela) est installé sur les UC par leur installateur : saisissez le nom de la voix (voir « Voix installées »).", 11, false, Ui.Muted));

            var right = new StackPanel();
            right.Children.Add(Ui.Text("Écrans TFT", 13, true));
            var colors = new UniformGrid { Columns = 3 };
            colors.Children.Add(Field("Fond (#RRGGBB)", _baseColor));
            colors.Children.Add(Field("Texte", _textColor));
            colors.Children.Add(Field("Bandeau par défaut", _bandColor));
            right.Children.Add(colors);
            right.Children.Add(Ui.Toolbar(Ui.Button("Palette…", (s, e) => PickColor()), Ui.Button("Choisir le gabarit de fond…", (s, e) => ChooseBase()), _baseName));
            right.Children.Add(_lineBand);
            right.Children.Add(_adaptive);
            var fixedRow = new UniformGrid { Columns = 2 };
            fixedRow.Children.Add(_showLine);
            fixedRow.Children.Add(_showDestination);
            fixedRow.Children.Add(_showClock);
            fixedRow.Children.Add(_showNext);
            right.Children.Add(fixedRow);
            var timing = new UniformGrid { Columns = 2 };
            timing.Children.Add(Field("Zones fixes", _fixedPosition));
            timing.Children.Add(Field("Temps entre deux diapositives (s)", _gap));
            right.Children.Add(timing);

            right.Children.Add(Ui.Text("Diapositives", 12, true));
            right.Children.Add(_slides);
            right.Children.Add(Ui.Toolbar(
                Ui.Button("Ajouter", (s, e) => AddSlide()),
                Ui.Button("Supprimer", (s, e) => RemoveSlide()),
                Ui.Button("▲", (s, e) => MoveSlide(-1)),
                Ui.Button("▼", (s, e) => MoveSlide(1))));
            _slideForm.Children.Add(Field("Type", _slideType));
            _slideForm.Children.Add(Field("Durée (s)", _slideSeconds));
            _slideForm.Children.Add(Field("Texte (message libre)", _slideText));
            right.Children.Add(_slideForm);

            right.Children.Add(Ui.Text("Aperçu (ligne d'exemple)", 11, true, Ui.Muted));
            var headerRow = new StackPanel { Orientation = Orientation.Horizontal };
            headerRow.Children.Add(_previewLine);
            headerRow.Children.Add(_previewHeader);
            _previewBand.Child = headerRow;
            _previewBody.Child = _previewSlide;
            var preview = new StackPanel();
            preview.Children.Add(_previewBand);
            preview.Children.Add(_previewBody);
            right.Children.Add(new Border { BorderBrush = Brushes.Gray, BorderThickness = new Thickness(1), Child = preview, Margin = new Thickness(0, 4, 0, 0) });

            Grid.SetColumn(left, 0);
            Grid.SetColumn(right, 1);
            grid.Children.Add(left);
            grid.Children.Add(right);
            Children.Add(new ScrollViewer { Content = grid, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });

            _override.Click += (s, e) => ToggleOverride();
            _slides.SelectionChanged += (s, e) => LoadSlide();
            foreach (var box in new[] { _rate, _volume, _preMeters, _textLine, _textNext, _textCorr, _textTerminus, _baseColor, _textColor, _bandColor, _gap, _slideSeconds, _slideText })
                box.TextChanged += (s, e) => Apply();
            foreach (var box in new[] { _ttsEnabled, _lineBand, _adaptive, _showLine, _showDestination, _showClock, _showNext })
                box.Click += (s, e) => Apply();
            _engine.SelectionChanged += (s, e) => Apply();
            _voice.SelectionChanged += (s, e) =>
            {
                if (_loading || _voice.SelectedItem == null) return;
                _voice.Text = (string)_voice.SelectedItem;
                if (_voice.Text == TtsEngine.ClaireTice) _engine.SelectedItem = "SAPI5";
                Apply();
            };
            _voice.AddHandler(System.Windows.Controls.Primitives.TextBoxBase.TextChangedEvent, new TextChangedEventHandler((s, e) => Apply()));
            Loaded += (s, e) => { if (_voice.Items.Count == 0) RefreshVoices(); };
            _fixedPosition.SelectionChanged += (s, e) => Apply();
            _slideType.SelectionChanged += (s, e) => ApplySlide();

            SetVehicle(null);
        }

        private static StackPanel Field(string label, UIElement control)
        {
            var panel = new StackPanel { Margin = new Thickness(0, 0, 8, 8) };
            panel.Children.Add(Ui.Text(label, 11, true, Ui.Muted));
            panel.Children.Add(control);
            return panel;
        }

        // Appelé à chaque changement de véhicule (null : aucun véhicule choisi, seule la norme globale est éditable).
        public void SetVehicle(SaeivConfig vehicle)
        {
            Commit();
            _vehicle = vehicle;
            _loading = true;
            _override.IsEnabled = vehicle != null;
            _override.IsChecked = vehicle != null && vehicle.NormsOverride;
            _loading = false;
            Pick();
        }

        // Enregistre la norme globale sur ce PC.
        public void Commit()
        {
            try { SaeivStore.SaveNorms(_global); } catch (Exception) { }
        }

        // Norme à publier pour ce véhicule : la sienne si elle surcharge, sinon la globale.
        public SaeivNorms Effective(SaeivConfig vehicle)
        {
            return vehicle != null && vehicle.NormsOverride && vehicle.Norms != null ? vehicle.Norms : _global;
        }

        private void ToggleOverride()
        {
            if (_vehicle == null) return;
            _vehicle.NormsOverride = _override.IsChecked == true;
            if (_vehicle.NormsOverride && !HasCopy(_vehicle.Norms)) _vehicle.Norms = Clone(_global);
            Pick();
        }

        private static bool HasCopy(SaeivNorms norms) { return norms != null && norms.Screens != null; }

        private static SaeivNorms Clone(SaeivNorms source)
        {
            var serializer = new System.Runtime.Serialization.Json.DataContractJsonSerializer(typeof(SaeivNorms));
            using (var stream = new MemoryStream())
            {
                serializer.WriteObject(stream, source);
                stream.Position = 0;
                return (SaeivNorms)serializer.ReadObject(stream);
            }
        }

        private void Pick()
        {
            var overriding = _vehicle != null && _vehicle.NormsOverride;
            _norms = overriding ? _vehicle.Norms : _global;
            _scope.Text = overriding ? "Vous modifiez la norme propre à ce véhicule." : "Vous modifiez la norme globale (tous les véhicules sans surcharge).";
            Load();
        }

        private void RefreshVoices()
        {
            var keep = _voice.Text;
            var voices = TtsEngine.InstalledVoices();
            _loading = true;
            _voice.Items.Clear();
            if (TtsEngine.InfovoxInstalled()) _voice.Items.Add(TtsEngine.ClaireTice);
            foreach (var name in voices) _voice.Items.Add(name);
            _voice.Text = keep;
            _loading = false;
            _voiceInfo.Text = voices.Count == 0
                ? "  Aucune voix SAPI5 détectée sur ce PC."
                : "  " + voices.Count + " voix SAPI5 détectée(s)." + (voices.Any(v => v.IndexOf("claire", StringComparison.OrdinalIgnoreCase) >= 0) ? string.Empty : " « Claire » n'est pas installée ici.");
        }

        private static string Int(int value) { return value.ToString(CultureInfo.InvariantCulture); }

        private static int ParseInt(string text, int fallback)
        {
            int value;
            return int.TryParse((text ?? string.Empty).Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out value) ? value : fallback;
        }

        private void Load()
        {
            _loading = true;
            var tts = _norms.Tts;
            var screens = _norms.Screens;
            _ttsEnabled.IsChecked = tts.Enabled;
            _engine.SelectedItem = tts.Engine == "SAPI5" || tts.Engine == "INFOVOX" ? tts.Engine : "SAPI4";
            _voice.Text = tts.Voice ?? string.Empty;
            _rate.Text = Int(tts.Rate);
            _volume.Text = Int(tts.Volume);
            _preMeters.Text = Int(tts.PreAnnounceMeters);
            _textLine.Text = tts.Texts.Line;
            _textNext.Text = tts.Texts.NextStop;
            _textCorr.Text = tts.Texts.Correspondence;
            _textTerminus.Text = tts.Texts.Terminus;
            _baseColor.Text = screens.BaseColor;
            _textColor.Text = screens.TextColor;
            _bandColor.Text = screens.BandColor;
            _lineBand.IsChecked = screens.LineColorBand;
            _adaptive.IsChecked = screens.AdaptiveText;
            _showLine.IsChecked = screens.ShowLine;
            _showDestination.IsChecked = screens.ShowDestination;
            _showClock.IsChecked = screens.ShowClock;
            _showNext.IsChecked = screens.ShowNextStop;
            _fixedPosition.SelectedValue = screens.FixedPosition == "BOTTOM" ? "BOTTOM" : "TOP";
            _gap.Text = Int(screens.GapSeconds);
            _baseName.Text = string.IsNullOrEmpty(screens.BaseName) ? "  (gabarit à venir : fond uni)" : "  " + screens.BaseName;
            _loading = false;
            RefreshSlides(screens.Slides.Count > 0 ? 0 : -1);
        }

        private void Apply()
        {
            if (_loading || _norms == null) return;
            var tts = _norms.Tts;
            var screens = _norms.Screens;
            tts.Enabled = _ttsEnabled.IsChecked == true;
            var engine = _engine.SelectedItem as string;
            tts.Engine = engine == "SAPI5" || engine == "INFOVOX" ? engine : "SAPI4";
            tts.Voice = _voice.Text.Trim();
            tts.Rate = Math.Max(50, Math.Min(150, ParseInt(_rate.Text, 100)));
            tts.Volume = Math.Max(0, Math.Min(100, ParseInt(_volume.Text, 100)));
            tts.PreAnnounceMeters = Math.Max(0, Math.Min(2000, ParseInt(_preMeters.Text, 150)));
            tts.Texts.Line = _textLine.Text;
            tts.Texts.NextStop = _textNext.Text;
            tts.Texts.Correspondence = _textCorr.Text;
            tts.Texts.Terminus = _textTerminus.Text;
            screens.BaseColor = _baseColor.Text.Trim();
            screens.TextColor = _textColor.Text.Trim();
            screens.BandColor = _bandColor.Text.Trim();
            screens.LineColorBand = _lineBand.IsChecked == true;
            screens.AdaptiveText = _adaptive.IsChecked == true;
            screens.ShowLine = _showLine.IsChecked == true;
            screens.ShowDestination = _showDestination.IsChecked == true;
            screens.ShowClock = _showClock.IsChecked == true;
            screens.ShowNextStop = _showNext.IsChecked == true;
            screens.FixedPosition = _fixedPosition.SelectedValue as string == "BOTTOM" ? "BOTTOM" : "TOP";
            screens.GapSeconds = Math.Max(0, Math.Min(60, ParseInt(_gap.Text, 1)));
            ApplySlide();
            UpdatePreview();
        }

        private SlideNorm CurrentSlide
        {
            get { var i = _slides.SelectedIndex; return _norms != null && i >= 0 && i < _norms.Screens.Slides.Count ? _norms.Screens.Slides[i] : null; }
        }

        private static string SlideLabel(SlideNorm slide)
        {
            var name = SlideTypes.First(t => t.Key == slide.Type).Value;
            return name + " — " + slide.Seconds + " s" + (slide.Type == SlideType.Message && !string.IsNullOrEmpty(slide.Text) ? " : " + slide.Text : string.Empty);
        }

        private void RefreshSlides(int select)
        {
            _loading = true;
            _slides.Items.Clear();
            foreach (var slide in _norms.Screens.Slides) _slides.Items.Add(SlideLabel(slide));
            _loading = false;
            _slides.SelectedIndex = select;
            LoadSlide();
        }

        private void LoadSlide()
        {
            if (_loading) return;
            var slide = CurrentSlide;
            _loading = true;
            _slideForm.IsEnabled = slide != null;
            _slideType.SelectedValue = slide == null ? null : slide.Type;
            _slideSeconds.Text = slide == null ? string.Empty : Int(slide.Seconds);
            _slideText.Text = slide == null ? string.Empty : slide.Text;
            _loading = false;
            UpdatePreview();
        }

        private void ApplySlide()
        {
            if (_loading) return;
            var slide = CurrentSlide;
            if (slide == null) return;
            slide.Type = _slideType.SelectedValue as string ?? SlideType.NextStop;
            slide.Seconds = Math.Max(1, Math.Min(120, ParseInt(_slideSeconds.Text, 6)));
            slide.Text = _slideText.Text;
            var index = _slides.SelectedIndex;
            _loading = true;
            _slides.Items[index] = SlideLabel(slide);
            _slides.SelectedIndex = index;
            _loading = false;
            UpdatePreview();
        }

        private void AddSlide()
        {
            if (_norms.Screens.Slides.Count >= 20) { Ui.Error("20 diapositives au maximum."); return; }
            _norms.Screens.Slides.Add(new SlideNorm());
            RefreshSlides(_norms.Screens.Slides.Count - 1);
        }

        private void RemoveSlide()
        {
            var slide = CurrentSlide;
            if (slide == null) return;
            _norms.Screens.Slides.Remove(slide);
            RefreshSlides(Math.Min(_slides.SelectedIndex, _norms.Screens.Slides.Count - 1));
        }

        private void MoveSlide(int delta)
        {
            var index = _slides.SelectedIndex;
            var target = index + delta;
            var list = _norms.Screens.Slides;
            if (index < 0 || target < 0 || target >= list.Count) return;
            var slide = list[index];
            list.RemoveAt(index);
            list.Insert(target, slide);
            RefreshSlides(target);
        }

        private void PickColor()
        {
            var dialog = new System.Windows.Forms.ColorDialog { FullOpen = true, AnyColor = true };
            var current = ColorBrushConverter.Parse(_baseColor.Text);
            if (current.HasValue) dialog.Color = System.Drawing.Color.FromArgb(current.Value.R, current.Value.G, current.Value.B);
            if (dialog.ShowDialog() != System.Windows.Forms.DialogResult.OK) return;
            _baseColor.Text = string.Format("#{0:X2}{1:X2}{2:X2}", dialog.Color.R, dialog.Color.G, dialog.Color.B);
        }

        private void ChooseBase()
        {
            var dialog = new OpenFileDialog { Filter = "Images (*.png;*.jpg;*.jpeg;*.bmp;*.gif)|*.png;*.jpg;*.jpeg;*.bmp;*.gif" };
            if (dialog.ShowDialog() != true) return;
            try
            {
                var stored = SaeivStore.Import(dialog.FileName, SaeivStore.ScreensFolder, SaeivStore.ImageExtensions, SaeivStore.MaxImageBytes);
                _norms.Screens.BaseImage = stored;
                _norms.Screens.BaseName = Path.GetFileName(dialog.FileName);
                _baseName.Text = "  " + _norms.Screens.BaseName;
            }
            catch (Exception exception) { Ui.Error(exception.Message); }
        }

        private const string SampleLine = "7";
        private const string SampleDestination = "Gare d'Évry";
        private const string SampleStop = "Place de la Mairie";
        private const string SampleCorrespondences = "ligne 12, ligne 402";

        private void UpdatePreview()
        {
            if (_norms == null) return;
            var screens = _norms.Screens;
            var back = ColorBrushConverter.Parse(screens.BaseColor) ?? Colors.Black;
            var text = ColorBrushConverter.Parse(screens.TextColor) ?? Colors.White;
            var band = screens.LineColorBand ? (ColorBrushConverter.Parse(screens.BandColor) ?? Colors.DarkRed) : back;
            _previewBody.Background = new SolidColorBrush(back);
            _previewSlide.Foreground = screens.AdaptiveText ? ColorBrushConverter.ForegroundFor(back) : new SolidColorBrush(text);
            _previewBand.Background = new SolidColorBrush(band);
            var bandText = screens.AdaptiveText ? ColorBrushConverter.ForegroundFor(band) : new SolidColorBrush(text);
            _previewLine.Foreground = bandText;
            _previewHeader.Foreground = bandText;
            _previewLine.Text = screens.ShowLine ? SampleLine : string.Empty;
            _previewHeader.Text = (screens.ShowDestination ? SampleDestination : string.Empty) + (screens.ShowClock ? "   14:32" : string.Empty);
            var slide = CurrentSlide;
            if (slide == null) { _previewSlide.Text = string.Empty; return; }
            switch (slide.Type)
            {
                case SlideType.NextStop: _previewSlide.Text = "Prochain arrêt : " + SampleStop; break;
                case SlideType.Correspondences: _previewSlide.Text = "Correspondances : " + SampleCorrespondences; break;
                case SlideType.Destination: _previewSlide.Text = "Direction " + SampleDestination; break;
                case SlideType.Clock: _previewSlide.Text = "14:32"; break;
                default: _previewSlide.Text = slide.Text; break;
            }
        }

        private void ShowVoices()
        {
            var voices = TtsEngine.ListVoices();
            if (voices.Length == 0) { Ui.Error("Aucune voix SAPI5 installée sur ce PC."); return; }
            Ui.Error("Voix SAPI5 / Infovox disponibles (copiez le nom dans « Nom de la voix ») :" + Environment.NewLine + Environment.NewLine + string.Join(Environment.NewLine, voices));
        }

        private void TestVoice()
        {
            var tts = _norms.Tts;
            if (!TtsEngine.IsAvailable(tts.Engine))
            {
                _ttsStatus.Text = "  Moteur " + tts.Engine + " non installé sur ce PC.";
                return;
            }
            var sentence = TtsEngine.Fill(tts.Texts.Line, SampleLine, SampleDestination, SampleStop, SampleCorrespondences) + " "
                + TtsEngine.Fill(tts.Texts.NextStop, SampleLine, SampleDestination, SampleStop, SampleCorrespondences);
            _ttsStatus.Text = "  Lecture en cours…";
            TtsEngine.Cancel();
            TtsEngine.Speak(sentence, tts, error => Dispatcher.BeginInvoke(new Action(() => _ttsStatus.Text = error == null ? "  Lecture terminée." : "  Erreur : " + error)));
        }

        // Représentation JSON d'une norme, jointe à la révision publiée.
        public static object ToJson(SaeivNorms norms)
        {
            var serializer = new System.Runtime.Serialization.Json.DataContractJsonSerializer(typeof(SaeivNorms));
            using (var stream = new MemoryStream())
            {
                serializer.WriteObject(stream, norms);
                return Json.Parse(System.Text.Encoding.UTF8.GetString(stream.ToArray()));
            }
        }
    }
}
