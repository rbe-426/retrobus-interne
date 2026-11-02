using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Threading;

namespace IneoRbe.Desktop.Services
{
    // Lance l'installateur de mise à jour et garantit que le logiciel redémarre, même si l'installation échoue.
    public static class UpdateInstaller
    {
        private const int ErrorSharingViolation = 32;
        private const int ErrorCancelledByUser = 1223;

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

        // Au démarrage : indique si la dernière mise à jour a abouti, et nettoie les installateurs téléchargés.
        public static string ConsumePendingResult(Version installedVersion)
        {
            CleanDownloadedInstallers();
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

        // Processus indépendant : attend la fin de l'installateur, puis relance le logiciel s'il n'est pas déjà ouvert
        // (installation réussie = le nouvel exécutable est déjà lancé ; échec = on rouvre l'ancienne version).
        private static void StartRelaunchWatcher(Process installer, string appPath)
        {
            if (installer == null) return;
            try
            {
                var processName = Path.GetFileNameWithoutExtension(appPath);
                var script =
                    "$id = " + installer.Id + "; $limit = (Get-Date).AddMinutes(20); " +
                    "while ((Get-Process -Id $id -ErrorAction SilentlyContinue) -and (Get-Date) -lt $limit) { Start-Sleep -Seconds 1 }; " +
                    "Start-Sleep -Seconds 4; " +
                    "if (-not (Get-Process -Name '" + processName.Replace("'", "''") + "' -ErrorAction SilentlyContinue)) { Start-Process -FilePath '" + appPath.Replace("'", "''") + "' }";
                Process.Start(new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -EncodedCommand " + Convert.ToBase64String(Encoding.Unicode.GetBytes(script)),
                    UseShellExecute = false,
                    CreateNoWindow = true,
                });
            }
            catch (Exception)
            {
                // Le relanceur est une sécurité : son absence ne doit pas empêcher la mise à jour.
            }
        }

        private static void CleanDownloadedInstallers()
        {
            try
            {
                foreach (var file in Directory.GetFiles(Path.GetTempPath(), "IneoRbe-*-Setup.exe")) TryDelete(file);
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
