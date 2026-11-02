using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.NetworkInformation;
using System.Reflection;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Desktop
{
    public partial class MainWindow : Window
    {
        private readonly UpdateClient _updateClient = new UpdateClient();
        private readonly UcIdentityClient _identityClient = new UcIdentityClient();
        private readonly SaeivConfig _config = SaeivStore.Load();
        private readonly AnnouncementEngine _engine;
        private readonly DispatcherTimer _syncTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(60) };
        private readonly List<PilotCommandResult> _pendingResults = new List<PilotCommandResult>();
        private readonly string _releaseVersion;
        private UpdateDescriptor _availableUpdate;
        private string _serial;
        private string _screensRevision;
        private bool _serialRead;
        private bool _cacheShown;
        private bool _identityBusy;
        private bool _syncAgain;

        public MainWindow()
        {
            InitializeComponent();
            var version = Assembly.GetExecutingAssembly().GetName().Version;
            _releaseVersion = string.Format("{0}.{1}.{2}", version.Major, version.Minor, Math.Max(0, version.Build));
            var versionText = "Version installée : " + _releaseVersion;
            VersionText.Text = versionText;
            StatusVersionText.Text = versionText;

            _engine = new AnnouncementEngine(_config);
            AnnouncementsPage.Initialize(_config, _engine);
            ScreensPage.Initialize(_config);
            SimulatorPage.SyncRequested += async (s, e) => await RefreshIdentityAsync();

            RefreshNetworkStatus();
            NetworkChange.NetworkAvailabilityChanged += OnNetworkAvailabilityChanged;
            _syncTimer.Tick += async (s, e) => await RefreshIdentityAsync();
            Closed += (s, e) =>
            {
                _syncTimer.Stop();
                NetworkChange.NetworkAvailabilityChanged -= OnNetworkAvailabilityChanged;
                _engine.Dispose();
            };
            var startupNotice = UpdateInstaller.ConsumePendingResult(version);
            Loaded += async (s, e) =>
            {
                _syncTimer.Start();
                await RefreshIdentityAsync();
                await CheckForUpdatesAsync();
                if (startupNotice != null) UpdateStatusText.Text = startupNotice + Environment.NewLine + UpdateStatusText.Text;
            };
        }

        private void OnNetworkAvailabilityChanged(object sender, NetworkAvailabilityEventArgs e)
        {
            var available = e.IsAvailable;
            Dispatcher.BeginInvoke(new Action(async () =>
            {
                RefreshNetworkStatus();
                if (available) await RefreshIdentityAsync();
            }));
        }

        private async void RefreshIdentityButton_Click(object sender, RoutedEventArgs e)
        {
            await RefreshIdentityAsync();
        }

        private void CopySerialButton_Click(object sender, RoutedEventArgs e)
        {
            if (_serial == null) return;
            try { Clipboard.SetText(_serial); IdentityStatusText.Text = "N° de série copié dans le presse-papiers."; }
            catch (Exception) { IdentityStatusText.Text = "Copie impossible : sélectionnez le numéro et utilisez Ctrl+C."; }
        }

        // Synchronisation avec le serveur : profil du véhicule, profil écran (avec ses images) et commandes du véhicule pilote.
        private async Task RefreshIdentityAsync()
        {
            if (_identityBusy) return;
            _identityBusy = true;
            RefreshIdentityButton.IsEnabled = false;
            try
            {
                if (!_serialRead)
                {
                    _serial = await Task.Run(() => DeviceIdentity.ReadSerial());
                    _serialRead = true;
                }
                if (_serial == null)
                {
                    SerialBox.Text = "Illisible";
                    ProfileTitleText.Text = "N° de série introuvable";
                    ProfileDetailText.Text = "Le numéro de série de cet ordinateur est absent ou générique (valeur par défaut du constructeur) : il ne peut pas être rattaché à un véhicule.";
                    IdentityStatusText.Text = string.Empty;
                    StatusProfileText.Text = "Profil : indisponible";
                    return;
                }

                SerialBox.Text = _serial;
                CopySerialButton.IsEnabled = true;
                var cached = UcIdentityStore.Load(_serial);
                if (!_cacheShown)
                {
                    _cacheShown = true;
                    if (cached != null)
                    {
                        ShowIdentity(cached, true);
                        SimulatorPage.SetProfile(cached.ScreenProfile);
                        _screensRevision = cached.ScreenProfile != null ? cached.ScreenProfile.Revision : null;
                    }
                    else IdentityStatusText.Text = "Recherche du profil du véhicule...";
                }

                try
                {
                    var sent = _pendingResults.ToList();
                    var identity = await _identityClient.SyncAsync(_serial, _releaseVersion, _screensRevision, sent);
                    foreach (var result in sent) _pendingResults.Remove(result);
                    await ApplyIdentityAsync(identity);
                }
                catch (InternetUnavailableException)
                {
                    if (cached == null)
                    {
                        ProfileTitleText.Text = "Profil inconnu";
                        ProfileDetailText.Text = string.Empty;
                        IdentityStatusText.Text = "Hors connexion : le profil sera récupéré dès que Internet sera disponible.";
                        StatusProfileText.Text = "Profil : inconnu";
                    }
                }
                catch (Exception exception)
                {
                    if (cached == null)
                    {
                        ProfileTitleText.Text = "Profil inconnu";
                        ProfileDetailText.Text = string.Empty;
                        StatusProfileText.Text = "Profil : inconnu";
                    }
                    IdentityStatusText.Text = "Identification impossible : " + exception.Message;
                }
            }
            finally
            {
                RefreshIdentityButton.IsEnabled = true;
                _identityBusy = false;
                if (_syncAgain)
                {
                    // Des commandes viennent d'être exécutées : on remonte vite leur résultat au serveur.
                    _syncAgain = false;
                    _ = Dispatcher.BeginInvoke(new Action(async () => await RefreshIdentityAsync()));
                }
            }
        }

        private async Task ApplyIdentityAsync(UcIdentity identity)
        {
            var commands = identity.Commands ?? new List<PilotCommand>();
            var mediaIds = MediaCache.IdsOf(identity.ScreenProfile).ToList();
            if (identity.ScreenProfile != null) await MediaCache.EnsureAsync(mediaIds);
            MediaCache.Prune(mediaIds);

            _screensRevision = identity.ScreenProfile != null ? identity.ScreenProfile.Revision : null;
            UcIdentityStore.Save(identity);
            ShowIdentity(identity, false);
            SimulatorPage.SetProfile(identity.ScreenProfile);
            _syncTimer.Interval = TimeSpan.FromSeconds(identity.IsPilot ? 15 : 60);

            foreach (var command in commands) await ExecuteCommandAsync(command);
            if (commands.Count > 0) _syncAgain = true;
        }

        private async Task ExecuteCommandAsync(PilotCommand command)
        {
            try
            {
                switch (command.Type)
                {
                    case "RELOAD":
                        Report(command, true, "Profil et écrans rechargés.");
                        break;
                    case "TEST_SCREEN":
                        SimulatorPage.ShowTestCard(60);
                        Report(command, true, "Mire de test affichée pendant 60 secondes.");
                        break;
                    case "TEST_SOUND":
                        var announcement = _config.Announcements.FirstOrDefault(item => item.Enabled && !string.IsNullOrEmpty(item.SoundFile));
                        if (announcement != null)
                        {
                            _engine.PlayTest(SaeivStore.ResolvePath(SaeivStore.SoundsFolder, announcement.SoundFile));
                            Report(command, true, "Annonce « " + announcement.Name + " » jouée.");
                        }
                        else
                        {
                            System.Media.SystemSounds.Exclamation.Play();
                            Report(command, true, "Aucune annonce configurée : son système joué.");
                        }
                        break;
                    case "CHECK_UPDATE":
                        if (!await CheckForUpdatesAsync())
                        {
                            Report(command, false, "Vérification impossible : " + UpdateStatusText.Text);
                        }
                        else if (_availableUpdate == null)
                        {
                            Report(command, true, "Déjà à jour (version " + _releaseVersion + ").");
                        }
                        else
                        {
                            // Le logiciel se ferme pour s'installer : le résultat doit partir avant.
                            Report(command, true, "Version " + _availableUpdate.Version + " : installation lancée (autorisation administrateur requise sur le poste).");
                            await FlushResultsAsync();
                            await InstallAvailableUpdateAsync();
                        }
                        break;
                    default:
                        Report(command, false, "Commande inconnue.");
                        break;
                }
            }
            catch (Exception exception)
            {
                Report(command, false, exception.Message);
            }
        }

        private void Report(PilotCommand command, bool success, string message)
        {
            _pendingResults.Add(new PilotCommandResult
            {
                Id = command.Id,
                Status = success ? "DONE" : "FAILED",
                Result = message != null && message.Length > 280 ? message.Substring(0, 280) : message,
            });
        }

        private async Task FlushResultsAsync()
        {
            try
            {
                var sent = _pendingResults.ToList();
                await _identityClient.SyncAsync(_serial, _releaseVersion, _screensRevision, sent);
                foreach (var result in sent) _pendingResults.Remove(result);
            }
            catch (Exception)
            {
                // Les résultats restent en attente et partiront à la prochaine synchronisation.
            }
        }

        private void ShowIdentity(UcIdentity identity, bool fromCache)
        {
            if (identity.IsPilot)
            {
                ProfileTitleText.Text = identity.PilotName != null && identity.PilotName.StartsWith("Véhicule pilote", StringComparison.OrdinalIgnoreCase)
                    ? identity.PilotName
                    : "Véhicule pilote : " + identity.PilotName;
                ProfileDetailText.Text = "Ce PC est la borne de test d'Inéo RétroBus : il peut être piloté à distance depuis l'URBEX (mise à jour, test des annonces et des écrans).";
                StatusProfileText.Text = "Profil : pilote";
            }
            else if (!identity.Registered || identity.Vehicle == null)
            {
                ProfileTitleText.Text = "Poste non rattaché à un véhicule";
                ProfileDetailText.Text = "Dans l'URBEX, ouvrez Inéo RétroBus > Profils véhicules : cet UC apparaît dans « UC détectés ». Rattachez-le à son véhicule, puis actualisez ce profil.";
                StatusProfileText.Text = "Profil : non rattaché";
            }
            else
            {
                var vehicle = identity.Vehicle;
                ProfileTitleText.Text = "Profil " + vehicle.Parc;
                ProfileDetailText.Text = DescribeProfile(vehicle, identity.Profile);
                StatusProfileText.Text = "Profil : " + vehicle.Parc;
            }

            ScreenProfileText.Text = identity.ScreenProfile == null
                ? "Profil écran : aucun"
                : "Profil écran : " + identity.ScreenProfile.Name + " (" + (identity.ScreenProfile.Screens == null ? 0 : identity.ScreenProfile.Screens.Count) + " écran(s), révision " + identity.ScreenProfile.Revision + ")";

            IdentityStatusText.Text = fromCache
                ? "Dernier profil connu (vérifié le " + identity.CheckedAt + ")."
                : "Profil à jour (vérifié le " + identity.CheckedAt + ").";
        }

        private static string DescribeProfile(UcVehicleInfo vehicle, UcProfileInfo profile)
        {
            var lines = new List<string>();
            var identification = string.Join(" ", new[] { vehicle.Marque, vehicle.Modele }.Where(part => !string.IsNullOrWhiteSpace(part)));
            if (!string.IsNullOrWhiteSpace(vehicle.Immat)) identification += (identification.Length > 0 ? " — " : string.Empty) + vehicle.Immat;
            if (identification.Length > 0) lines.Add(identification);

            if (profile != null)
            {
                var characteristics = new List<string>();
                if (!string.IsNullOrWhiteSpace(profile.VehicleType)) characteristics.Add("Type : " + profile.VehicleType);
                if (profile.MaxSpeedKmh.HasValue) characteristics.Add("Vitesse max : " + profile.MaxSpeedKmh + " km/h");
                if (profile.LengthM.HasValue && profile.WidthM.HasValue && profile.HeightM.HasValue)
                {
                    characteristics.Add(string.Format("Dimensions : {0:0.##} × {1:0.##} × {2:0.##} m", profile.LengthM, profile.WidthM, profile.HeightM));
                }
                if (characteristics.Count > 0) lines.Add(string.Join(" · ", characteristics));
                if (!string.IsNullOrWhiteSpace(profile.Options)) lines.Add("Options : " + profile.Options);
            }
            return string.Join(Environment.NewLine, lines);
        }

        private void RefreshNetworkStatus()
        {
            var online = NetworkInterface.GetIsNetworkAvailable();
            StatusNetworkText.Text = online ? "Réseau : connecté" : "Réseau : connexion perdue";
            ScreensPage.SetConnectionState(online);
            SimulatorPage.SetConnectionState(online);
        }

        private async void CheckUpdateButton_Click(object sender, RoutedEventArgs e)
        {
            await CheckForUpdatesAsync();
        }

        // Retourne false si la vérification elle-même a échoué (réseau, serveur…).
        private async Task<bool> CheckForUpdatesAsync()
        {
            CheckUpdateButton.IsEnabled = false;
            InstallUpdateButton.IsEnabled = false;
            _availableUpdate = null;
            InternetStatusText.Text = "Vérification de la connexion Internet...";
            UpdateStatusText.Text = string.Empty;

            try
            {
                var result = await _updateClient.CheckForUpdateAsync();
                InternetStatusText.Text = "Connexion Internet : disponible";
                if (!result.UpdateAvailable)
                {
                    UpdateStatusText.Text = "Le logiciel est à jour.";
                    return true;
                }

                _availableUpdate = result.Update;
                UpdateStatusText.Text = string.IsNullOrWhiteSpace(_availableUpdate.ReleaseNotes)
                    ? string.Format("Version {0} disponible.", _availableUpdate.Version)
                    : string.Format("Version {0} disponible : {1}", _availableUpdate.Version, _availableUpdate.ReleaseNotes);
                InstallUpdateButton.IsEnabled = true;
                return true;
            }
            catch (InternetUnavailableException)
            {
                InternetStatusText.Text = "Connexion Internet : indisponible";
                UpdateStatusText.Text = "Les services embarqués restent disponibles localement. Nouvelle vérification au prochain démarrage.";
                return false;
            }
            catch (Exception exception)
            {
                InternetStatusText.Text = "Connexion Internet : disponible";
                UpdateStatusText.Text = string.Format("La recherche de mise à jour a échoué : {0}", exception.Message);
                return false;
            }
            finally
            {
                CheckUpdateButton.IsEnabled = true;
            }
        }

        private async void InstallUpdateButton_Click(object sender, RoutedEventArgs e)
        {
            await InstallAvailableUpdateAsync();
        }

        private async Task InstallAvailableUpdateAsync()
        {
            if (_availableUpdate == null) return;

            InstallUpdateButton.IsEnabled = false;
            CheckUpdateButton.IsEnabled = false;
            UpdateStatusText.Text = "Téléchargement et vérification de la mise à jour...";
            try
            {
                var installerPath = await _updateClient.DownloadAndVerifyInstallerAsync(_availableUpdate);
                UpdateStatusText.Text = "Installation en cours : le logiciel va redémarrer tout seul.";
                UpdateInstaller.Launch(installerPath, _availableUpdate.Version);
                Application.Current.Shutdown();
            }
            catch (Exception exception)
            {
                UpdateStatusText.Text = exception is OperationCanceledException
                    ? exception.Message
                    : string.Format("La mise à jour n'a pas été installée : {0}", exception.Message);
                CheckUpdateButton.IsEnabled = true;
                InstallUpdateButton.IsEnabled = true;
            }
        }
    }
}
