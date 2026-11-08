using System;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Desktop.Views
{
    public partial class GpsSettingsView : UserControl
    {
        private SaeivConfig _config;
        private AnnouncementEngine _engine;
        private bool _loading;

        public GpsSettingsView()
        {
            InitializeComponent();
        }

        public void Initialize(SaeivConfig config, AnnouncementEngine engine)
        {
            _config = config;
            _engine = engine;
            _engine.StatusChanged += (s, e) => EngineStatusText.Text = _engine.Status;

            _loading = true;
            LoadGpsSettings();
            _loading = false;
            if (config.EngineEnabled) _engine.Start();
            EngineStatusText.Text = _engine.Status;
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

            MaintenancePortCombo.Items.Clear();
            MaintenancePortCombo.Items.Add("NONE");
            foreach (var name in System.IO.Ports.SerialPort.GetPortNames().OrderBy(item => item, StringComparer.OrdinalIgnoreCase)) MaintenancePortCombo.Items.Add(name);
            MaintenancePortCombo.Text = string.IsNullOrWhiteSpace(_config.MaintenancePort) ? "NONE" : _config.MaintenancePort;
        }

        private void MaintenancePort_Changed(object sender, RoutedEventArgs e)
        {
            if (_loading || _config == null) return;
            var port = string.IsNullOrWhiteSpace(MaintenancePortCombo.Text) ? "NONE" : MaintenancePortCombo.Text.Trim().ToUpperInvariant();
            if (port == _config.MaintenancePort) return;
            _config.MaintenancePort = port;
            try { SaeivStore.Save(_config); } catch (Exception) { }
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
    }
}
