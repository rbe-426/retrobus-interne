using System;
using System.Collections.Generic;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Desktop
{
    // Écran de démarrage de l'UC (même charte que l'outil Maintenance) : contrôle du poste, du serveur, de la voix et de la configuration.
    // Aucune vérification n'est bloquante : l'UC doit démarrer même hors ligne ; les anomalies sont seulement signalées.
    public sealed class SplashWindow : Window
    {
        private sealed class Step
        {
            public string Label;
            // Retourne le résultat affiché ; Ok = faux signale une anomalie (ligne en orange).
            public Func<Result> Run;
        }

        private sealed class Result
        {
            public bool Ok;
            public string Text;
            public static Result Pass(string text) { return new Result { Ok = true, Text = text }; }
            public static Result Warn(string text) { return new Result { Ok = false, Text = text }; }
        }

        private const int MinStepMs = 250;
        private static readonly Brush Carbon = new SolidColorBrush(Color.FromRgb(0x0F, 0x17, 0x2A));
        private static readonly Brush Red = new SolidColorBrush(Color.FromRgb(0x9F, 0x06, 0x3A));
        private static readonly Brush Soft = new SolidColorBrush(Color.FromRgb(0xC5, 0xCE, 0xD6));
        private static readonly Brush Good = new SolidColorBrush(Color.FromRgb(0x4A, 0xDE, 0x80));
        private static readonly Brush Alert = new SolidColorBrush(Color.FromRgb(0xFB, 0xBF, 0x24));

        private readonly StackPanel _rows = new StackPanel();
        private readonly TextBlock _status = new TextBlock { Foreground = Soft, FontSize = 11, Margin = new Thickness(0, 0, 0, 6), Text = "Démarrage…" };
        private readonly ProgressBar _bar = new ProgressBar { Height = 10, Minimum = 0, Maximum = 100, Foreground = Red, Background = new SolidColorBrush(Color.FromRgb(0x1E, 0x29, 0x3B)), BorderThickness = new Thickness(0) };
        private string _serial;
        private SaeivConfig _config;

        public event EventHandler Completed;

        public SplashWindow()
        {
            Title = "Inéo RétroBus";
            Width = 460;
            Height = 380;
            WindowStyle = WindowStyle.None;
            ResizeMode = ResizeMode.NoResize;
            ShowInTaskbar = true;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            Background = Carbon;
            FontFamily = new FontFamily("Tahoma");
            Topmost = true;

            var grid = new Grid { Margin = new Thickness(16) };
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            var logo = new Image { Stretch = Stretch.Uniform, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 0, 8) };
            try { logo.Source = new BitmapImage(new Uri("pack://application:,,,/IneoRbe.Desktop;component/Assets/splash-logo.png")); } catch (Exception) { }
            grid.Children.Add(logo);

            _rows.Margin = new Thickness(0, 0, 0, 10);
            Grid.SetRow(_rows, 1);
            grid.Children.Add(_rows);
            Grid.SetRow(_status, 2);
            grid.Children.Add(_status);
            Grid.SetRow(_bar, 3);
            grid.Children.Add(_bar);

            Content = new Border { BorderBrush = Red, BorderThickness = new Thickness(2), Child = grid };
            Loaded += (sender, args) => ThreadPool.QueueUserWorkItem(delegate { RunSteps(); });
        }

        // Configuration lue pendant le démarrage, réutilisable par la fenêtre principale.
        public SaeivConfig Config { get { return _config; } }

        private void RunSteps()
        {
            var steps = new List<Step>
            {
                new Step { Label = "Identification de l'UC", Run = CheckIdentity },
                new Step { Label = "Serveur RétroBus", Run = CheckServer },
                new Step { Label = "Configuration SAEIV", Run = CheckConfig },
                new Step { Label = "Moteur vocal", Run = CheckVoiceEngine },
                new Step { Label = "SpeechPad (SpeechPad.exe)", Run = CheckSpeechPad },
            };

            var warnings = 0;
            for (var i = 0; i < steps.Count; i++)
            {
                var step = steps[i];
                Report(step.Label + "…", i * 100.0 / steps.Count);
                var started = Environment.TickCount;
                Result result;
                try { result = step.Run(); }
                catch (Exception exception) { result = Result.Warn(exception.Message); }
                if (!result.Ok) warnings++;
                var remaining = MinStepMs - (Environment.TickCount - started);
                if (remaining > 0) Thread.Sleep(remaining);
                AddRow(step.Label, result);
            }

            Report(warnings == 0 ? "Prêt." : "Démarrage avec " + warnings + " avertissement(s).", 100);
            Thread.Sleep(warnings == 0 ? 500 : 1800);
            Dispatcher.BeginInvoke(DispatcherPriority.Normal, new Action(() =>
            {
                var handler = Completed;
                if (handler != null) handler(this, EventArgs.Empty);
            }));
        }

        private Result CheckIdentity()
        {
            _serial = DeviceIdentity.ReadSerial();
            return DeviceIdentity.IsUsable(_serial) ? Result.Pass("N° de série " + _serial) : Result.Warn("N° de série illisible");
        }

        private Result CheckServer()
        {
            try
            {
                var response = HttpTransport.Send("GET", ApiEndpoints.ContentRevisionUrl + "?serial=" + Uri.EscapeDataString(_serial ?? string.Empty), null, null, 8000);
                // Toute réponse du serveur (même une erreur applicative) prouve qu'il est joignable.
                return response.StatusCode > 0 && response.StatusCode < 500 ? Result.Pass("joignable") : Result.Warn("erreur " + response.StatusCode);
            }
            catch (Exception) { return Result.Warn("injoignable (mode hors ligne)"); }
        }

        private Result CheckConfig()
        {
            _config = SaeivStore.Load();
            var revision = ContentSync.LoadApplied();
            var lines = _config.Lines == null ? 0 : _config.Lines.Count;
            var text = _config.Announcements.Count + " annonce(s), " + lines + " ligne(s)";
            return string.IsNullOrEmpty(revision) ? Result.Warn("aucune révision reçue (" + text + ")") : Result.Pass("révision " + revision + " : " + text);
        }

        private Result CheckVoiceEngine()
        {
            var infovox = TtsEngine.FindInfovoxVoice();
            if (infovox != null) return Result.Pass("Infovox : " + infovox);
            var norm = _config != null && _config.Norms != null ? _config.Norms.Tts : null;
            if (norm != null && !norm.Enabled) return Result.Pass("désactivé dans la norme");
            var engine = norm == null ? "SAPI4" : norm.Engine;
            if (!TtsEngine.IsAvailable(engine)) return Result.Warn("Infovox non détecté : annonces vocales muettes");
            return Result.Warn("Infovox non détecté, repli sur " + engine);
        }

        private static Result CheckSpeechPad()
        {
            var path = TtsEngine.SpeechPadPath();
            return path != null ? Result.Pass("trouvé") : Result.Warn("introuvable (Infovox Desktop non installé)");
        }

        private void Report(string label, double percent)
        {
            Dispatcher.BeginInvoke(DispatcherPriority.Normal, new Action(() =>
            {
                _status.Text = label;
                _bar.Value = percent;
            }));
        }

        private void AddRow(string label, Result result)
        {
            Dispatcher.Invoke(DispatcherPriority.Normal, new Action(() =>
            {
                var row = new TextBlock { FontSize = 11, Margin = new Thickness(0, 1, 0, 1), TextTrimming = TextTrimming.CharacterEllipsis, ToolTip = result.Text };
                row.Inlines.Add(new System.Windows.Documents.Run(result.Ok ? "OK  " : "!!  ") { Foreground = result.Ok ? Good : Alert, FontWeight = FontWeights.Bold });
                row.Inlines.Add(new System.Windows.Documents.Run(label + " : ") { Foreground = Soft });
                row.Inlines.Add(new System.Windows.Documents.Run(result.Text) { Foreground = result.Ok ? Brushes.White : Alert });
                _rows.Children.Add(row);
            }));
        }
    }
}
