using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Planning
{
    public sealed class MainWindow : Window
    {
        private readonly Version _version = typeof(MainWindow).Assembly.GetName().Version;
        private readonly ContentControl _content = new ContentControl();
        private readonly Dictionary<string, UIElement> _views = new Dictionary<string, UIElement>();
        private readonly Dictionary<string, Func<UIElement>> _factories = new Dictionary<string, Func<UIElement>>();
        private readonly TextBlock _updateText = Ui.Text(string.Empty, 11, false, Brushes.White);
        private readonly Button _updateButton;
        private UpdateDescriptor _pending;

        public MainWindow(string updateNotice, UpdateDescriptor pendingUpdate)
        {
            Title = "Inéo RétroBus Gestionnaire";
            Width = 1180; Height = 740; MinWidth = 900; MinHeight = 560;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            FontFamily = new FontFamily("Tahoma");

            var root = new DockPanel();

            var header = new Grid { Background = Ui.Carbon, Height = 56 };
            header.Children.Add(new Image { Source = AppImages.Load("logo.png"), Height = 40, HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(12, 0, 0, 0) });
            header.Children.Add(new Image { Source = AppImages.Load("header-logo-right.png"), Height = 40, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 0, 12, 0) });
            DockPanel.SetDock(header, Dock.Top);
            root.Children.Add(header);

            _updateButton = Ui.Button("Update disponible", (s, e) => Install(), true);
            _updateButton.Visibility = Visibility.Collapsed;
            _updateButton.Margin = new Thickness(0, 2, 8, 2);
            DockPanel.SetDock(_updateButton, Dock.Right);
            var statusBar = new DockPanel { Background = Ui.Carbon, Height = 30 };
            var user = Ui.Text("Connecté : " + Api.UserName + "  ·  version " + ReleaseVersion.Format(_version), 11, false, Brushes.White);
            user.Margin = new Thickness(12, 0, 0, 0);
            user.VerticalAlignment = VerticalAlignment.Center;
            var logout = Ui.Button("Se déconnecter", (s, e) => Relogin());
            logout.Margin = new Thickness(0, 2, 8, 2);
            DockPanel.SetDock(logout, Dock.Right);
            _updateText.VerticalAlignment = VerticalAlignment.Center;
            _updateText.Margin = new Thickness(14, 0, 0, 0);
            statusBar.Children.Add(logout);
            statusBar.Children.Add(_updateButton);
            statusBar.Children.Add(user);
            statusBar.Children.Add(_updateText);
            DockPanel.SetDock(statusBar, Dock.Bottom);
            root.Children.Add(statusBar);

            var tree = new TreeView { Width = 220, Background = Ui.Panel, BorderThickness = new Thickness(0, 0, 1, 0), BorderBrush = Ui.Line };
            DockPanel.SetDock(tree, Dock.Left);
            AddGroup(tree, "Exploitation", new[]
            {
                Entry("missions", "Planifier les services", Views.Missions),
                Entry("routes", "Trajets et codes course", Views.Routes),
                Entry("live", "Suivi en temps réel", Views2.Live),
                Entry("free", "Traçage libre", Views2.FreeTracking),
                Entry("flash", "Flash conducteurs", Views.Flashes),
            });
            AddGroup(tree, "Ressources", new[]
            {
                Entry("drivers", "Conducteurs", Views.Drivers),
                Entry("vehicles", "Profils véhicules", Views.VehicleProfiles),
                Entry("screens", "Profils écrans", Views2.ScreenProfiles),
                Entry("pilot", "Véhicule pilote", Views2.Pilot),
                Entry("content", "Révisions de contenu", Views2.ContentRevisions),
                Entry("pcs", "Ordinateurs Maintenance", Views.MaintenancePcs),
            });
            AddGroup(tree, "Logiciel", new[] { Entry("saeiv", "Configurateur SAEIV", () => new ConfiguratorView()), Entry("installers", "Installateurs", Views2.Installers) });
            root.Children.Add(tree);
            root.Children.Add(_content);
            Content = root;

            Loaded += (s, e) =>
            {
                Show("missions");
                if (!string.IsNullOrEmpty(updateNotice)) _updateText.Text = updateNotice;
                if (pendingUpdate != null)
                {
                    _pending = pendingUpdate;
                    _updateText.Text = "Version " + pendingUpdate.Version + " prête : cliquez sur « Update disponible ».";
                    _updateButton.Visibility = Visibility.Visible;
                }
                else CheckUpdate();
            };
        }

        private KeyValuePair<string, KeyValuePair<string, Func<UIElement>>> Entry(string key, string title, Func<UIElement> factory)
        {
            return new KeyValuePair<string, KeyValuePair<string, Func<UIElement>>>(key, new KeyValuePair<string, Func<UIElement>>(title, factory));
        }

        private void AddGroup(TreeView tree, string title, KeyValuePair<string, KeyValuePair<string, Func<UIElement>>>[] entries)
        {
            var group = new TreeViewItem { Header = title, IsExpanded = true, FontWeight = FontWeights.Bold, Foreground = Ui.Carbon, Margin = new Thickness(0, 6, 0, 0) };
            foreach (var entry in entries)
            {
                var key = entry.Key;
                _factories[key] = entry.Value.Value;
                var item = new TreeViewItem { Header = entry.Value.Key, FontWeight = FontWeights.Normal, Foreground = Brushes.Black, Tag = key };
                item.Selected += (s, e) => { e.Handled = true; Show(key); };
                group.Items.Add(item);
            }
            tree.Items.Add(group);
        }

        private void Show(string key)
        {
            UIElement view;
            if (!_views.TryGetValue(key, out view))
            {
                try { view = _factories[key](); }
                catch (Exception exception) { view = Ui.Text("Erreur d'affichage : " + exception.Message, 12); }
                _views[key] = view;
            }
            _content.Content = view;
        }

        private void Relogin()
        {
            Api.Logout();
            var login = new LoginWindow();
            if (login.ShowDialog() != true) { Close(); return; }
            _views.Clear();
            Show("missions");
        }

        private void CheckUpdate()
        {
            Ui.Run(Dispatcher, () => new UpdateClient("PLANNING", null).CheckForUpdate(), result =>
            {
                if (result == null || !result.UpdateAvailable) return;
                _pending = result.Update;
                _updateText.Text = "Version " + result.Update.Version + " disponible.";
                _updateButton.Visibility = Visibility.Visible;
            }, error => { });
        }

        private void Install()
        {
            var update = _pending;
            if (update == null) return;
            if (!Ui.Confirm("Installer la version " + update.Version + " ? Le logiciel va se fermer puis redémarrer.")) return;
            _updateButton.IsEnabled = false;
            _updateText.Text = "Téléchargement…";
            Ui.Run(Dispatcher, () => new UpdateClient("PLANNING", null).DownloadAndVerifyInstaller(update), path =>
            {
                try { UpdateInstaller.Launch(path, update.Version); Application.Current.Shutdown(); }
                catch (Exception exception) { _updateText.Text = "Échec : " + exception.Message; _updateButton.IsEnabled = true; }
            }, error => { _updateText.Text = "Échec de la mise à jour : " + error; _updateButton.IsEnabled = true; });
        }
    }
}
