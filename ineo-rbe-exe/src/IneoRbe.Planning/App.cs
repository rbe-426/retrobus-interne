using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Planning
{
    public static class AppImages
    {
        public static ImageSource Load(string name)
        {
            try { return new BitmapImage(new Uri("pack://application:,,,/Assets/" + name, UriKind.Absolute)); }
            catch (Exception) { return null; }
        }
    }

    public sealed class App : Application
    {
        [STAThread]
        public static int Main(string[] args)
        {
            var app = new App { ShutdownMode = ShutdownMode.OnExplicitShutdown };
            app.Startup += (s, e) => app.Begin(args);
            return app.Run();
        }

        private void Begin(string[] args)
        {
            SaeivStore.RootFolderName = "IneoRbePlanning";

            // Mode « relanceur » : processus sans fenêtre lancé avant une mise à jour (voir UpdateInstaller).
            if (args.Length > 0 && string.Equals(args[0], "/watch", StringComparison.OrdinalIgnoreCase))
            {
                UpdateInstaller.RunRelaunchWatcher(args);
                Shutdown();
                return;
            }

            var splash = new SplashWindow();
            splash.Completed += (sender, e) =>
            {
                var login = new LoginWindow();
                splash.Close();
                if (login.ShowDialog() != true) { Shutdown(); return; }
                var loader = new SplashWindow(true);
                loader.Completed += (s2, e2) =>
                {
                    loader.Close();
                    var main = new MainWindow(splash.UpdateNotice, splash.PendingUpdate);
                    main.Closed += (s, a) => Shutdown();
                    main.Show();
                };
                loader.Show();
            };
            splash.Show();
        }
    }

    public sealed class SplashWindow : Window
    {
        private readonly TextBlock _status = new TextBlock { Foreground = Ui.Brush("#C5CED6"), FontSize = 11, Margin = new Thickness(0, 0, 0, 6), TextWrapping = TextWrapping.Wrap, MinHeight = 30, Text = "Démarrage…" };
        private readonly ProgressBar _bar = new ProgressBar { Height = 10, Minimum = 0, Maximum = 100, Foreground = Ui.Red, Background = Ui.Brush("#1E293B"), BorderThickness = new Thickness(0) };

        public string UpdateNotice { get; private set; }
        public UpdateDescriptor PendingUpdate { get; private set; }
        public event EventHandler Completed;

        private readonly bool _loadData;

        public SplashWindow() : this(false) { }

        public SplashWindow(bool loadData)
        {
            _loadData = loadData;
            Title = "Inéo RétroBus Planification";
            Width = 440; Height = 260;
            WindowStyle = WindowStyle.None; ResizeMode = ResizeMode.NoResize;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            Background = Ui.Carbon; Topmost = true; FontFamily = new FontFamily("Tahoma");
            var grid = new Grid { Margin = new Thickness(16) };
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            var logo = new Image { Source = AppImages.Load("splash-logo.png"), Stretch = Stretch.Uniform, Margin = new Thickness(0, 0, 0, 8) };
            grid.Children.Add(logo);
            Grid.SetRow(_status, 1); grid.Children.Add(_status);
            Grid.SetRow(_bar, 2); grid.Children.Add(_bar);
            Content = new Border { BorderBrush = Ui.Red, BorderThickness = new Thickness(2), Child = grid };
            Loaded += (s, e) => System.Threading.ThreadPool.QueueUserWorkItem(delegate { Steps(); });
        }

        private void Steps()
        {
            if (_loadData) { LoadData(); return; }
            Report("Chargement des certificats…", 0);
            try { TrustedRoots.Load(); } catch (Exception) { }
            System.Threading.Thread.Sleep(250);
            Report("Recherche des mises à jour installées…", 40);
            try { UpdateNotice = UpdateInstaller.ConsumePendingResult(typeof(SplashWindow).Assembly.GetName().Version); } catch (Exception) { }
            System.Threading.Thread.Sleep(250);
            Report("Recherche des mises à jour…", 60);
            try
            {
                var check = new UpdateClient("PLANNING", null).CheckForUpdate();
                if (check != null && check.UpdateAvailable)
                {
                    PendingUpdate = check.Update;
                    Dispatcher.BeginInvoke(new Action(() => { _status.Foreground = Ui.Brush("#FFB4C8"); _status.FontWeight = FontWeights.Bold; }));
                    Report("Mise à jour " + check.Update.Version + " prête : à installer depuis la fenêtre principale.", 66);
                    System.Threading.Thread.Sleep(1800);
                }
            }
            catch (Exception) { }
            Report("Connexion au serveur RétroBus…", 70);
            try { HttpTransport.Send("GET", ApiEndpoints.ApiRoot + "/csrf-token", null, null, 30000); } catch (Exception) { }
            Report("Lecture de la révision de contenu…", 80);
            try { HttpTransport.Send("GET", ApiEndpoints.ContentRevisionUrl, null, null, 20000); } catch (Exception) { }
            Report("Chargement de la configuration SAEIV…", 88);
            try { SaeivStore.Load(); } catch (Exception) { }
            Report("Préparation de l'interface…", 94);
            System.Threading.Thread.Sleep(250);
            Report("Prêt.", 100);
            System.Threading.Thread.Sleep(200);
            Dispatcher.BeginInvoke(new Action(() => { var handler = Completed; if (handler != null) handler(this, EventArgs.Empty); }));
        }

        private void LoadData()
        {
            Report("Chargement des données (missions, véhicules, conducteurs, profils…)", 5);
            var failed = 0;
            try { failed = Api.Preload((done, total, active) => Report(active.Length == 0 ? "Finalisation…" : "Chargement : " + active, 5 + 90.0 * done / total)); }
            catch (Exception) { failed = 1; }
            Report(failed == 0 ? "Prêt." : "Prêt (certaines données seront chargées à la demande).", 100);
            System.Threading.Thread.Sleep(300);
            Dispatcher.BeginInvoke(new Action(() => { var handler = Completed; if (handler != null) handler(this, EventArgs.Empty); }));
        }

        private void Report(string text, double percent)
        {
            Dispatcher.BeginInvoke(new Action(() => { _status.Text = text; _bar.Value = percent; }));
        }
    }

    public sealed class LoginWindow : Window
    {
        private readonly TextBox _user = new TextBox { Margin = new Thickness(0, 2, 0, 10) };
        private readonly PasswordBox _password = new PasswordBox { Margin = new Thickness(0, 2, 0, 10) };
        private readonly TextBlock _error = new TextBlock { Foreground = Ui.Red, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 8) };
        private readonly Button _login;

        public LoginWindow()
        {
            Title = "Inéo RétroBus Planification — Connexion";
            Width = 380; SizeToContent = SizeToContent.Height;
            ResizeMode = ResizeMode.NoResize; WindowStartupLocation = WindowStartupLocation.CenterScreen;
            FontFamily = new FontFamily("Tahoma");
            _login = Ui.Button("Se connecter", (s, e) => Submit(), true);
            _login.IsDefault = true;
            var header = new Border { Background = Ui.Carbon, Padding = new Thickness(14), Child = new Image { Source = AppImages.Load("logo.png"), Height = 40, HorizontalAlignment = HorizontalAlignment.Left } };
            var form = new StackPanel { Margin = new Thickness(20) };
            form.Children.Add(Ui.Text("Connectez-vous avec votre compte URBEX.", 12));
            form.Children.Add(new TextBlock { Text = "Identifiant", Margin = new Thickness(0, 12, 0, 0) });
            form.Children.Add(_user);
            form.Children.Add(new TextBlock { Text = "Mot de passe" });
            form.Children.Add(_password);
            form.Children.Add(_error);
            form.Children.Add(new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Children = { _login, Ui.Button("Quitter", (s, e) => { DialogResult = false; }) } });
            var stack = new StackPanel();
            stack.Children.Add(header);
            stack.Children.Add(form);
            Content = stack;
            Loaded += (s, e) => _user.Focus();
        }

        private void Submit()
        {
            var user = _user.Text.Trim();
            var password = _password.Password;
            if (user.Length == 0 || password.Length == 0) { _error.Text = "Identifiant et mot de passe requis."; return; }
            _login.IsEnabled = false;
            _error.Text = "Connexion…";
            Ui.Run<bool>(Dispatcher, () => { Api.Login(user, password); return true; }, ok =>
            {
                DialogResult = true;
            }, error =>
            {
                _login.IsEnabled = true;
                _error.Text = error;
            });
        }
    }
}
