using System;
using System.IO;
using System.Net.NetworkInformation;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Security.Cryptography;
using System.Text;

namespace IneoRbe.Desktop.Services
{
    public sealed class InternetUnavailableException : Exception
    {
        public InternetUnavailableException() : base("Aucune connexion Internet n'est disponible.") { }
    }

    public sealed class UpdateClient
    {
        private const long MaxInstallerBytes = 80L * 1024 * 1024;
        private readonly string _product;
        private readonly string _serial;

        public UpdateClient() : this(null, null) { }

        // product : « MAINTENANCE » pour l'outil des techniciens (le serveur exige alors un numéro de série enregistré), sinon l'UC.
        public UpdateClient(string product, string serial)
        {
            _product = product;
            _serial = serial;
        }

        // Appels bloquants : à exécuter hors du thread d'interface.
        public UpdateCheckResult CheckForUpdate()
        {
            if (!NetworkInterface.GetIsNetworkAvailable()) throw new InternetUnavailableException();

            var installedVersion = typeof(UpdateClient).Assembly.GetName().Version;
            var url = ApiEndpoints.UpdateUrl + "?version=" + Uri.EscapeDataString(ToReleaseVersion(installedVersion));
            if (_product != null) url += "&product=" + Uri.EscapeDataString(_product) + "&serial=" + Uri.EscapeDataString(_serial ?? string.Empty);
            var response = HttpTransport.Send("GET", url, null, null, 20000);
            if (response.StatusCode == 403)
            {
                throw new InvalidOperationException("Ce PC n'est pas autorisé : son numéro de série n'est pas enregistré dans l'URBEX.");
            }
            if (response.StatusCode == 503)
            {
                throw new InvalidOperationException("Le service de mise à jour n'est pas encore configuré.");
            }
            if (!response.IsSuccess) throw new InvalidOperationException("Le serveur de mise à jour a répondu " + response.StatusCode + ".");

            UpdateResponse payload;
            using (var stream = new MemoryStream(response.Body))
            {
                payload = (UpdateResponse)new DataContractJsonSerializer(typeof(UpdateResponse)).ReadObject(stream);
            }
            if (payload == null || !payload.UpdateAvailable) return new UpdateCheckResult();

            var descriptor = new UpdateDescriptor
            {
                Version = payload.Version,
                InstallerUrl = payload.InstallerUrl,
                Sha256 = payload.Sha256,
                ReleaseNotes = payload.ReleaseNotes,
            };
            ValidateDescriptor(descriptor);
            return new UpdateCheckResult { UpdateAvailable = true, Update = descriptor };
        }

        public string DownloadAndVerifyInstaller(UpdateDescriptor update)
        {
            ValidateDescriptor(update);
            var installerPath = Path.Combine(Path.GetTempPath(), "IneoRbe-" + update.Version + "-Setup.exe");
            try
            {
                var status = HttpTransport.DownloadToFile(update.InstallerUrl, installerPath, MaxInstallerBytes, 180000);
                if (status != 200) throw new InvalidOperationException("Le téléchargement de l'installateur a échoué (code " + status + ").");

                if (!HashMatches(installerPath, update.Sha256))
                {
                    File.Delete(installerPath);
                    throw new InvalidOperationException("L'empreinte de l'installateur ne correspond pas à la version publiée.");
                }
                return installerPath;
            }
            catch
            {
                try { if (File.Exists(installerPath)) File.Delete(installerPath); } catch (Exception) { }
                throw;
            }
        }

        private static bool HashMatches(string filePath, string expectedHash)
        {
            using (var sha256 = new SHA256Managed())
            using (var stream = File.OpenRead(filePath))
            {
                var actual = BitConverter.ToString(sha256.ComputeHash(stream)).Replace("-", string.Empty);
                return string.Equals(actual, expectedHash, StringComparison.OrdinalIgnoreCase);
            }
        }

        private static void ValidateDescriptor(UpdateDescriptor update)
        {
            Version parsedVersion;
            Uri installerUri;
            if (update == null || !Version.TryParse(update.Version, out parsedVersion)
                || !Uri.TryCreate(update.InstallerUrl, UriKind.Absolute, out installerUri)
                || installerUri.Scheme != Uri.UriSchemeHttps
                || string.IsNullOrWhiteSpace(update.Sha256) || update.Sha256.Length != 64
                || !IsHex(update.Sha256))
            {
                throw new InvalidOperationException("Les informations de mise à jour reçues sont invalides.");
            }
            if (HttpTransport.UsesEmbeddedTls && !ApiEndpoints.IsTrustedHost(installerUri.Host))
            {
                throw new InvalidOperationException("Cette mise à jour est hébergée ailleurs que sur le serveur RétroBus : ce système ancien ne peut pas la télécharger. Publiez l'installateur depuis l'URBEX (Inéo RétroBus > Installateur UC).");
            }
        }

        private static bool IsHex(string value)
        {
            foreach (var character in value)
            {
                var isDigit = character >= '0' && character <= '9';
                var isLower = character >= 'a' && character <= 'f';
                var isUpper = character >= 'A' && character <= 'F';
                if (!isDigit && !isLower && !isUpper) return false;
            }
            return true;
        }

        private static string ToReleaseVersion(Version version)
        {
            return ReleaseVersion.Format(version);
        }

        [DataContract]
        private sealed class UpdateResponse
        {
            [DataMember(Name = "updateAvailable")] public bool UpdateAvailable { get; set; }
            [DataMember(Name = "version")] public string Version { get; set; }
            [DataMember(Name = "installerUrl")] public string InstallerUrl { get; set; }
            [DataMember(Name = "sha256")] public string Sha256 { get; set; }
            [DataMember(Name = "releaseNotes")] public string ReleaseNotes { get; set; }
        }
    }
}
