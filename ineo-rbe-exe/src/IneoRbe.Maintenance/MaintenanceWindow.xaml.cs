using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Maintenance
{
    [DataContract]
    internal sealed class PublishedContent
    {
        [DataMember(Name = "revision")] public string Revision { get; set; }

        // Dernière révision publiée par le serveur, ou null si le serveur est injoignable.
        public static PublishedContent Fetch(string serial)
        {
            try
            {
                var url = ApiEndpoints.ContentRevisionUrl + (string.IsNullOrEmpty(serial) ? string.Empty : "?serial=" + Uri.EscapeDataString(serial));
                var response = HttpTransport.Send("GET", url, null, null, 15000);
                if (!response.IsSuccess) return null;
                using (var stream = new System.IO.MemoryStream(response.Body))
                {
                    return (PublishedContent)new DataContractJsonSerializer(typeof(PublishedContent)).ReadObject(stream);
                }
            }
            catch (Exception) { return null; }
        }

        public static string Compare(string ucRevision, PublishedContent published)
        {
            if (published == null) return "Révision publiée : impossible de joindre le serveur depuis ce PC.";
            if (string.IsNullOrEmpty(published.Revision)) return "Révision publiée : aucune pour l'instant.";
            if (ucRevision == published.Revision) return "Révision publiée : " + published.Revision + " → l'UC est à jour.";
            return "Révision publiée : " + published.Revision + " → l'UC n'est PAS à jour (" + (string.IsNullOrEmpty(ucRevision) ? "aucune" : ucRevision) + "). Utilisez « Forcer le contenu ».";
        }
    }
}

namespace IneoRbe.Maintenance
{
    public partial class MaintenanceWindow : Window
    {
        private static readonly TimeSpan StatusRefresh = TimeSpan.FromSeconds(10);

        private readonly StartupContext _context;
        private readonly DispatcherTimer _timer = new DispatcherTimer();
        private readonly Version _version = typeof(MaintenanceWindow).Assembly.GetName().Version;
        private UcChannel _channel;
        private MirrorWindow _mirror;
        private bool _busy;
        private string _ucVersion;
        private string _ucSerial;
        private UpdateDescriptor _pendingUpdate;

        public MaintenanceWindow(StartupContext context)
        {
            _context = context;
            InitializeComponent();
            FillInfo();
            RefreshPorts();
            ShowStatuses(null, "Aucun UC connecté");

            if (!string.IsNullOrEmpty(context.UpdateNotice)) UpdateText.Text = context.UpdateNotice;

            _timer.Interval = StatusRefresh;
            _timer.Tick += (sender, args) => RefreshStatuses();
            Closed += (sender, args) => Disconnect();
        }

        // ----- Onglet « Ce PC » -----

        private void FillInfo()
        {
            var auth = _context.Authorization;
            string authText;
            switch (auth == null ? AuthState.Offline : auth.State)
            {
                case AuthState.Allowed: authText = "Autorisé" + (string.IsNullOrEmpty(auth.PcName) ? "" : " (" + auth.PcName + ")"); break;
                default: authText = "Non vérifié (serveur injoignable)"; break;
            }
            HeaderAuthText.Text = authText;

            var rows = new[]
            {
                new[] { "Logiciel", "Inéo RétroBus Maintenance" },
                new[] { "Version", ReleaseVersion.Format(_version) },
                new[] { "N° de série du PC", string.IsNullOrEmpty(_context.Serial) ? "Illisible" : _context.Serial },
                new[] { "Nom du poste", Environment.MachineName },
                new[] { "Utilisateur", Environment.UserName },
                new[] { "Système", Environment.OSVersion.VersionString + (Environment.Is64BitOperatingSystem ? " (64 bits)" : " (32 bits)") },
                new[] { ".NET", Environment.Version.ToString() },
                new[] { "Date et heure du PC", DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss", CultureInfo.InvariantCulture) },
                new[] { "Certificats chargés", _context.CertificateCount.ToString(CultureInfo.InvariantCulture) },
                new[] { "Serveur RétroBus", _context.ServerReachable ? "Joignable" : "Injoignable" },
                new[] { "Autorisation du poste", authText },
            };

            for (var i = 0; i < rows.Length; i++)
            {
                InfoGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                AddCell(rows[i][0], i, 0, true);
                AddCell(rows[i][1], i, 1, false);
            }
        }

        private void AddCell(string text, int row, int column, bool bold)
        {
            var block = new TextBlock { Text = text, Margin = new Thickness(0, 2, 0, 2), TextWrapping = TextWrapping.Wrap };
            if (bold) block.FontWeight = FontWeights.SemiBold;
            Grid.SetRow(block, row);
            Grid.SetColumn(block, column);
            InfoGrid.Children.Add(block);
        }

        private string Serial { get { return _context.Serial; } }

        private void CheckUpdateButton_Click(object sender, RoutedEventArgs e)
        {
            CheckUpdateButton.IsEnabled = false;
            InstallUpdateButton.Visibility = Visibility.Collapsed;
            UpdateText.Text = "Recherche en cours…";
            ThreadPool.QueueUserWorkItem(delegate
            {
                UpdateCheckResult result = null;
                string error = null;
                try { result = new UpdateClient("MAINTENANCE", Serial).CheckForUpdate(); }
                catch (Exception exception) { error = exception.Message; }

                Dispatcher.BeginInvoke(new Action(() =>
                {
                    CheckUpdateButton.IsEnabled = true;
                    if (error != null) { UpdateText.Text = "Recherche impossible : " + error; return; }
                    if (result == null || !result.UpdateAvailable)
                    {
                        UpdateText.Text = "Ce logiciel est à jour (" + ReleaseVersion.Format(_version) + ").";
                        return;
                    }
                    _pendingUpdate = result.Update;
                    UpdateText.Text = "Version " + result.Update.Version + " disponible." + (string.IsNullOrEmpty(result.Update.ReleaseNotes) ? "" : "\n" + result.Update.ReleaseNotes);
                    InstallUpdateButton.Visibility = Visibility.Visible;
                }));
            });
        }

        private void InstallUpdateButton_Click(object sender, RoutedEventArgs e)
        {
            var update = _pendingUpdate;
            if (update == null) return;
            if (!BrandDialog.Show(this, "Mise à jour", "Installer la version " + update.Version + " ? Le logiciel va se fermer puis redémarrer.", true)) return;

            InstallUpdateButton.IsEnabled = false;
            CheckUpdateButton.IsEnabled = false;
            UpdateText.Text = "Téléchargement…";
            ThreadPool.QueueUserWorkItem(delegate
            {
                string path = null;
                string error = null;
                var target = update;
                try
                {
                    var client = new UpdateClient("MAINTENANCE", Serial);
                    target = client.Latest(update);
                    path = client.DownloadAndVerifyInstaller(target);
                }
                catch (Exception exception) { error = exception.Message; }

                Dispatcher.BeginInvoke(new Action(() =>
                {
                    if (error == null)
                    {
                        try
                        {
                            UpdateInstaller.Launch(path, target.Version);
                            Application.Current.Shutdown();
                            return;
                        }
                        catch (Exception exception) { error = exception.Message; }
                    }
                    UpdateText.Text = "Échec de la mise à jour : " + error;
                    InstallUpdateButton.IsEnabled = true;
                    CheckUpdateButton.IsEnabled = true;
                }));
            });
        }

        // ----- Onglet « Wi-Fi » -----

        private void ScanButton_Click(object sender, RoutedEventArgs e)
        {
            ScanButton.IsEnabled = false;
            ScanBar.Value = 0;
            ScanBar.Visibility = Visibility.Visible;
            ScanText.Text = "Recherche…";
            UcList.Items.Clear();
            ThreadPool.QueueUserWorkItem(delegate
            {
                var found = UcScanner.Scan(percent => Dispatcher.BeginInvoke(new Action(() => ScanBar.Value = percent)));
                Dispatcher.BeginInvoke(new Action(() =>
                {
                    foreach (var uc in found) UcList.Items.Add(new ListBoxItem { Content = Describe(uc), Tag = uc.Address });
                    ScanBar.Visibility = Visibility.Collapsed;
                    ScanButton.IsEnabled = true;
                    ScanText.Text = found.Count == 0 ? "Aucun UC détecté." : found.Count + " UC détecté(s).";
                }));
            });
        }

        private static string Describe(DetectedUc uc)
        {
            return uc.Address + "   SN " + uc.Serial + "   v" + uc.Version + "   " + uc.Hostname;
        }

        private void ConnectListButton_Click(object sender, RoutedEventArgs e)
        {
            var item = UcList.SelectedItem as ListBoxItem;
            if (item == null) { ScanText.Text = "Sélectionnez un UC dans la liste."; return; }
            Connect(new HttpUcChannel((string)item.Tag));
        }

        private void ConnectManualButton_Click(object sender, RoutedEventArgs e)
        {
            var host = ManualHostBox.Text.Trim();
            if (host.Length == 0) { ScanText.Text = "Saisissez une adresse."; return; }
            Connect(new HttpUcChannel(host));
        }

        // ----- Onglet « USB-USB » -----

        private void RefreshPorts()
        {
            PortCombo.Items.Clear();
            foreach (var name in System.IO.Ports.SerialPort.GetPortNames()) PortCombo.Items.Add(name);
            if (PortCombo.Items.Count > 0) PortCombo.SelectedIndex = 0;
            SerialText.Text = PortCombo.Items.Count == 0 ? "Aucun port série détecté." : "";
        }

        private void RefreshPortsButton_Click(object sender, RoutedEventArgs e) { RefreshPorts(); }

        private void ConnectSerialButton_Click(object sender, RoutedEventArgs e)
        {
            var name = PortCombo.SelectedItem as string;
            if (name == null) { SerialText.Text = "Choisissez un port."; return; }
            try { Connect(new SerialUcChannel(name)); }
            catch (Exception exception) { SerialText.Text = "Ouverture impossible : " + exception.Message; }
        }

        // ----- Liaison UC -----

        private void Connect(UcChannel channel)
        {
            Disconnect();
            LinkText.Text = "Connexion à " + channel.Description + "…";
            Tabs.SelectedItem = UcTab;
            ThreadPool.QueueUserWorkItem(delegate
            {
                MaintenanceReply reply = null;
                string error = null;
                try { reply = channel.Request(MaintenanceProtocol.Info); }
                catch (Exception exception) { error = exception.Message; }

                Dispatcher.BeginInvoke(new Action(() =>
                {
                    if (reply == null || !reply.Ok)
                    {
                        channel.Dispose();
                        LinkText.Text = "Connexion impossible : " + (error ?? (reply == null ? "pas de réponse" : reply.Error));
                        ShowStatuses(null, "Connexion échouée");
                        return;
                    }
                    _channel = channel;
                    _ucVersion = reply.Version;
                    LinkText.Text = "Connecté : " + channel.Description;
                    ShowInfo(reply);
                    ShowStatuses(reply, null);
                    _timer.Start();
                }));
            });
        }

        private void Disconnect()
        {
            _timer.Stop();
            if (_mirror != null) { _mirror.Close(); _mirror = null; }
            var channel = _channel;
            _channel = null;
            if (channel != null) channel.Dispose();
            if (UcSerialText != null) UcSerialText.Text = "Aucun";
        }

        private void DisconnectButton_Click(object sender, RoutedEventArgs e)
        {
            Disconnect();
            LinkText.Text = "Déconnecté.";
            ResultBox.Text = "";
            ShowStatuses(null, "Aucun UC connecté");
        }

        // Exécute une commande sur l'UC sans bloquer l'interface ; la liaison perdue repasse tout en rouge.
        private void Query(Action<MaintenanceReply> onReply)
        {
            var channel = _channel;
            if (channel == null) { ResultBox.Text = "Aucun UC connecté."; return; }
            if (_busy) return;
            _busy = true;
            ThreadPool.QueueUserWorkItem(delegate
            {
                MaintenanceReply reply = null;
                string error = null;
                try { reply = channel.Request(MaintenanceProtocol.Info); }
                catch (Exception exception) { error = exception.Message; }

                Dispatcher.BeginInvoke(new Action(() =>
                {
                    _busy = false;
                    if (channel != _channel) return;
                    if (reply == null || !reply.Ok)
                    {
                        var lost = error ?? (reply == null ? "pas de réponse" : reply.Error);
                        ResultBox.Text = "Liaison perdue : " + lost;
                        ShowStatuses(null, "Liaison perdue");
                        return;
                    }
                    ShowStatuses(reply, null);
                    onReply(reply);
                }));
            });
        }

        private void RefreshStatuses() { Query(reply => { }); }

        private void InfoButton_Click(object sender, RoutedEventArgs e) { Query(ShowInfo); }
        private void RefreshAllButton_Click(object sender, RoutedEventArgs e) { Query(ShowInfo); }

        private void TimeButton_Click(object sender, RoutedEventArgs e)
        {
            Query(reply => ResultBox.Text = "Date et heure de l'UC : " + reply.DeviceTime + "\nFuseau : " + reply.TimeZone
                + "\nDate et heure de ce PC : " + DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss", CultureInfo.InvariantCulture));
        }

        private void PositionButton_Click(object sender, RoutedEventArgs e)
        {
            Query(reply => ResultBox.Text = reply.HasPosition
                ? string.Format(CultureInfo.InvariantCulture, "Position de l'UC : {0:0.00000}, {1:0.00000}\nAge de la position : {2} s", reply.Latitude, reply.Longitude, reply.PositionAgeSeconds)
                : "Position de l'UC : aucune position GPS reçue.");
        }

        private void ContentButton_Click(object sender, RoutedEventArgs e)
        {
            ResultBox.Text = "Lecture des révisions…";
            Query(reply =>
            {
                ResultBox.Text = "Révision de contenu de l'UC : " + (string.IsNullOrEmpty(reply.ContentRevision) ? "aucune" : reply.ContentRevision)
                    + "\nRévision des écrans : " + (string.IsNullOrEmpty(reply.ScreensRevision) ? "—" : reply.ScreensRevision);
                var ucRevision = reply.ContentRevision;
                var serial = string.IsNullOrEmpty(reply.Serial) ? _ucSerial : reply.Serial;
                ThreadPool.QueueUserWorkItem(delegate
                {
                    var published = PublishedContent.Fetch(serial);
                    Dispatcher.BeginInvoke(new Action(() => ResultBox.Text += "\n" + PublishedContent.Compare(ucRevision, published)));
                });
            });
        }

        // Force la synchronisation du contenu : l'UC récupère lui-même la dernière révision publiée (Wi-Fi ou câble, mais il lui faut Internet).
        private void ForceContentButton_Click(object sender, RoutedEventArgs e)
        {
            var channel = _channel;
            if (channel == null) { ResultBox.Text = "Aucun UC connecté."; return; }
            if (_busy) { ResultBox.Text = "Une requête est déjà en cours, réessayez."; return; }
            _busy = true;
            var serialForCheck = _ucSerial;
            ResultBox.Text = "Mise à jour du contenu de l'UC en cours…";
            ThreadPool.QueueUserWorkItem(delegate
            {
                MaintenanceReply reply = null;
                string error = null;
                try { reply = channel.Request(MaintenanceProtocol.Content); }
                catch (Exception exception) { error = exception.Message; }
                var published = PublishedContent.Fetch(serialForCheck);

                Dispatcher.BeginInvoke(new Action(() =>
                {
                    _busy = false;
                    if (reply == null || !reply.Ok)
                    {
                        var detail = error ?? (reply == null ? "pas de réponse" : reply.Error);
                        if (error != null && error.Contains("404")) detail = "cet UC ne gère pas encore la révision de contenu : mettez-le à jour (26.11.005 ou plus récent).";
                        ResultBox.Text = "Mise à jour du contenu impossible : " + detail;
                        return;
                    }
                    ResultBox.Text = reply.Message + "\n" + PublishedContent.Compare(reply.ContentRevision, published);
                    RefreshStatuses();
                }));
            });
        }

        private void ShowInfo(MaintenanceReply reply)
        {
            var text = new StringBuilder();
            text.AppendLine("N° de série UC : " + reply.Serial);
            text.AppendLine("Version : " + reply.Version);
            text.AppendLine("Poste : " + reply.Hostname);
            text.AppendLine("Date et heure : " + reply.DeviceTime + " (" + reply.TimeZone + ")");
            text.AppendLine("Profil véhicule : " + (string.IsNullOrEmpty(reply.Profile) ? "—" : reply.Profile));
            text.AppendLine("Position : " + (reply.HasPosition ? string.Format(CultureInfo.InvariantCulture, "{0:0.00000}, {1:0.00000} (il y a {2} s)", reply.Latitude, reply.Longitude, reply.PositionAgeSeconds) : "aucune"));
            text.AppendLine("Révision de contenu : " + (string.IsNullOrEmpty(reply.ContentRevision) ? "—" : reply.ContentRevision));
            if (!string.IsNullOrEmpty(reply.UpdateVersion)) text.AppendLine("Mise à jour disponible : " + reply.UpdateVersion);
            ResultBox.Text = text.ToString();
        }

        // Ordre de mise à jour à distance : l'UC télécharge et installe lui-même la version officielle, puis redémarre.
        private void RemoteUpdateButton_Click(object sender, RoutedEventArgs e)
        {
            var channel = _channel;
            if (channel == null) { ResultBox.Text = "Aucun UC connecté."; return; }
            if (_busy) { ResultBox.Text = "Une requête est déjà en cours, réessayez."; return; }
            if (!BrandDialog.Show(this, "Mise à jour de l'UC", "Lancer la mise à jour de l'UC ? S'il existe une version plus récente, l'UC l'installera puis redémarrera (la liaison sera coupée).", true)) return;

            _busy = true;
            ResultBox.Text = "Recherche de mise à jour sur l'UC…";
            ThreadPool.QueueUserWorkItem(delegate
            {
                MaintenanceReply reply = null;
                string error = null;
                try { reply = channel.Request(MaintenanceProtocol.Update); }
                catch (Exception exception) { error = exception.Message; }

                Dispatcher.BeginInvoke(new Action(() =>
                {
                    _busy = false;
                    if (reply == null || !reply.Ok)
                    {
                        var detail = error ?? (reply == null ? "pas de réponse" : reply.Error);
                        // Un UC antérieur à la 26.11.003 ne connaît pas la commande (erreur 404) : il faut l'installer une première fois sur le poste.
                        if (error != null && error.Contains("404"))
                        {
                            detail = "cet UC (version " + _ucVersion + ") ne gère pas encore la mise à jour à distance. Sur le poste de l'UC, ouvrez le logiciel puis cliquez sur « Installer la mise à jour » une première fois (version 26.11.004 ou plus récente) ; ensuite elle pourra se faire depuis Maintenance. Le miroir reste aussi blanc sur les UC antérieurs à la 26.11.004.";
                        }
                        ResultBox.Text = "Mise à jour impossible : " + detail;
                        return;
                    }
                    ResultBox.Text = reply.Message + (string.IsNullOrEmpty(reply.UpdateVersion) ? "" : "\nReconnectez-vous à l'UC une fois redémarré pour vérifier la version.");
                }));
            });
        }

        // Redémarre uniquement le logiciel de l'UC : évite de couper le bus pour recharger la configuration.
        private void RestartUcButton_Click(object sender, RoutedEventArgs e)
        {
            var channel = _channel;
            if (channel == null) { ResultBox.Text = "Aucun UC connecté."; return; }
            if (_busy) { ResultBox.Text = "Une requête est déjà en cours, réessayez."; return; }
            if (!BrandDialog.Show(this, "Redémarrer l'UC", "Redémarrer le logiciel de l'UC ? La liaison sera coupée quelques secondes, les annonces d'allumage seront rejouées.", true)) return;

            _busy = true;
            ResultBox.Text = "Ordre de redémarrage envoyé…";
            ThreadPool.QueueUserWorkItem(delegate
            {
                MaintenanceReply reply = null;
                string error = null;
                try { reply = channel.Request(MaintenanceProtocol.Restart); }
                catch (Exception exception) { error = exception.Message; }

                Dispatcher.BeginInvoke(new Action(() =>
                {
                    _busy = false;
                    if (reply == null || !reply.Ok)
                    {
                        var detail = error ?? (reply == null ? "pas de réponse" : reply.Error);
                        if (error != null && error.Contains("404")) detail = "cet UC ne gère pas encore le redémarrage à distance : installez la dernière version sur le poste.";
                        ResultBox.Text = "Redémarrage impossible : " + detail;
                        return;
                    }
                    ResultBox.Text = reply.Message + "\nReconnectez-vous à l'UC une fois redémarré.";
                }));
            });
        }

        private void MirrorButton_Click(object sender, RoutedEventArgs e)
        {
            if (_channel == null) { ResultBox.Text = "Aucun UC connecté."; return; }
            if (_mirror != null) { _mirror.Activate(); return; }
            _mirror = new MirrorWindow(_channel);
            _mirror.Closed += (s, a) => _mirror = null;
            _mirror.Show();
        }

        // ----- Voyants -----

        private void ShowStatuses(MaintenanceReply reply, string disconnectedText)
        {
            StatusGrid.Children.Clear();
            if (reply == null)
            {
                UcSerialText.Text = "Aucun";
                AddStatus("Connexion", MaintenanceProtocol.Ko, disconnectedText);
                return;
            }

            UcSerialText.Text = string.IsNullOrEmpty(reply.Serial) ? "SN inconnu" : reply.Serial;
            if (!string.IsNullOrEmpty(reply.Serial)) _ucSerial = reply.Serial;
            AddStatus("Connexion", MaintenanceProtocol.Ok, null);
            if (reply.Statuses == null) return;
            foreach (var item in reply.Statuses)
            {
                if (item.Name == "Connexion") continue;
                AddStatus(item.Name, item.Level, item.Detail);
            }
        }

        private void AddStatus(string name, string level, string detail)
        {
            Brush color;
            switch (level)
            {
                case MaintenanceProtocol.Ok: color = Brushes.LimeGreen; break;
                case MaintenanceProtocol.Ko: color = Brushes.Red; break;
                case MaintenanceProtocol.Warn: color = Brushes.Orange; break;
                default: color = Brushes.Gray; break;
            }
            var panel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 1, 12, 1) };
            panel.Children.Add(new System.Windows.Shapes.Ellipse { Width = 12, Height = 12, Fill = color, Margin = new Thickness(0, 0, 6, 0), VerticalAlignment = VerticalAlignment.Center });
            panel.Children.Add(new TextBlock { Text = name + (string.IsNullOrEmpty(detail) ? "" : " : " + detail), Foreground = Brushes.White, FontSize = 11, VerticalAlignment = VerticalAlignment.Center });
            StatusGrid.Children.Add(panel);
        }
    }
}
