using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using IneoRbe.Desktop.Services;
using Microsoft.Win32;

namespace IneoRbe.Planning
{
    // Configurateur SAEIV : annonces sonores et écrans d'un véhicule, enregistrés localement puis exportables vers l'UC.
    public sealed class ConfiguratorView : DockPanel
    {
        private readonly SaeivConfig _config = SaeivStore.Load();
        private readonly ListBox _announcementList = new ListBox { MinWidth = 260 };
        private readonly ListBox _screenList = new ListBox { MinWidth = 260 };
        private readonly TextBlock _status = Ui.Text(string.Empty, 11, false, Ui.Muted);
        private bool _loading;

        private readonly TextBox _name = new TextBox();
        private readonly ComboBox _trigger = new ComboBox();
        private readonly TextBox _latitude = new TextBox();
        private readonly TextBox _longitude = new TextBox();
        private readonly TextBox _distance = new TextBox();
        private readonly TextBlock _sound = Ui.Text(string.Empty, 12);
        private readonly CheckBox _enabled = new CheckBox { Content = "Annonce activée", Margin = new Thickness(0, 8, 0, 0) };

        private readonly TextBox _screenName = new TextBox();
        private readonly TextBlock _offline = Ui.Text(string.Empty, 12);
        private readonly TextBlock _online = Ui.Text(string.Empty, 12);

        public ConfiguratorView()
        {
            Margin = new Thickness(14);
            var engine = new CheckBox { Content = "Moteur d'annonces actif", IsChecked = _config.EngineEnabled, Margin = new Thickness(12, 4, 0, 0), VerticalAlignment = VerticalAlignment.Center };
            engine.Click += (s, e) => { _config.EngineEnabled = engine.IsChecked == true; };
            var bar = Ui.Toolbar(Ui.Button("Enregistrer", (s, e) => Save(), true), Ui.Button("Exporter vers l'UC…", (s, e) => Export()), engine);
            SetDock(bar, Dock.Top);
            Children.Add(Ui.Title("Configurateur SAEIV"));
            SetDock(Children[0], Dock.Top);
            Children.Add(Ui.Text("Annonces et écrans de l'UC. Enregistrez, puis exportez le dossier vers une clé USB à copier dans C:\\ProgramData\\IneoRbe de l'UC.", 11, false, Ui.Muted));
            SetDock(Children[1], Dock.Top);
            Children.Add(bar);
            SetDock(_status, Dock.Bottom);
            Children.Add(_status);

            var tabs = new TabControl();
            tabs.Items.Add(new TabItem { Header = "Annonces", Content = BuildAnnouncements() });
            tabs.Items.Add(new TabItem { Header = "Écrans", Content = BuildScreens() });
            Children.Add(tabs);

            _trigger.Items.Add("Pré-annonce");
            _trigger.Items.Add("Point GPS");
            RefreshAnnouncements(-1);
            RefreshScreens(-1);
        }

        private static StackPanel Field(string label, UIElement control)
        {
            var panel = new StackPanel { Margin = new Thickness(0, 0, 0, 8) };
            panel.Children.Add(Ui.Text(label, 11, true, Ui.Muted));
            panel.Children.Add(control);
            return panel;
        }

        private UIElement BuildAnnouncements()
        {
            var grid = new Grid { Margin = new Thickness(0, 10, 0, 0) };
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            grid.ColumnDefinitions.Add(new ColumnDefinition());

            var left = new DockPanel { Margin = new Thickness(0, 0, 12, 0) };
            var buttons = Ui.Toolbar(Ui.Button("Ajouter", (s, e) => AddAnnouncement()), Ui.Button("Supprimer", (s, e) => RemoveAnnouncement()));
            DockPanel.SetDock(buttons, Dock.Bottom);
            left.Children.Add(buttons);
            left.Children.Add(_announcementList);
            grid.Children.Add(left);

            var form = new StackPanel { Width = 420, HorizontalAlignment = HorizontalAlignment.Left };
            form.Children.Add(Field("Nom", _name));
            form.Children.Add(Field("Déclencheur", _trigger));
            form.Children.Add(Field("Latitude", _latitude));
            form.Children.Add(Field("Longitude", _longitude));
            form.Children.Add(Field("Distance de déclenchement (m)", _distance));
            var soundRow = new StackPanel { Orientation = Orientation.Horizontal };
            soundRow.Children.Add(Ui.Button("Choisir un son…", (s, e) => ChooseSound()));
            soundRow.Children.Add(_sound);
            form.Children.Add(Field("Fichier son (wav, mp3, wma)", soundRow));
            form.Children.Add(_enabled);
            Grid.SetColumn(form, 1);
            grid.Children.Add(form);

            _announcementList.SelectionChanged += (s, e) => LoadAnnouncement();
            _name.TextChanged += (s, e) => ApplyAnnouncement();
            _trigger.SelectionChanged += (s, e) => ApplyAnnouncement();
            _latitude.TextChanged += (s, e) => ApplyAnnouncement();
            _longitude.TextChanged += (s, e) => ApplyAnnouncement();
            _distance.TextChanged += (s, e) => ApplyAnnouncement();
            _enabled.Click += (s, e) => ApplyAnnouncement();
            return grid;
        }

        private UIElement BuildScreens()
        {
            var grid = new Grid { Margin = new Thickness(0, 10, 0, 0) };
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            grid.ColumnDefinitions.Add(new ColumnDefinition());

            var left = new DockPanel { Margin = new Thickness(0, 0, 12, 0) };
            var buttons = Ui.Toolbar(Ui.Button("Ajouter", (s, e) => AddScreen()), Ui.Button("Supprimer", (s, e) => RemoveScreen()));
            DockPanel.SetDock(buttons, Dock.Bottom);
            left.Children.Add(buttons);
            left.Children.Add(_screenList);
            grid.Children.Add(left);

            var form = new StackPanel { Width = 420, HorizontalAlignment = HorizontalAlignment.Left };
            form.Children.Add(Field("Nom de l'écran", _screenName));
            var offlineRow = new StackPanel { Orientation = Orientation.Horizontal };
            offlineRow.Children.Add(Ui.Button("Choisir une image…", (s, e) => ChooseImage(false)));
            offlineRow.Children.Add(_offline);
            form.Children.Add(Field("Image hors ligne", offlineRow));
            var onlineRow = new StackPanel { Orientation = Orientation.Horizontal };
            onlineRow.Children.Add(Ui.Button("Choisir une image…", (s, e) => ChooseImage(true)));
            onlineRow.Children.Add(_online);
            form.Children.Add(Field("Image en ligne", onlineRow));
            Grid.SetColumn(form, 1);
            grid.Children.Add(form);

            _screenList.SelectionChanged += (s, e) => LoadScreen();
            _screenName.TextChanged += (s, e) => ApplyScreen();
            return grid;
        }

        private Announcement CurrentAnnouncement { get { var i = _announcementList.SelectedIndex; return i >= 0 && i < _config.Announcements.Count ? _config.Announcements[i] : null; } }
        private ScreenConfig CurrentScreen { get { var i = _screenList.SelectedIndex; return i >= 0 && i < _config.Screens.Count ? _config.Screens[i] : null; } }

        private void RefreshAnnouncements(int select)
        {
            _loading = true;
            _announcementList.Items.Clear();
            foreach (var item in _config.Announcements) _announcementList.Items.Add(item.DisplayText);
            _loading = false;
            _announcementList.SelectedIndex = select;
            LoadAnnouncement();
        }

        private void RefreshScreens(int select)
        {
            _loading = true;
            _screenList.Items.Clear();
            foreach (var item in _config.Screens) _screenList.Items.Add(item.DisplayText);
            _loading = false;
            _screenList.SelectedIndex = select;
            LoadScreen();
        }

        private void LoadAnnouncement()
        {
            if (_loading) return;
            var item = CurrentAnnouncement;
            _loading = true;
            _name.IsEnabled = _trigger.IsEnabled = _latitude.IsEnabled = _longitude.IsEnabled = _distance.IsEnabled = _enabled.IsEnabled = item != null;
            _name.Text = item == null ? string.Empty : item.Name;
            _trigger.SelectedIndex = item != null && item.Trigger == AnnouncementTrigger.Gps ? 1 : 0;
            _latitude.Text = item == null ? string.Empty : item.Latitude.ToString(CultureInfo.InvariantCulture);
            _longitude.Text = item == null ? string.Empty : item.Longitude.ToString(CultureInfo.InvariantCulture);
            _distance.Text = item == null ? string.Empty : item.DistanceMeters.ToString(CultureInfo.InvariantCulture);
            _sound.Text = item == null || string.IsNullOrEmpty(item.SoundName) ? "  (aucun son)" : "  " + item.SoundName;
            _enabled.IsChecked = item != null && item.Enabled;
            _loading = false;
        }

        private static double ParseDouble(string text)
        {
            double value;
            double.TryParse((text ?? string.Empty).Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out value);
            return value;
        }

        private void ApplyAnnouncement()
        {
            if (_loading) return;
            var item = CurrentAnnouncement;
            if (item == null) return;
            item.Name = _name.Text;
            item.Trigger = _trigger.SelectedIndex == 1 ? AnnouncementTrigger.Gps : AnnouncementTrigger.PreAnnouncement;
            item.Latitude = ParseDouble(_latitude.Text);
            item.Longitude = ParseDouble(_longitude.Text);
            item.DistanceMeters = (int)ParseDouble(_distance.Text);
            item.Enabled = _enabled.IsChecked == true;
            var index = _announcementList.SelectedIndex;
            _loading = true;
            _announcementList.Items[index] = item.DisplayText;
            _announcementList.SelectedIndex = index;
            _loading = false;
        }

        private void AddAnnouncement()
        {
            _config.Announcements.Add(new Announcement { Name = "Nouvelle annonce" });
            RefreshAnnouncements(_config.Announcements.Count - 1);
        }

        private void RemoveAnnouncement()
        {
            var item = CurrentAnnouncement;
            if (item == null || !Ui.Confirm("Supprimer l'annonce « " + item.Name + " » ?")) return;
            SaeivStore.DeleteStored(SaeivStore.SoundsFolder, item.SoundFile);
            _config.Announcements.Remove(item);
            RefreshAnnouncements(-1);
        }

        private void ChooseSound()
        {
            var item = CurrentAnnouncement;
            if (item == null) return;
            var dialog = new OpenFileDialog { Filter = "Sons (*.wav;*.mp3;*.wma)|*.wav;*.mp3;*.wma" };
            if (dialog.ShowDialog() != true) return;
            try
            {
                var stored = SaeivStore.Import(dialog.FileName, SaeivStore.SoundsFolder, SaeivStore.SoundExtensions, SaeivStore.MaxSoundBytes);
                SaeivStore.DeleteStored(SaeivStore.SoundsFolder, item.SoundFile);
                item.SoundFile = stored;
                item.SoundName = Path.GetFileName(dialog.FileName);
                LoadAnnouncement();
            }
            catch (Exception exception) { Ui.Error(exception.Message); }
        }

        private void LoadScreen()
        {
            if (_loading) return;
            var item = CurrentScreen;
            _loading = true;
            _screenName.IsEnabled = item != null;
            _screenName.Text = item == null ? string.Empty : item.Name;
            _offline.Text = item == null || string.IsNullOrEmpty(item.OfflineName) ? "  (aucune image)" : "  " + item.OfflineName;
            _online.Text = item == null || string.IsNullOrEmpty(item.OnlineName) ? "  (aucune image)" : "  " + item.OnlineName;
            _loading = false;
        }

        private void ApplyScreen()
        {
            if (_loading) return;
            var item = CurrentScreen;
            if (item == null) return;
            item.Name = _screenName.Text;
            var index = _screenList.SelectedIndex;
            _loading = true;
            _screenList.Items[index] = item.DisplayText;
            _screenList.SelectedIndex = index;
            _loading = false;
        }

        private void AddScreen()
        {
            _config.Screens.Add(new ScreenConfig { Name = "Nouvel écran" });
            RefreshScreens(_config.Screens.Count - 1);
        }

        private void RemoveScreen()
        {
            var item = CurrentScreen;
            if (item == null || !Ui.Confirm("Supprimer l'écran « " + item.Name + " » ?")) return;
            SaeivStore.DeleteStored(SaeivStore.ScreensFolder, item.OfflineImage);
            SaeivStore.DeleteStored(SaeivStore.ScreensFolder, item.OnlineImage);
            _config.Screens.Remove(item);
            RefreshScreens(-1);
        }

        private void ChooseImage(bool online)
        {
            var item = CurrentScreen;
            if (item == null) return;
            var dialog = new OpenFileDialog { Filter = "Images (*.png;*.jpg;*.jpeg;*.bmp;*.gif)|*.png;*.jpg;*.jpeg;*.bmp;*.gif" };
            if (dialog.ShowDialog() != true) return;
            try
            {
                var stored = SaeivStore.Import(dialog.FileName, SaeivStore.ScreensFolder, SaeivStore.ImageExtensions, SaeivStore.MaxImageBytes);
                if (online) { SaeivStore.DeleteStored(SaeivStore.ScreensFolder, item.OnlineImage); item.OnlineImage = stored; item.OnlineName = Path.GetFileName(dialog.FileName); }
                else { SaeivStore.DeleteStored(SaeivStore.ScreensFolder, item.OfflineImage); item.OfflineImage = stored; item.OfflineName = Path.GetFileName(dialog.FileName); }
                LoadScreen();
            }
            catch (Exception exception) { Ui.Error(exception.Message); }
        }

        private void Save()
        {
            try
            {
                SaeivStore.Save(_config);
                _status.Text = "Configuration enregistrée (" + SaeivStore.RootDirectory + ").";
            }
            catch (Exception exception) { Ui.Error("Enregistrement impossible : " + exception.Message); }
        }

        private void Export()
        {
            Save();
            var dialog = new SaveFileDialog { FileName = "saeiv-config.json", Title = "Choisir le dossier de destination (clé USB)", Filter = "Configuration SAEIV|saeiv-config.json" };
            if (dialog.ShowDialog() != true) return;
            try
            {
                var target = Path.GetDirectoryName(dialog.FileName);
                File.Copy(Path.Combine(SaeivStore.RootDirectory, "saeiv-config.json"), Path.Combine(target, "saeiv-config.json"), true);
                foreach (var folder in new[] { SaeivStore.SoundsFolder, SaeivStore.ScreensFolder })
                {
                    var source = Path.Combine(SaeivStore.RootDirectory, folder);
                    if (!Directory.Exists(source)) continue;
                    var destination = Path.Combine(target, folder);
                    Directory.CreateDirectory(destination);
                    foreach (var file in Directory.GetFiles(source)) File.Copy(file, Path.Combine(destination, Path.GetFileName(file)), true);
                }
                _status.Text = "Exporté vers " + target + " : copiez ce contenu dans C:\\ProgramData\\IneoRbe de l'UC.";
            }
            catch (Exception exception) { Ui.Error("Export impossible : " + exception.Message); }
        }
    }
}
