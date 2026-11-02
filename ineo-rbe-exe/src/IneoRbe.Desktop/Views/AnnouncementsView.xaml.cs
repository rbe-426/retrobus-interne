using System;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using IneoRbe.Desktop.Services;
using Microsoft.Win32;

namespace IneoRbe.Desktop.Views
{
    public partial class AnnouncementsView : UserControl
    {
        private SaeivConfig _config;
        private AnnouncementEngine _engine;
        private Announcement _current;
        private string _pendingSoundFile;
        private string _pendingSoundName;
        private bool _loading;

        public AnnouncementsView()
        {
            InitializeComponent();
        }

        public void Initialize(SaeivConfig config, AnnouncementEngine engine)
        {
            _config = config;
            _engine = engine;
            _engine.StatusChanged += (s, e) => EngineStatusText.Text = _engine.Status;

            _loading = true;
            EngineCheck.IsChecked = config.EngineEnabled;
            LoadGpsSettings();
            _loading = false;
            if (config.EngineEnabled) _engine.Start();
            EngineStatusText.Text = _engine.Status;

            RefreshList(null);
            if (_config.Announcements.Count > 0) AnnouncementList.SelectedIndex = 0;
            else StartNew();
        }

        private void RefreshList(Announcement selected)
        {
            _loading = true;
            AnnouncementList.ItemsSource = null;
            AnnouncementList.ItemsSource = _config.Announcements;
            AnnouncementList.SelectedItem = selected;
            _loading = false;
        }

        private void StartNew()
        {
            DiscardPendingSound();
            _current = new Announcement();
            LoadForm(_current);
            AnnouncementList.SelectedItem = null;
            DeleteButton.IsEnabled = false;
        }

        private void LoadForm(Announcement announcement)
        {
            _loading = true;
            NameBox.Text = announcement.Name;
            TriggerCombo.SelectedIndex = announcement.Trigger == AnnouncementTrigger.Gps ? 0 : 1;
            LatitudeBox.Text = announcement.Latitude.ToString("0.000000", CultureInfo.InvariantCulture);
            LongitudeBox.Text = announcement.Longitude.ToString("0.000000", CultureInfo.InvariantCulture);
            DistanceBox.Text = announcement.DistanceMeters.ToString(CultureInfo.InvariantCulture);
            SoundBox.Text = announcement.SoundName ?? string.Empty;
            EnabledCheck.IsChecked = announcement.Enabled;
            _loading = false;
            UpdateDistanceLabel();
        }

        private string SelectedTrigger()
        {
            var item = TriggerCombo.SelectedItem as ComboBoxItem;
            return item != null ? (string)item.Tag : AnnouncementTrigger.PreAnnouncement;
        }

        private void UpdateDistanceLabel()
        {
            DistanceLabel.Text = SelectedTrigger() == AnnouncementTrigger.Gps
                ? "Rayon de déclenchement (m) :"
                : "Distance avant le point (m) :";
        }

        private void TriggerCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (!_loading) UpdateDistanceLabel();
        }

        private void AnnouncementList_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_loading) return;
            var selected = AnnouncementList.SelectedItem as Announcement;
            if (selected == null) return;
            DiscardPendingSound();
            _current = selected;
            LoadForm(selected);
            DeleteButton.IsEnabled = true;
        }

        private void NewButton_Click(object sender, RoutedEventArgs e)
        {
            StartNew();
        }

        private static bool TryParseNumber(string text, out double value)
        {
            return double.TryParse((text ?? string.Empty).Trim().Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out value);
        }

        private void ImportButton_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new OpenFileDialog
            {
                Title = "Importer un fichier son",
                Filter = "Fichiers audio (*.wav;*.mp3;*.wma)|*.wav;*.mp3;*.wma",
            };
            if (dialog.ShowDialog() != true) return;

            try
            {
                var stored = SaeivStore.Import(dialog.FileName, SaeivStore.SoundsFolder, SaeivStore.SoundExtensions, SaeivStore.MaxSoundBytes);
                DiscardPendingSound();
                _pendingSoundFile = stored;
                _pendingSoundName = System.IO.Path.GetFileName(dialog.FileName);
                SoundBox.Text = _pendingSoundName;
            }
            catch (Exception exception)
            {
                MessageBox.Show(exception.Message, "Import impossible", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

        private void DiscardPendingSound()
        {
            if (_pendingSoundFile != null) SaeivStore.DeleteStored(SaeivStore.SoundsFolder, _pendingSoundFile);
            _pendingSoundFile = null;
            _pendingSoundName = null;
        }

        private void ListenButton_Click(object sender, RoutedEventArgs e)
        {
            var file = _pendingSoundFile ?? (_current != null ? _current.SoundFile : null);
            if (string.IsNullOrEmpty(file))
            {
                MessageBox.Show("Importez d'abord un fichier son.", "Écouter", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }
            _engine.PlayTest(SaeivStore.ResolvePath(SaeivStore.SoundsFolder, file));
        }

        private void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            var name = NameBox.Text.Trim();
            double latitude, longitude, distance;
            if (name.Length == 0)
            {
                Warn("Saisissez un nom pour l'annonce.");
                return;
            }
            if (!TryParseNumber(LatitudeBox.Text, out latitude) || latitude < -90 || latitude > 90)
            {
                Warn("La latitude doit être un nombre compris entre -90 et 90.");
                return;
            }
            if (!TryParseNumber(LongitudeBox.Text, out longitude) || longitude < -180 || longitude > 180)
            {
                Warn("La longitude doit être un nombre compris entre -180 et 180.");
                return;
            }
            if (!TryParseNumber(DistanceBox.Text, out distance) || distance < 5 || distance > 5000)
            {
                Warn("La distance doit être comprise entre 5 et 5000 mètres.");
                return;
            }
            if (_pendingSoundFile == null && string.IsNullOrEmpty(_current.SoundFile))
            {
                Warn("Importez un fichier son pour cette annonce.");
                return;
            }

            var previousSound = _current.SoundFile;
            _current.Name = name;
            _current.Trigger = SelectedTrigger();
            _current.Latitude = latitude;
            _current.Longitude = longitude;
            _current.DistanceMeters = (int)Math.Round(distance);
            _current.Enabled = EnabledCheck.IsChecked == true;
            if (_pendingSoundFile != null)
            {
                _current.SoundFile = _pendingSoundFile;
                _current.SoundName = _pendingSoundName;
                _pendingSoundFile = null;
                _pendingSoundName = null;
            }
            if (!_config.Announcements.Contains(_current)) _config.Announcements.Add(_current);

            try
            {
                SaeivStore.Save(_config);
            }
            catch (Exception exception)
            {
                Warn("L'enregistrement a échoué : " + exception.Message);
                return;
            }

            if (previousSound != null && previousSound != _current.SoundFile) SaeivStore.DeleteStored(SaeivStore.SoundsFolder, previousSound);
            RefreshList(_current);
            DeleteButton.IsEnabled = true;
        }

        private void DeleteButton_Click(object sender, RoutedEventArgs e)
        {
            if (_current == null || !_config.Announcements.Contains(_current)) return;
            var answer = MessageBox.Show("Supprimer l'annonce « " + _current.Name + " » ?", "Confirmation", MessageBoxButton.YesNo, MessageBoxImage.Question);
            if (answer != MessageBoxResult.Yes) return;

            var removed = _current;
            _config.Announcements.Remove(removed);
            try
            {
                SaeivStore.Save(_config);
            }
            catch (Exception exception)
            {
                _config.Announcements.Add(removed);
                Warn("La suppression a échoué : " + exception.Message);
                return;
            }
            SaeivStore.DeleteStored(SaeivStore.SoundsFolder, removed.SoundFile);
            RefreshList(null);
            if (_config.Announcements.Count > 0) AnnouncementList.SelectedIndex = 0;
            else StartNew();
        }

        private void LoadGpsSettings()
        {
            var source = _config.GpsSource;
            GpsSourceCombo.SelectedIndex = source == GpsSettings.Windows ? 1 : source == GpsSettings.Serial ? 2 : 0;

            GpsPortCombo.Items.Clear();
            GpsPortCombo.Items.Add(GpsSettings.Auto);
            foreach (var name in System.IO.Ports.SerialPort.GetPortNames().OrderBy(item => item, StringComparer.OrdinalIgnoreCase)) GpsPortCombo.Items.Add(name);
            GpsPortCombo.Text = string.IsNullOrWhiteSpace(_config.GpsPort) ? GpsSettings.Auto : _config.GpsPort;

            GpsBaudCombo.Items.Clear();
            foreach (var baud in GpsSettings.BaudRates) GpsBaudCombo.Items.Add(baud);
            GpsBaudCombo.SelectedItem = GpsSettings.BaudRates.Contains(_config.GpsBaud) ? _config.GpsBaud : 9600;
        }

        private void GpsSettings_Changed(object sender, RoutedEventArgs e)
        {
            if (_loading || _config == null) return;
            var item = GpsSourceCombo.SelectedItem as ComboBoxItem;
            var source = item != null ? (string)item.Tag : GpsSettings.Auto;
            var port = string.IsNullOrWhiteSpace(GpsPortCombo.Text) ? GpsSettings.Auto : GpsPortCombo.Text.Trim().ToUpperInvariant();
            var baud = GpsBaudCombo.SelectedItem is int ? (int)GpsBaudCombo.SelectedItem : 9600;
            if (source == _config.GpsSource && port == _config.GpsPort && baud == _config.GpsBaud) return;

            _config.GpsSource = source;
            _config.GpsPort = port;
            _config.GpsBaud = baud;
            try { SaeivStore.Save(_config); } catch (Exception) { }
            _engine.Restart();
            EngineStatusText.Text = _engine.Status;
        }

        private void EngineCheck_Changed(object sender, RoutedEventArgs e)
        {
            if (_loading || _config == null) return;
            var enabled = EngineCheck.IsChecked == true;
            _config.EngineEnabled = enabled;
            try { SaeivStore.Save(_config); } catch (Exception) { }
            if (enabled) _engine.Start(); else _engine.Stop();
            EngineStatusText.Text = _engine.Status;
        }

        private static void Warn(string message)
        {
            MessageBox.Show(message, "Annonce sonore", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
    }
}
