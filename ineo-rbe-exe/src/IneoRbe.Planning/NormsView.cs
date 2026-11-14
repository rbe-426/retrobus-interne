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
        private SlidesEditor _slidesEditor;

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
            engineRow.Children.Add(Field("Vitesse (% – 50 à 150)", _rate));
            engineRow.Children.Add(Field("Volume (% – 0 à 100)", _volume));
            left.Children.Add(engineRow);
            left.Children.Add(Ui.Text("Voix : moteur Infovox installé sur chaque UC (Claire par défaut), détecté automatiquement par l'UC. Aucune voix à choisir ici.", 11, false, Ui.Muted));
            left.Children.Add(Field("UC pour le test (voix détectée sur l'UC)", _ucBox));
            left.Children.Add(Ui.Toolbar(Ui.Button("Tester la voix sur l'UC", (s, e) => TestVoiceOnUc()), Ui.Button("Actualiser les UC", (s, e) => LoadUcs()), _ttsStatus));
            left.Children.Add(Field("Pré-annonce : distance avant l'arrêt (m)", _preMeters));
            left.Children.Add(Ui.Text("Variables : {ligne} {destination} {arret} {correspondances}", 11, false, Ui.Muted));
            left.Children.Add(Field("Annonce de ligne", _textLine));
            left.Children.Add(Field("Prochain arrêt", _textNext));
            left.Children.Add(Field("Correspondances", _textCorr));
            left.Children.Add(Field("Terminus", _textTerminus));

            var right = new StackPanel();
            right.Children.Add(Ui.Text("Écrans TFT", 13, true));
            var colors = new UniformGrid { Columns = 3 };
            colors.Children.Add(Field("Fond (#RRGGBB)", _baseColor));
            colors.Children.Add(Field("Texte", _textColor));
            colors.Children.Add(Field("Bandeau par défaut", _bandColor));
            right.Children.Add(colors);
            right.Children.Add(Ui.Toolbar(Ui.Button("Palette…", (s, e) => PickColor()), Ui.Button("Gabarit par défaut…", (s, e) => ChooseBase()), _baseName));
            right.Children.Add(Ui.Text("Le gabarit par défaut sert aux diapositives qui n'ont pas le leur. Chaque diapositive (page de garde, prochains arrêts, arrêts principaux et délai…) a ses propres gabarit et disposition.", 11, false, Ui.Muted));
            ((TextBlock)right.Children[right.Children.Count - 1]).TextWrapping = TextWrapping.Wrap;
            right.Children.Add(_lineBand);
            right.Children.Add(_adaptive);
            var timing = new UniformGrid { Columns = 2 };
            timing.Children.Add(Field("Temps entre deux diapositives (s)", _gap));
            right.Children.Add(timing);
right.Children.Add(Ui.Text("Diaporama du profil TFT : chaque diapositive est liée à une action (page de garde, prochains arrêts, arrêts principaux et délai…) et a ses propres gabarit et disposition. L'onglet « Profil d'écrans » l'importe pour chaque écran.", 11, false, Ui.Muted));
            ((TextBlock)right.Children[right.Children.Count - 1]).TextWrapping = TextWrapping.Wrap;
_slidesEditor = new SlidesEditor(() => _norms.Screens, "Diapositives du profil TFT");
right.Children.Add(_slidesEditor);

            Grid.SetColumn(left, 0);
            Grid.SetColumn(right, 1);
            grid.Children.Add(left);
            grid.Children.Add(right);
            Children.Add(new ScrollViewer { Content = grid, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });

            _override.Click += (s, e) => ToggleOverride();
            foreach (var box in new[] { _rate, _volume, _preMeters, _textLine, _textNext, _textCorr, _textTerminus, _baseColor, _textColor, _bandColor, _gap })
                box.TextChanged += (s, e) => Apply();
            foreach (var box in new[] { _ttsEnabled, _lineBand, _adaptive, _showLine, _showDestination, _showClock, _showNext })
                box.Click += (s, e) => Apply();
            Loaded += (s, e) => { if (_ucBox.Items.Count == 0) LoadUcs(); };
            _fixedPosition.SelectionChanged += (s, e) => Apply();

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

        private readonly ComboBox _ucBox = new ComboBox { DisplayMemberPath = "Label", SelectedValuePath = "Serial" };

        private sealed class UcChoice
        {
            public string Serial { get; set; }
            public string Label { get; set; }
        }

        private void LoadUcs()
        {
            Ui.Run(Dispatcher, () => Data.List("/ineo/uc-devices", "devices"), devices =>
            {
                var keep = _ucBox.SelectedValue as string;
                var items = new List<UcChoice>();
                foreach (var device in devices)
                {
                    var serial = Json.Str(device, "serial") ?? string.Empty;
                    var voice = Json.Str(device, "voiceEngine");
                    var parc = Json.Str(device, "vehicleParc");
                    items.Add(new UcChoice
                    {
                        Serial = serial,
                        Label = (!string.IsNullOrEmpty(parc) ? parc + " – " : string.Empty) + Json.Str(device, "hostname") + " (" + serial + ") – " + (!string.IsNullOrEmpty(voice) ? voice : "voix non remontée (UC à mettre à jour)"),
                    });
                }
                _ucBox.ItemsSource = items;
                if (keep != null) _ucBox.SelectedValue = keep;
                else if (items.Count > 0) _ucBox.SelectedIndex = 0;
                _ttsStatus.Text = items.Count == 0 ? "  Aucun UC connu du serveur." : string.Empty;
            }, error => _ttsStatus.Text = "  Erreur : " + error);
        }

        // Le test est exécuté par l'UC lui-même (moteur Infovox du poste), via le serveur : délai d'environ 10 secondes.
        private void TestVoiceOnUc()
        {
            var serial = _ucBox.SelectedValue as string;
            if (string.IsNullOrEmpty(serial)) { _ttsStatus.Text = "  Choisissez un UC."; return; }
            var tts = _norms.Tts;
            var sentence = TtsEngine.Fill(tts.Texts.Line, SampleLine, SampleDestination, SampleStop, SampleCorrespondences) + " "
                + TtsEngine.Fill(tts.Texts.NextStop, SampleLine, SampleDestination, SampleStop, SampleCorrespondences);
            _ttsStatus.Text = "  Envoi à l'UC…";
            Ui.Run(Dispatcher, () => Api.Post("/ineo/uc-devices/" + Data.Encode(serial) + "/voice-test", new Dictionary<string, object> { { "text", sentence } }),
                r => _ttsStatus.Text = "  Ordre envoyé : l'UC parle dans environ 10 secondes (elle doit être allumée et connectée).",
                error => _ttsStatus.Text = "  Erreur : " + error);
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
            _baseName.Text = string.IsNullOrEmpty(screens.BaseName) ? "  (aucun gabarit : fond uni)" : "  " + screens.BaseName;
            _slidesEditor.Load(screens.Slides);
            _loading = false;
        }

        private void Apply()
        {
            if (_loading || _norms == null) return;
            var tts = _norms.Tts;
            var screens = _norms.Screens;
            tts.Enabled = _ttsEnabled.IsChecked == true;
            // Le moteur et la voix sont déterminés par chaque UC (Infovox installé sur le poste).
            tts.Engine = "INFOVOX";
            tts.Voice = string.Empty;
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
            TtsEngine.SpeakIsolated(sentence, tts, error => Dispatcher.BeginInvoke(new Action(() => _ttsStatus.Text = error == null ? "  Lecture terminée." : "  Erreur : " + error)));
        }

        public static List<SlideNorm> CloneSlides(List<SlideNorm> slides)
        {
            var serializer = new System.Runtime.Serialization.Json.DataContractJsonSerializer(typeof(List<SlideNorm>));
            using (var stream = new MemoryStream())
            {
                serializer.WriteObject(stream, slides ?? new List<SlideNorm>());
                stream.Position = 0;
                return (List<SlideNorm>)serializer.ReadObject(stream);
            }
        }

        public static object SlidesToJson(List<SlideNorm> slides)
        {
            var serializer = new System.Runtime.Serialization.Json.DataContractJsonSerializer(typeof(List<SlideNorm>));
            using (var stream = new MemoryStream())
            {
                serializer.WriteObject(stream, slides);
                return Json.Parse(System.Text.Encoding.UTF8.GetString(stream.ToArray()));
            }
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
