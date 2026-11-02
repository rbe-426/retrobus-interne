using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Runtime.Serialization.Json;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace IneoRbe.Desktop.Services
{
    public sealed class InternetUnavailableException : Exception
    {
        public InternetUnavailableException() : base("Aucune connexion Internet n'est disponible.") { }
    }

    public sealed class UpdateClient
    {
        public async Task<UpdateCheckResult> CheckForUpdateAsync()
        {
            if (!NetworkInterface.GetIsNetworkAvailable()) throw new InternetUnavailableException();

            var installedVersion = typeof(UpdateClient).Assembly.GetName().Version;
            using (var client = ApiEndpoints.CreateHttpClient())
            using (var response = await client.GetAsync(ApiEndpoints.UpdateUrl + "?version=" + Uri.EscapeDataString(ToReleaseVersion(installedVersion))))
            {
                if (response.StatusCode == HttpStatusCode.ServiceUnavailable)
                {
                    throw new InvalidOperationException("Le service de mise à jour n'est pas encore configuré.");
                }
                response.EnsureSuccessStatusCode();
                using (var stream = await response.Content.ReadAsStreamAsync())
                {
                    var serializer = new DataContractJsonSerializer(typeof(UpdateResponse));
                    var payload = (UpdateResponse)serializer.ReadObject(stream);
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
            }
        }

        public async Task<string> DownloadAndVerifyInstallerAsync(UpdateDescriptor update)
        {
            ValidateDescriptor(update);
            var installerPath = Path.Combine(Path.GetTempPath(), "IneoRbe-" + update.Version + "-Setup.exe");
            try
            {
                using (var client = ApiEndpoints.CreateHttpClient())
                using (var response = await client.GetAsync(update.InstallerUrl, HttpCompletionOption.ResponseHeadersRead))
                {
                    response.EnsureSuccessStatusCode();
                    using (var input = await response.Content.ReadAsStreamAsync())
                    using (var output = new FileStream(installerPath, FileMode.Create, FileAccess.Write, FileShare.None))
                    {
                        await input.CopyToAsync(output);
                    }
                }

                if (!HashMatches(installerPath, update.Sha256))
                {
                    File.Delete(installerPath);
                    throw new InvalidOperationException("L'empreinte de l'installateur ne correspond pas à la version publiée.");
                }
                return installerPath;
            }
            catch
            {
                if (File.Exists(installerPath)) File.Delete(installerPath);
                throw;
            }
        }

        private static bool HashMatches(string filePath, string expectedHash)
        {
            using (var sha256 = SHA256.Create())
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
            return string.Format("{0}.{1}.{2}", version.Major, version.Minor, Math.Max(0, version.Build));
        }

        [System.Runtime.Serialization.DataContract]
        private sealed class UpdateResponse
        {
            [System.Runtime.Serialization.DataMember(Name = "updateAvailable")]
            public bool UpdateAvailable { get; set; }
            [System.Runtime.Serialization.DataMember(Name = "version")]
            public string Version { get; set; }
            [System.Runtime.Serialization.DataMember(Name = "installerUrl")]
            public string InstallerUrl { get; set; }
            [System.Runtime.Serialization.DataMember(Name = "sha256")]
            public string Sha256 { get; set; }
            [System.Runtime.Serialization.DataMember(Name = "releaseNotes")]
            public string ReleaseNotes { get; set; }
        }
    }
}
