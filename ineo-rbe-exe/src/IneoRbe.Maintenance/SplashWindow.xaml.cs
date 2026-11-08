using System;
using System.Collections.Generic;
using System.Threading;
using System.Windows;
using System.Windows.Threading;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Maintenance
{
    public partial class SplashWindow : Window
    {
        private sealed class Step
        {
            public string Label;
            public Action<StartupContext> Run;
        }

        // Durée minimale d'affichage d'une étape : la barre reste lisible même quand le chargement est instantané.
        private const int MinStepMs = 250;

        private readonly StartupContext _context = new StartupContext();

        public StartupContext Context { get { return _context; } }
        public event EventHandler Completed;

        public SplashWindow()
        {
            InitializeComponent();
            Loaded += (sender, args) => ThreadPool.QueueUserWorkItem(delegate { RunSteps(); });
        }

        private void RunSteps()
        {
            var steps = new List<Step>
            {
                new Step { Label = "Chargement des certificats…", Run = c => c.CertificateCount = SafeCertificateCount() },
                new Step { Label = "Identification du poste…", Run = c => c.Serial = SafeSerial() },
                new Step { Label = "Vérification de l'autorisation du poste…", Run = c =>
                {
                    c.Authorization = MaintenanceAuth.Check(c.Serial, ReleaseVersion.Format(typeof(SplashWindow).Assembly.GetName().Version));
                    c.ServerReachable = c.Authorization.State == AuthState.Allowed;
                } },
                new Step { Label = "Recherche des mises à jour installées…", Run = c => c.UpdateNotice = UpdateInstaller.ConsumePendingResult(typeof(SplashWindow).Assembly.GetName().Version) },
                new Step { Label = "Préparation de l'interface…", Run = c => { } },
            };

            for (var i = 0; i < steps.Count; i++)
            {
                var step = steps[i];
                Report(step.Label, i * 100.0 / steps.Count);
                var started = Environment.TickCount;
                step.Run(_context);
                var remaining = MinStepMs - (Environment.TickCount - started);
                if (remaining > 0) Thread.Sleep(remaining);

                // Un PC non enregistré s'arrête ici : l'outil ne démarre pas.
                if (_context.Authorization != null && _context.Authorization.State == AuthState.Denied)
                {
                    ShowDenied(_context);
                    return;
                }
            }

            Report("Prêt.", 100);
            Thread.Sleep(200);
            Dispatcher.BeginInvoke(DispatcherPriority.Normal, new Action(() =>
            {
                var handler = Completed;
                if (handler != null) handler(this, EventArgs.Empty);
            }));
        }

        private void Report(string label, double percent)
        {
            Dispatcher.BeginInvoke(DispatcherPriority.Normal, new Action(() =>
            {
                StatusText.Text = label;
                LoadingBar.Value = percent;
            }));
        }

        private static int SafeCertificateCount()
        {
            try { return TrustedRoots.Load().Count; } catch { return 0; }
        }

        private void ShowDenied(StartupContext context)
        {
            Dispatcher.BeginInvoke(DispatcherPriority.Normal, new Action(() =>
            {
                ErrorText.Text = context.Authorization.Message + " Communiquez le numéro de série ci-dessous pour l'enregistrer dans l'URBEX (Inéo RétroBus > Ordinateurs Maintenance).";
                ErrorSerialText.Text = string.IsNullOrEmpty(context.Serial) ? "N° de série illisible" : "SN : " + context.Serial;
                CopySerialButton.IsEnabled = !string.IsNullOrEmpty(context.Serial);
                ErrorPanel.Visibility = Visibility.Visible;
            }));
        }

        private void CopySerialButton_Click(object sender, RoutedEventArgs e)
        {
            try { Clipboard.SetText(_context.Serial); } catch (Exception) { }
        }

        private void QuitButton_Click(object sender, RoutedEventArgs e)
        {
            Application.Current.Shutdown();
        }

        private static string SafeSerial()
        {
            try { return DeviceIdentity.ReadSerial(); } catch { return null; }
        }
    }
}
