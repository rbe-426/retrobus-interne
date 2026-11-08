using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Effects;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using System.Windows.Threading;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Desktop.Views
{
    // Simule les écrans du véhicule : plan avec les écrans à leur place, et fenêtres affichant chaque écran à son ratio réel.
    public partial class SimulatorView : UserControl
    {
        private const double PlanWidth = 1000;
        private const double PlanHeight = 400;
        private static readonly Color[] TestColors =
        {
            Color.FromRgb(0xD7, 0x19, 0x4B), Color.FromRgb(0x00, 0x5A, 0x9E), Color.FromRgb(0x2F, 0x85, 0x5A),
            Color.FromRgb(0xB7, 0x79, 0x1F), Color.FromRgb(0x6B, 0x46, 0xC1), Color.FromRgb(0x2C, 0x7A, 0x7B),
        };

        private readonly Dictionary<string, BitmapImage> _images = new Dictionary<string, BitmapImage>();
        private readonly Dictionary<string, ScreenWindow> _windows = new Dictionary<string, ScreenWindow>();
        private readonly DispatcherTimer _testTimer = new DispatcherTimer();
        private ScreenProfileInfo _profile;
        private bool _online = true;
        private bool _testMode;

        public SimulatorView()
        {
            InitializeComponent();
            _testTimer.Tick += (s, e) => { _testTimer.Stop(); SetTestMode(false); };
            Rebuild();
        }

        public event EventHandler SyncRequested;

        // Image PNG du plan des écrans (miroir pour l'outil Maintenance). À appeler sur le thread d'interface.
        public byte[] CaptureSnapshot()
        {
            const int width = 1000;
            const int height = 400;
            // Le simulateur n'est affiché dans aucun onglet de l'UC : sans mise en page forcée, le plan n'a aucune taille et l'image est blanche.
            Measure(new Size(1500, 600));
            Arrange(new Rect(0, 0, 1500, 600));
            UpdateLayout();
            var visual = new DrawingVisual();
            using (var context = visual.RenderOpen())
            {
                context.DrawRectangle(Brushes.White, null, new Rect(0, 0, width, height));
                context.DrawRectangle(new VisualBrush(PlanCanvas), null, new Rect(0, 0, width, height));
            }
            var bitmap = new RenderTargetBitmap(width, height, 96, 96, PixelFormats.Pbgra32);
            bitmap.Render(visual);
            var encoder = new PngBitmapEncoder();
            encoder.Frames.Add(BitmapFrame.Create(bitmap));
            using (var stream = new System.IO.MemoryStream())
            {
                encoder.Save(stream);
                return stream.ToArray();
            }
        }

        public void SetProfile(ScreenProfileInfo profile)
        {
            _profile = profile;
            _images.Clear();
            Rebuild();
        }

        public void SetConnectionState(bool online)
        {
            if (_online == online) return;
            _online = online;
            Rebuild();
        }

        public void ShowTestCard(int seconds)
        {
            _testTimer.Stop();
            _testTimer.Interval = TimeSpan.FromSeconds(seconds);
            SetTestMode(true);
            _testTimer.Start();
        }

        private void SetTestMode(bool enabled)
        {
            _testMode = enabled;
            TestButton.Content = enabled ? "Arrêter la mire" : "Mire de test (60 s)";
            Rebuild();
        }

        private List<ScreenInfo> Screens
        {
            get { return _profile != null && _profile.Screens != null ? _profile.Screens : new List<ScreenInfo>(); }
        }

        private void Rebuild()
        {
            var screens = Screens;
            var selectedIndex = ScreenList.SelectedIndex;

            ProfileText.Text = _profile == null
                ? "Aucun profil écran pour ce poste."
                : "Profil écran : " + _profile.Name + " (révision " + _profile.Revision + ")  ·  " + (_online ? "connecté : médias affichés" : "connexion perdue : images de secours");
            HintText.Text = _profile == null
                ? "Le profil écran se configure dans l'URBEX (Inéo RétroBus > Profils écrans) puis se rattache au véhicule dans « Profils véhicules »."
                : "Le profil est géré dans l'URBEX et se synchronise automatiquement. Double-cliquez sur un écran pour l'ouvrir à son ratio réel.";

            ScreenList.SelectionChanged -= ScreenList_SelectionChanged;
            ScreenList.Items.Clear();
            foreach (var screen in screens)
            {
                ScreenList.Items.Add(screen.Name + "  (" + screen.WidthPx + "×" + screen.HeightPx + ")");
            }
            ScreenList.SelectedIndex = selectedIndex >= 0 && selectedIndex < screens.Count ? selectedIndex : -1;
            ScreenList.SelectionChanged += ScreenList_SelectionChanged;
            OpenButton.IsEnabled = ScreenList.SelectedIndex >= 0;

            DrawPlan(screens);
            foreach (var screen in screens)
            {
                ScreenWindow window;
                if (_windows.TryGetValue(screen.Id ?? string.Empty, out window)) window.Refresh(screen, ImageFor(screen), _testMode, ColorFor(screens, screen));
            }
            foreach (var orphan in _windows.Keys.Where(id => screens.All(screen => screen.Id != id)).ToList())
            {
                _windows[orphan].Close();
            }
        }

        private void DrawPlan(List<ScreenInfo> screens)
        {
            PlanCanvas.Children.Clear();
            var body = new Rectangle { Width = 980, Height = 376, RadiusX = 34, RadiusY = 34, Stroke = Brushes.Gray, StrokeThickness = 4, Fill = Brushes.White };
            Canvas.SetLeft(body, 10);
            Canvas.SetTop(body, 12);
            PlanCanvas.Children.Add(body);
            var windshield = new Rectangle { Width = 25, Height = 220, RadiusX = 12, RadiusY = 12, Fill = Brushes.LightGray };
            Canvas.SetLeft(windshield, 962);
            Canvas.SetTop(windshield, 90);
            PlanCanvas.Children.Add(windshield);
            AddLabel("AVANT ▶", 880, 366);
            AddLabel("◀ ARRIÈRE", 30, 366);
            if (screens.Count == 0) AddLabel("Aucun profil écran rattaché à cet UC", 340, 180);

            var selected = ScreenList.SelectedIndex;
            for (var index = 0; index < screens.Count; index++)
            {
                var screen = screens[index];
                var width = Math.Max(20, screen.WidthPct * PlanWidth / 100);
                var height = Math.Max(10, width * screen.HeightPx / Math.Max(1, screen.WidthPx));
                var box = new Border
                {
                    Width = width,
                    Height = height,
                    BorderThickness = new Thickness(3),
                    BorderBrush = index == selected ? Brushes.Orange : new SolidColorBrush(Color.FromRgb(0x17, 0x36, 0x4D)),
                    Background = _testMode ? new SolidColorBrush(ColorFor(screens, screen)) : new SolidColorBrush(Color.FromRgb(0x2B, 0x3A, 0x45)),
                    ClipToBounds = true,
                };
                var content = new Grid();
                var image = _testMode ? null : ImageFor(screen);
                if (image != null) content.Children.Add(new Image { Source = image, Stretch = Stretch.UniformToFill });
                content.Children.Add(Caption(_testMode ? "TEST — " + screen.Name : image == null ? screen.Name : string.Empty, screen, 16, height));
                box.Child = content;
                Canvas.SetLeft(box, screen.X * PlanWidth / 100);
                Canvas.SetTop(box, screen.Y * PlanHeight / 100);
                PlanCanvas.Children.Add(box);
            }
        }

        private static TextBlock Caption(string text, ScreenInfo screen, double size, double boxHeight = 0)
        {
            // Petits écrans (girouettes) : légende sur une seule ligne, adaptée à la hauteur.
            var compact = boxHeight > 0 && boxHeight < 70;
            var dimensions = screen.WidthPx + "×" + screen.HeightPx;
            return new TextBlock
            {
                Text = text.Length == 0 ? string.Empty : compact ? text + "  " + dimensions : text + Environment.NewLine + dimensions,
                Foreground = Brushes.White,
                FontSize = compact ? Math.Max(8, boxHeight * 0.38) : size,
                FontWeight = FontWeights.SemiBold,
                TextAlignment = TextAlignment.Center,
                TextWrapping = compact ? TextWrapping.NoWrap : TextWrapping.Wrap,
                TextTrimming = TextTrimming.CharacterEllipsis,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
                Effect = new DropShadowEffect { ShadowDepth = 1, BlurRadius = 2, Color = Colors.Black },
            };
        }

        private void AddLabel(string text, double left, double top)
        {
            var label = new TextBlock { Text = text, Foreground = Brushes.Gray, FontSize = 16, FontWeight = FontWeights.Bold };
            Canvas.SetLeft(label, left);
            Canvas.SetTop(label, top);
            PlanCanvas.Children.Add(label);
        }

        private static Color ColorFor(List<ScreenInfo> screens, ScreenInfo screen)
        {
            return TestColors[Math.Max(0, screens.IndexOf(screen)) % TestColors.Length];
        }

        private BitmapImage ImageFor(ScreenInfo screen)
        {
            var path = MediaCache.PathFor(_online ? screen.OnlineMediaId : screen.OfflineMediaId);
            if (path == null) return null;
            BitmapImage image;
            if (_images.TryGetValue(path, out image)) return image;
            try
            {
                image = new BitmapImage();
                image.BeginInit();
                image.CacheOption = BitmapCacheOption.OnLoad;
                image.UriSource = new Uri(path);
                image.EndInit();
                image.Freeze();
            }
            catch (Exception)
            {
                image = null;
            }
            _images[path] = image;
            return image;
        }

        private void ScreenList_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            OpenButton.IsEnabled = ScreenList.SelectedIndex >= 0;
            DrawPlan(Screens);
        }

        private void ScreenList_MouseDoubleClick(object sender, System.Windows.Input.MouseButtonEventArgs e)
        {
            OpenSelectedScreen();
        }

        private void OpenButton_Click(object sender, RoutedEventArgs e)
        {
            OpenSelectedScreen();
        }

        private void OpenSelectedScreen()
        {
            var index = ScreenList.SelectedIndex;
            var screens = Screens;
            if (index < 0 || index >= screens.Count) return;
            var screen = screens[index];
            var key = screen.Id ?? string.Empty;

            ScreenWindow window;
            if (_windows.TryGetValue(key, out window))
            {
                window.Activate();
                return;
            }
            window = new ScreenWindow(screen);
            window.Closed += (s, e) => _windows.Remove(key);
            _windows[key] = window;
            window.Refresh(screen, ImageFor(screen), _testMode, ColorFor(screens, screen));
            window.Show();
        }

        private void TestButton_Click(object sender, RoutedEventArgs e)
        {
            if (_testMode)
            {
                _testTimer.Stop();
                SetTestMode(false);
            }
            else
            {
                ShowTestCard(60);
            }
        }

        private void SyncButton_Click(object sender, RoutedEventArgs e)
        {
            var handler = SyncRequested;
            if (handler != null) handler(this, EventArgs.Empty);
        }

        // Fenêtre simulant un écran : respecte son ratio et se met à jour avec le profil.
        private sealed class ScreenWindow : Window
        {
            private readonly Image _image = new Image { Stretch = Stretch.Uniform };
            private readonly Grid _surface = new Grid { Background = Brushes.Black };
            private readonly TextBlock _caption = new TextBlock();

            public ScreenWindow(ScreenInfo screen)
            {
                var workArea = SystemParameters.WorkArea;
                var scale = Math.Min(1.0, Math.Min(workArea.Width * 0.8 / screen.WidthPx, workArea.Height * 0.8 / screen.HeightPx));
                _surface.Width = Math.Max(160, screen.WidthPx * scale);
                _surface.Height = Math.Max(60, screen.HeightPx * scale);
                _surface.Children.Add(_image);
                _surface.Children.Add(_caption);
                Content = _surface;
                SizeToContent = SizeToContent.WidthAndHeight;
                ResizeMode = ResizeMode.CanMinimize;
                WindowStartupLocation = WindowStartupLocation.CenterScreen;
                Title = "Écran simulé — " + screen.Name + " (" + screen.WidthPx + "×" + screen.HeightPx + ")";
            }

            public void Refresh(ScreenInfo screen, BitmapImage image, bool testMode, Color testColor)
            {
                Title = "Écran simulé — " + screen.Name + " (" + screen.WidthPx + "×" + screen.HeightPx + ")";
                _image.Source = testMode ? null : image;
                _surface.Background = testMode ? new SolidColorBrush(testColor) : Brushes.Black;
                var text = testMode ? "TEST — " + screen.Name : image == null ? screen.Name + " : aucune image" : string.Empty;
                var caption = Caption(text, screen, 28);
                _caption.Text = caption.Text;
                _caption.Foreground = caption.Foreground;
                _caption.FontSize = caption.FontSize;
                _caption.FontWeight = caption.FontWeight;
                _caption.TextAlignment = caption.TextAlignment;
                _caption.HorizontalAlignment = caption.HorizontalAlignment;
                _caption.VerticalAlignment = caption.VerticalAlignment;
                _caption.Effect = caption.Effect;
            }
        }
    }
}
