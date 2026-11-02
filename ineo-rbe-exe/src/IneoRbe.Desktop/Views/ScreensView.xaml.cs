using System;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using IneoRbe.Desktop.Services;
using Microsoft.Win32;

namespace IneoRbe.Desktop.Views
{
    public partial class ScreensView : UserControl
    {
        private SaeivConfig _config;
        private ScreenConfig _current;
        private string _pendingOfflineFile, _pendingOfflineName;
        private string _pendingOnlineFile, _pendingOnlineName;
        private bool _loading;
        private bool _online = true;

        public ScreensView()
        {
            InitializeComponent();
        }

        public void Initialize(SaeivConfig config)
        {
            _config = config;
            RefreshList(null);
            if (_config.Screens.Count > 0) ScreenList.SelectedIndex = 0;
            else StartNew();
            UpdateConnectionText();
        }

        // Indique quelle image l'écran diffusera avec l'état réseau actuel.
        public void SetConnectionState(bool online)
        {
            _online = online;
            UpdateConnectionText();
        }

        private void UpdateConnectionText()
        {
            if (ConnectionText == null) return;
            ConnectionText.Text = _online
                ? "Connecté : l'écran diffuse le média / l'image « si connecté »."
                : "Connexion perdue : l'écran diffuse l'image « perte de connexion ».";
            OnlineGroup.FontWeight = _online ? FontWeights.Bold : FontWeights.Normal;
            OfflineGroup.FontWeight = _online ? FontWeights.Normal : FontWeights.Bold;
        }

        private void RefreshList(ScreenConfig selected)
        {
            _loading = true;
            ScreenList.ItemsSource = null;
            ScreenList.ItemsSource = _config.Screens;
            ScreenList.SelectedItem = selected;
            _loading = false;
        }

        private void StartNew()
        {
            DiscardPending();
            _current = new ScreenConfig();
            LoadForm(_current);
            ScreenList.SelectedItem = null;
            DeleteButton.IsEnabled = false;
        }

        private void LoadForm(ScreenConfig screen)
        {
            _loading = true;
            NameBox.Text = screen.Name;
            OfflineNameBox.Text = screen.OfflineName ?? string.Empty;
            OnlineNameBox.Text = screen.OnlineName ?? string.Empty;
            OfflinePreview.Source = LoadImage(SaeivStore.ResolvePath(SaeivStore.ScreensFolder, screen.OfflineImage));
            OnlinePreview.Source = LoadImage(SaeivStore.ResolvePath(SaeivStore.ScreensFolder, screen.OnlineImage));
            _loading = false;
        }

        private static BitmapImage LoadImage(string path)
        {
            if (string.IsNullOrEmpty(path) || !File.Exists(path)) return null;
            try
            {
                var image = new BitmapImage();
                image.BeginInit();
                image.CacheOption = BitmapCacheOption.OnLoad;
                image.UriSource = new Uri(path);
                image.EndInit();
                image.Freeze();
                return image;
            }
            catch (Exception)
            {
                return null;
            }
        }

        private void ScreenList_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_loading) return;
            var selected = ScreenList.SelectedItem as ScreenConfig;
            if (selected == null) return;
            DiscardPending();
            _current = selected;
            LoadForm(selected);
            DeleteButton.IsEnabled = true;
        }

        private void NewButton_Click(object sender, RoutedEventArgs e)
        {
            StartNew();
        }

        private bool PickImage(out string storedName, out string displayName)
        {
            storedName = null;
            displayName = null;
            var dialog = new OpenFileDialog
            {
                Title = "Importer une image",
                Filter = "Images (*.png;*.jpg;*.jpeg;*.bmp;*.gif)|*.png;*.jpg;*.jpeg;*.bmp;*.gif",
            };
            if (dialog.ShowDialog() != true) return false;
            try
            {
                storedName = SaeivStore.Import(dialog.FileName, SaeivStore.ScreensFolder, SaeivStore.ImageExtensions, SaeivStore.MaxImageBytes);
                displayName = Path.GetFileName(dialog.FileName);
                return true;
            }
            catch (Exception exception)
            {
                MessageBox.Show(exception.Message, "Import impossible", MessageBoxButton.OK, MessageBoxImage.Warning);
                return false;
            }
        }

        private void ImportOfflineButton_Click(object sender, RoutedEventArgs e)
        {
            string stored, display;
            if (!PickImage(out stored, out display)) return;
            if (_pendingOfflineFile != null) SaeivStore.DeleteStored(SaeivStore.ScreensFolder, _pendingOfflineFile);
            _pendingOfflineFile = stored;
            _pendingOfflineName = display;
            OfflineNameBox.Text = display;
            OfflinePreview.Source = LoadImage(SaeivStore.ResolvePath(SaeivStore.ScreensFolder, stored));
        }

        private void ImportOnlineButton_Click(object sender, RoutedEventArgs e)
        {
            string stored, display;
            if (!PickImage(out stored, out display)) return;
            if (_pendingOnlineFile != null) SaeivStore.DeleteStored(SaeivStore.ScreensFolder, _pendingOnlineFile);
            _pendingOnlineFile = stored;
            _pendingOnlineName = display;
            OnlineNameBox.Text = display;
            OnlinePreview.Source = LoadImage(SaeivStore.ResolvePath(SaeivStore.ScreensFolder, stored));
        }

        private void DiscardPending()
        {
            if (_pendingOfflineFile != null) SaeivStore.DeleteStored(SaeivStore.ScreensFolder, _pendingOfflineFile);
            if (_pendingOnlineFile != null) SaeivStore.DeleteStored(SaeivStore.ScreensFolder, _pendingOnlineFile);
            _pendingOfflineFile = _pendingOfflineName = _pendingOnlineFile = _pendingOnlineName = null;
        }

        private void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            var name = NameBox.Text.Trim();
            if (name.Length == 0)
            {
                MessageBox.Show("Saisissez un nom pour l'écran.", "Configuration d'écran", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var previousOffline = _current.OfflineImage;
            var previousOnline = _current.OnlineImage;
            _current.Name = name;
            if (_pendingOfflineFile != null)
            {
                _current.OfflineImage = _pendingOfflineFile;
                _current.OfflineName = _pendingOfflineName;
            }
            if (_pendingOnlineFile != null)
            {
                _current.OnlineImage = _pendingOnlineFile;
                _current.OnlineName = _pendingOnlineName;
            }
            var wasNew = !_config.Screens.Contains(_current);
            if (wasNew) _config.Screens.Add(_current);

            try
            {
                SaeivStore.Save(_config);
            }
            catch (Exception exception)
            {
                if (wasNew) _config.Screens.Remove(_current);
                MessageBox.Show("L'enregistrement a échoué : " + exception.Message, "Configuration d'écran", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (_pendingOfflineFile != null && previousOffline != null) SaeivStore.DeleteStored(SaeivStore.ScreensFolder, previousOffline);
            if (_pendingOnlineFile != null && previousOnline != null) SaeivStore.DeleteStored(SaeivStore.ScreensFolder, previousOnline);
            _pendingOfflineFile = _pendingOfflineName = _pendingOnlineFile = _pendingOnlineName = null;
            RefreshList(_current);
            DeleteButton.IsEnabled = true;
        }

        private void DeleteButton_Click(object sender, RoutedEventArgs e)
        {
            if (_current == null || !_config.Screens.Contains(_current)) return;
            var answer = MessageBox.Show("Supprimer l'écran « " + _current.Name + " » ?", "Confirmation", MessageBoxButton.YesNo, MessageBoxImage.Question);
            if (answer != MessageBoxResult.Yes) return;

            var removed = _current;
            _config.Screens.Remove(removed);
            try
            {
                SaeivStore.Save(_config);
            }
            catch (Exception exception)
            {
                _config.Screens.Add(removed);
                MessageBox.Show("La suppression a échoué : " + exception.Message, "Configuration d'écran", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }
            SaeivStore.DeleteStored(SaeivStore.ScreensFolder, removed.OfflineImage);
            SaeivStore.DeleteStored(SaeivStore.ScreensFolder, removed.OnlineImage);
            RefreshList(null);
            if (_config.Screens.Count > 0) ScreenList.SelectedIndex = 0;
            else StartNew();
        }
    }
}
