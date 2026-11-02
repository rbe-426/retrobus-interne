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
    // Compatible .NET Framework 4.0 (Windows XP SP3 -> 11) : pas de async/await ni de HttpClient.
    // Le réseau s'exécute sur un thread d'arrière-plan ; l'interface n'est modifiée que via Ui().
    public partial class MainWindow : Window
    {
        private readonly UpdateClient _updateClient = new UpdateClient();
        private readonly UcIdentityClient _identityClient = new UcIdentityClient();
        private readonly SaeivConfig _config = SaeivStore.Load();
        private readonly AnnouncementEngine _engine;
        private readonly DispatcherTimer _syncTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(60) };
        private readonly List<PilotCommandResult> _pendingResults = new List<PilotCommandResult>();
        private readonly object _resultsLock = new object();
        private readonly object _updateLock = new object();
        private readonly string _releaseVersion;
        private UpdateDescriptor _availableUpdate;
        private string _serial;
        private volatile string _screensRevision;
        private bool _serialRead;
        private bool _cacheShown;
        private bool _profileShown;
        private bool _syncBusy;
        private volatile bool _syncAgain;

        public MainWindow()
        {
            InitializeComponent();
            var version = Assembly.GetExecutingAssembly().GetName().Version;
            _releaseVersion = string.Format("{0}.{1}.{2}", version.Major, version.Minor, Math.Max(0, version.Build));
            var versionText = "Version installée : " + _releaseVersion;
            VersionText.Text = versionText;
            StatusVersionText.Text = versionText;
            TlsModeText.Text = HttpTransport.UsesEmbeddedTls
                ? "Chiffrement : TLS 1.2 embarqué (ce système ne le gère pas nativement)"
                : "Chiffrement : TLS 1.2 du système";

            _engine = new AnnouncementEngine(_config);
            AnnouncementsPage.Initialize(_config, _engine);
            ScreensPage.Initialize(_config);
            SimulatorPage.SyncRequested += (s, e) => StartSync(false);

            RefreshNetworkStatus();
            NetworkChange.NetworkAvailabilityChanged += OnNetworkAvailabilityChanged;
            _syncTimer.Tick += (s, e) => StartSync(false);
            Closed += (s, e) =>
            {
                _syncTimer.Stop();
                NetworkChange.NetworkAvailabilityChanged -= OnNetworkAvailabilityChanged;
                _engine.Dispose();
            };
            var startupNotice = UpdateInstaller.ConsumePendingResult(version);
            Loaded += (s, e) =>
            {
                _syncTimer.Start();
                StartSync(true, startupNotice);
            };
        }

        private void OnNetworkAvailabilityChanged(object sender, NetworkAvailabilityEventArgs e)
        {
            var available = e.IsAvailable;
            Dispatcher.BeginInvoke(new Action(() =>
            {
                RefreshNetworkStatus();
                if (available) StartSync(false);
            }));
        }

        // Exécute une action sur le thread d'interface et attend sa fin (sans erreur si la fenêtre se ferme).
        private void Ui(Action action)
        {
            try
            {
                if (Dispatcher.HasShutdownStarted) return;
                Dispatcher.Invoke(action);
            }
            catch (TaskCanceledException)
            {
            }
        }

        // Lance le travail réseau hors du thread d'interface ; une seule synchronisation à la fois.
        private void StartSync(bool thenCheckUpdates, string startupNotice = null)
        {
            if (_syncBusy) return;
            _syncBusy = true;
            RefreshIdentityButton.IsEnabled = false;

            Task.Factory.StartNew(() =>
            {
                SyncWorker();
                if (thenCheckUpdates)
                {
                    CheckForUpdatesBlocking();
                    if (startupNotice != null) Ui(() => UpdateStatusText.Text = startupNotice + Environment.NewLine + UpdateStatusText.Text);
                }
            }).ContinueWith(task =>
            {
                var failure = task.Exception;
                Dispatcher.BeginInvoke(new Action(() =>
                {
                    _syncBusy = false;
                    RefreshIdentityButton.IsEnabled = true;
                    if (failure != null) IdentityStatusText.Text = "Synchronisation interrompue : " + failure.GetBaseException().Message;
                    // Des commandes viennent d'être exécutées : on remonte vite leur résultat au serveur.
                    if (_syncAgain)
                    {
                        _syncAgain = false;
                        StartSync(false);
                    }
                }));
            });
        }

        private void RefreshIdentityButton_Click(object sender, RoutedEventArgs e)
        {
            StartSync(false);
        }

        private void CopySerialButton_Click(object sender, RoutedEventArgs e)
        {
            if (_serial == null) return;
            try { Clipboard.SetText(_serial); IdentityStatusText.Text = "N° de série copié dans le presse-papiers."; }
            catch (Exception) { IdentityStatusText.Text = "Copie impossible : sélectionnez le numéro et utilisez Ctrl+C."; }
        }

        // Synchronisation avec le serveur : profil du véhicule, profil écran (avec ses images) et commandes du véhicule pilote.
        private void SyncWorker()
        {
            if (!_serialRead)
            {
                _serial = DeviceIdentity.ReadSerial();
                _serialRead = true;
            }
            if (_serial == null)
            {
                Ui(() =>
                {
                    SerialBox.Text = "Illisible";
                    ProfileTitleText.Text = "N° de série introuvable";
                    ProfileDetailText.Text = "Le numéro de série de cet ordinateur est absent ou générique (valeur par défaut du constructeur) : il ne peut pas être rattaché à un véhicule.";
                    IdentityStatusText.Text = string.Empty;
                    StatusProfileText.Text = "Profil : indisponible";
                });
                return;
            }

            Ui(() =>
            {
                SerialBox.Text = _serial;
                CopySerialButton.IsEnabled = true;
            });

            if (!_cacheShown)
            {
                _cacheShown = true;
                var cached = UcIdentityStore.Load(_serial);
                Ui(() =>
                {
                    if (cached != null)
                    {
                        ShowIdentity(cached, true);
                        SimulatorPage.SetProfile(cached.ScreenProfile);
                        _screensRevision = cached.ScreenProfile != null ? cached.ScreenProfile.Revision : null;
                    }
                    else IdentityStatusText.Text = "Recherche du profil du véhicule...";
                });
            }

            try
            {
                List<PilotCommandResult> sent;
                lock (_resultsLock) sent = _pendingResults.ToList();

                var identity = _identityClient.Sync(_serial, _releaseVersion, _screensRevision, sent);
                lock (_resultsLock) foreach (var result in sent) _pendingResults.Remove(result);

                var mediaIds = MediaCache.IdsOf(identity.ScreenProfile).ToList();
                if (identity.ScreenProfile != null) MediaCache.Ensure(mediaIds);
                MediaCache.Prune(mediaIds);
                UcIdentityStore.Save(identity);

                Ui(() =>
                {
                    _screensRevision = identity.ScreenProfile != null ? identity.ScreenProfile.Revision : null;
                    ShowIdentity(identity, false);
                    SimulatorPage.SetProfile(identity.ScreenProfile);
                    _syncTimer.Interval = TimeSpan.FromSeconds(identity.IsPilot ? 15 : 60);
                });

                var commands = identity.Commands ?? new List<PilotCommand>();
                foreach (var command in commands) ExecuteCommand(command);
                if (commands.Count > 0) _syncAgain = true;
            }
            catch (InternetUnavailableException)
            {
                Ui(() =>
                {
                    if (_profileShown) return;
                    ProfileTitleText.Text = "Profil inconnu";
                    ProfileDetailText.Text = string.Empty;
                    IdentityStatusText.Text = "Hors connexion : le profil sera récupéré dès que Internet sera disponible.";
                    StatusProfileText.Text = "Profil : inconnu";
                });
            }
            catch (Exception exception)
            {
                Ui(() =>
                {
                    if (!_profileShown)
                    {
                        ProfileTitleText.Text = "Profil inconnu";
                        ProfileDetailText.Text = string.Empty;
                        StatusProfileText.Text = "Profil : inconnu";
                    }
                    IdentityStatusText.Text = "Identification impossible : " + exception.Message;
                });
            }
        }

        private void ExecuteCommand(PilotCommand command)
        {
            try
            {
                switch (command.Type)
                {
                    case "RELOAD":
                        Report(command, true, "Profil et écrans rechargés.");
                        break;
                    case "TEST_SCREEN":
                        Ui(() => SimulatorPage.ShowTestCard(60));
                        Report(command, true, "Mire de test affichée pendant 60 secondes.");
                        break;
                    case "TEST_SOUND":
                        Ui(() =>
                        {
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
                        });
                        break;
                    case "CHECK_UPDATE":
                        if (!CheckForUpdatesBlocking())
                        {
                            string status = null;
                            Ui(() => status = UpdateStatusText.Text);
                            Report(command, false, "Vérification impossible : " + status);
                        }
                        else if (_availableUpdate == null)
                        {
                            Report(command, true, "Déjà à jour (version " + _releaseVersion + ").");
                        }
                        else
                        {
                            // Le logiciel se ferme pour s'installer : le résultat doit partir avant.
                            Report(command, true, "Version " + _availableUpdate.Version + " : installation lancée (autorisation administrateur requise sur le poste).");
                            FlushResults();
                            InstallAvailableUpdateBlocking();
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
            lock (_resultsLock)
            {
                _pendingResults.Add(new PilotCommandResult
                {
                    Id = command.Id,
                    Status = success ? "DONE" : "FAILED",
                    Result = message != null && message.Length > 280 ? message.Substring(0, 280) : message,
                });
            }
        }

        private void FlushResults()
        {
            try
            {
                List<PilotCommandResult> sent;
                lock (_resultsLock) sent = _pendingResults.ToList();
                _identityClient.Sync(_serial, _releaseVersion, _screensRevision, sent);
                lock (_resultsLock) foreach (var result in sent) _pendingResults.Remove(result);
            }
            catch (Exception)
            {
                // Les résultats restent en attente et partiront à la prochaine synchronisation.
            }
        }

        private void ShowIdentity(UcIdentity identity, bool fromCache)
        {
            _profileShown = true;
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
            var identification = string.Join(" ", new[] { vehicle.Marque, vehicle.Modele }.Where(part => !string.IsNullOrWhiteSpace(part)).ToArray());
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
                if (characteristics.Count > 0) lines.Add(string.Join(" · ", characteristics.ToArray()));
                if (!string.IsNullOrWhiteSpace(profile.Options)) lines.Add("Options : " + profile.Options);
            }
            return string.Join(Environment.NewLine, lines.ToArray());
        }

        private void RefreshNetworkStatus()
        {
            var online = NetworkInterface.GetIsNetworkAvailable();
            StatusNetworkText.Text = online ? "Réseau : connecté" : "Réseau : connexion perdue";
            ScreensPage.SetConnectionState(online);
            SimulatorPage.SetConnectionState(online);
        }

        private void CheckUpdateButton_Click(object sender, RoutedEventArgs e)
        {
            Task.Factory.StartNew(() => CheckForUpdatesBlocking());
        }

        // Retourne false si la vérification elle-même a échoué (réseau, serveur…). À appeler hors du thread d'interface.
        private bool CheckForUpdatesBlocking()
        {
            lock (_updateLock)
            {
                Ui(() =>
                {
                    CheckUpdateButton.IsEnabled = false;
                    InstallUpdateButton.IsEnabled = false;
                    _availableUpdate = null;
                    InternetStatusText.Text = "Vérification de la connexion Internet...";
                    UpdateStatusText.Text = string.Empty;
                });

                try
                {
                    var result = _updateClient.CheckForUpdate();
                    if (!result.UpdateAvailable)
                    {
                        Ui(() =>
                        {
                            InternetStatusText.Text = "Connexion Internet : disponible";
                            UpdateStatusText.Text = "Le logiciel est à jour.";
                        });
                        return true;
                    }

                    Ui(() =>
                    {
                        _availableUpdate = result.Update;
                        InternetStatusText.Text = "Connexion Internet : disponible";
                        UpdateStatusText.Text = string.IsNullOrWhiteSpace(result.Update.ReleaseNotes)
                            ? string.Format("Version {0} disponible.", result.Update.Version)
                            : string.Format("Version {0} disponible : {1}", result.Update.Version, result.Update.ReleaseNotes);
                        InstallUpdateButton.IsEnabled = true;
                    });
                    return true;
                }
                catch (InternetUnavailableException)
                {
                    Ui(() =>
                    {
                        InternetStatusText.Text = "Connexion Internet : indisponible";
                        UpdateStatusText.Text = "Les services embarqués restent disponibles localement. Nouvelle vérification au prochain démarrage.";
                    });
                    return false;
                }
                catch (Exception exception)
                {
                    Ui(() =>
                    {
                        InternetStatusText.Text = "Connexion Internet : disponible";
                        UpdateStatusText.Text = string.Format("La recherche de mise à jour a échoué : {0}", exception.Message);
                    });
                    return false;
                }
                finally
                {
                    Ui(() => CheckUpdateButton.IsEnabled = true);
                }
            }
        }

        private void InstallUpdateButton_Click(object sender, RoutedEventArgs e)
        {
            Task.Factory.StartNew(() => InstallAvailableUpdateBlocking());
        }

        private void InstallAvailableUpdateBlocking()
        {
            var update = _availableUpdate;
            if (update == null) return;

            Ui(() =>
            {
                InstallUpdateButton.IsEnabled = false;
                CheckUpdateButton.IsEnabled = false;
                UpdateStatusText.Text = "Téléchargement et vérification de la mise à jour...";
            });
            try
            {
                var installerPath = _updateClient.DownloadAndVerifyInstaller(update);
                Ui(() => UpdateStatusText.Text = "Installation en cours : le logiciel va redémarrer tout seul.");
                UpdateInstaller.Launch(installerPath, update.Version);
                Ui(() => Application.Current.Shutdown());
            }
            catch (Exception exception)
            {
                Ui(() =>
                {
                    UpdateStatusText.Text = exception is OperationCanceledException
                        ? exception.Message
                        : string.Format("La mise à jour n'a pas été installée : {0}", exception.Message);
                    CheckUpdateButton.IsEnabled = true;
                    InstallUpdateButton.IsEnabled = true;
                });
            }
        }
    }
}
