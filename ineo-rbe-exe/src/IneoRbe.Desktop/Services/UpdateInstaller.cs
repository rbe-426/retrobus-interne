using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading;

namespace IneoRbe.Desktop.Services
{
    // Lance l'installateur de mise à jour et garantit que le logiciel redémarre, même si l'installation échoue.
    // Sans PowerShell (absent de Windows XP) : le relanceur est une copie de ce logiciel lancée en mode « /watch ».
    public static class UpdateInstaller
    {
        private const int ErrorSharingViolation = 32;
        private const int ErrorCancelledByUser = 1223;
        private const string WatcherPrefix = "IneoRbe-watch-";

        public static string LogPath { get { return Path.Combine(SaeivStore.RootDirectory, "update-setup.log"); } }
        private static string MarkerPath { get { return Path.Combine(SaeivStore.RootDirectory, "update-pending.txt"); } }

        public static void Launch(string installerPath, string targetVersion)
        {
            Directory.CreateDirectory(SaeivStore.RootDirectory);
            File.WriteAllText(MarkerPath, targetVersion);

            Process installer;
            try
            {
                installer = StartInstaller(installerPath);
            }
            catch (Exception)
            {
                TryDelete(MarkerPath);
                throw;
            }

            StartRelaunchWatcher(installer, Assembly.GetExecutingAssembly().Location);
        }

        // Au démarrage : indique si la dernière mise à jour a abouti, et nettoie les fichiers temporaires.
        public static string ConsumePendingResult(Version installedVersion)
        {
            CleanTemporaryFiles();
            if (!File.Exists(MarkerPath)) return null;

            string targetText;
            try { targetText = File.ReadAllText(MarkerPath).Trim(); } catch (Exception) { return null; }
            TryDelete(MarkerPath);

            Version target;
            if (!Version.TryParse(targetText, out target)) return null;
            var installed = new Version(installedVersion.Major, installedVersion.Minor, Math.Max(0, installedVersion.Build));
            var wanted = new Version(target.Major, target.Minor, Math.Max(0, target.Build));
            return installed >= wanted
                ? "Mise à jour vers la version " + targetText + " installée."
                : "La mise à jour vers la version " + targetText + " n'a pas abouti. Journal : " + LogPath;
        }

        // Exécuté par le processus relanceur : attend la fin de l'installateur, puis rouvre le logiciel s'il n'est pas déjà ouvert
        // (installation réussie = le nouvel exécutable est déjà lancé ; échec = on rouvre l'ancienne version).
        public static void RunRelaunchWatcher(string[] args)
        {
            try
            {
                int installerId;
                if (args.Length < 3 || !int.TryParse(args[1], out installerId)) return;
                var appPath = args[2];

                try
                {
                    using (var installer = Process.GetProcessById(installerId)) installer.WaitForExit(20 * 60 * 1000);
                }
                catch (ArgumentException)
                {
                    // L'installateur est déjà terminé.
                }

                Thread.Sleep(4000);
                var name = Path.GetFileNameWithoutExtension(appPath);
                if (File.Exists(appPath) && Process.GetProcessesByName(name).Length == 0)
                {
                    Process.Start(new ProcessStartInfo { FileName = appPath, WorkingDirectory = Path.GetDirectoryName(appPath), UseShellExecute = false });
                }
            }
            catch (Exception)
            {
                // Le relanceur est une sécurité : une erreur ici ne doit rien casser.
            }
        }

        private static Process StartInstaller(string installerPath)
        {
            var arguments = "/SILENT /SUPPRESSMSGBOXES /NOCANCEL /NORESTART /CLOSEAPPLICATIONS /LOG=\"" + LogPath + "\"";
            for (var attempt = 1; ; attempt++)
            {
                try
                {
                    return Process.Start(new ProcessStartInfo
                    {
                        FileName = installerPath,
                        Arguments = arguments,
                        WorkingDirectory = Path.GetDirectoryName(installerPath),
                        UseShellExecute = true,
                    });
                }
                catch (Win32Exception exception)
                {
                    if (exception.NativeErrorCode == ErrorCancelledByUser)
                    {
                        throw new OperationCanceledException("Mise à jour annulée : l'autorisation administrateur a été refusée.");
                    }
                    // Un antivirus peut verrouiller brièvement le fichier tout juste téléchargé.
                    if (exception.NativeErrorCode != ErrorSharingViolation || attempt >= 3) throw;
                    Thread.Sleep(1500);
                }
            }
        }

        private static void StartRelaunchWatcher(Process installer, string appPath)
        {
            if (installer == null) return;
            try
            {
                // Copie temporaire : le dossier d'installation est remplacé pendant la mise à jour.
                var copy = Path.Combine(Path.GetTempPath(), WatcherPrefix + Guid.NewGuid().ToString("N") + ".exe");
                File.Copy(appPath, copy, true);
                if (File.Exists(appPath + ".config")) File.Copy(appPath + ".config", copy + ".config", true);
                Process.Start(new ProcessStartInfo
                {
                    FileName = copy,
                    Arguments = "/watch " + installer.Id + " \"" + appPath + "\"",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                });
            }
            catch (Exception)
            {
                // Sans relanceur, la mise à jour fonctionne quand même ; seul le filet de sécurité manque.
            }
        }

        private static void CleanTemporaryFiles()
        {
            try
            {
                foreach (var file in Directory.GetFiles(Path.GetTempPath(), "IneoRbe-*-Setup.exe")) TryDelete(file);
                foreach (var file in Directory.GetFiles(Path.GetTempPath(), WatcherPrefix + "*")) TryDelete(file);
            }
            catch (Exception)
            {
            }
        }

        private static void TryDelete(string path)
        {
            try { if (File.Exists(path)) File.Delete(path); } catch (Exception) { }
        }
    }
}
