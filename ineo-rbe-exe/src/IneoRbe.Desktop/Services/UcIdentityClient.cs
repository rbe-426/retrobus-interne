using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace IneoRbe.Desktop.Services
{
    [DataContract]
    public sealed class UcVehicleInfo
    {
        [DataMember(Name = "parc")] public string Parc { get; set; }
        [DataMember(Name = "immat")] public string Immat { get; set; }
        [DataMember(Name = "marque")] public string Marque { get; set; }
        [DataMember(Name = "modele")] public string Modele { get; set; }
    }

    [DataContract]
    public sealed class UcProfileInfo
    {
        [DataMember(Name = "vehicleType")] public string VehicleType { get; set; }
        [DataMember(Name = "maxSpeedKmh")] public int? MaxSpeedKmh { get; set; }
        [DataMember(Name = "lengthM")] public double? LengthM { get; set; }
        [DataMember(Name = "widthM")] public double? WidthM { get; set; }
        [DataMember(Name = "heightM")] public double? HeightM { get; set; }
        [DataMember(Name = "options")] public string Options { get; set; }
    }

    // Un écran du véhicule : place sur le plan (en % de la longueur / largeur), taille et images.
    [DataContract]
    public sealed class ScreenInfo
    {
        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "place")] public string Place { get; set; }
        [DataMember(Name = "x")] public double X { get; set; }
        [DataMember(Name = "y")] public double Y { get; set; }
        [DataMember(Name = "widthPct")] public double WidthPct { get; set; }
        [DataMember(Name = "widthPx")] public int WidthPx { get; set; }
        [DataMember(Name = "heightPx")] public int HeightPx { get; set; }
        [DataMember(Name = "offlineMediaId")] public string OfflineMediaId { get; set; }
        [DataMember(Name = "onlineMediaId")] public string OnlineMediaId { get; set; }
    }

    [DataContract]
    public sealed class ScreenProfileInfo
    {
        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "revision")] public string Revision { get; set; }
        [DataMember(Name = "screens")] public List<ScreenInfo> Screens { get; set; }
    }

    [DataContract]
    public sealed class PilotCommand
    {
        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "type")] public string Type { get; set; }
    }

    [DataContract]
    public sealed class PilotCommandResult
    {
        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "status")] public string Status { get; set; }
        [DataMember(Name = "result")] public string Result { get; set; }
    }

    // Réponse de l'API : le profil du véhicule auquel ce poste (UC) est rattaché, ou son rôle de véhicule pilote.
    [DataContract]
    public sealed class UcIdentity
    {
        [DataMember(Name = "registered")] public bool Registered { get; set; }
        [DataMember(Name = "serial")] public string Serial { get; set; }
        [DataMember(Name = "isPilot")] public bool IsPilot { get; set; }
        [DataMember(Name = "pilotName")] public string PilotName { get; set; }
        [DataMember(Name = "vehicle")] public UcVehicleInfo Vehicle { get; set; }
        [DataMember(Name = "profile")] public UcProfileInfo Profile { get; set; }
        [DataMember(Name = "screenProfile")] public ScreenProfileInfo ScreenProfile { get; set; }
        [DataMember(Name = "commands")] public List<PilotCommand> Commands { get; set; }
        [DataMember(Name = "checkedAt")] public string CheckedAt { get; set; }
    }

    [DataContract]
    internal sealed class UcSyncRequest
    {
        [DataMember(Name = "serial")] public string Serial { get; set; }
        [DataMember(Name = "hostname")] public string Hostname { get; set; }
        [DataMember(Name = "appVersion")] public string AppVersion { get; set; }
        [DataMember(Name = "online")] public bool Online { get; set; }
        [DataMember(Name = "screensRevision")] public string ScreensRevision { get; set; }
        [DataMember(Name = "commandResults")] public List<PilotCommandResult> CommandResults { get; set; }
    }

    public sealed class UcIdentityClient
    {
        public async Task<UcIdentity> SyncAsync(string serial, string appVersion, string screensRevision, IList<PilotCommandResult> results)
        {
            if (!NetworkInterface.GetIsNetworkAvailable()) throw new InternetUnavailableException();

            var request = new UcSyncRequest
            {
                Serial = serial,
                Hostname = Environment.MachineName,
                AppVersion = appVersion,
                Online = true,
                ScreensRevision = screensRevision,
                CommandResults = results == null ? new List<PilotCommandResult>() : results.ToList(),
            };
            string json;
            using (var buffer = new MemoryStream())
            {
                new DataContractJsonSerializer(typeof(UcSyncRequest)).WriteObject(buffer, request);
                json = Encoding.UTF8.GetString(buffer.ToArray());
            }

            using (var client = ApiEndpoints.CreateHttpClient())
            {
                var response = await Post(client, ApiEndpoints.SyncUrl, json);
                try
                {
                    // Serveur pas encore mis à jour : on retombe sur l'ancienne identification (profil véhicule seul).
                    if (response.StatusCode == HttpStatusCode.NotFound)
                    {
                        response.Dispose();
                        response = await Post(client, ApiEndpoints.IdentifyUrl, json);
                    }
                    if (response.StatusCode == HttpStatusCode.BadRequest)
                    {
                        throw new InvalidOperationException("Le serveur refuse le numéro de série de cet ordinateur.");
                    }
                    if (response.StatusCode == (HttpStatusCode)429)
                    {
                        throw new InvalidOperationException("Trop de demandes, réessayez dans une minute.");
                    }
                    response.EnsureSuccessStatusCode();
                    using (var stream = await response.Content.ReadAsStreamAsync())
                    {
                        var identity = (UcIdentity)new DataContractJsonSerializer(typeof(UcIdentity)).ReadObject(stream);
                        if (identity == null) throw new InvalidOperationException("Réponse du serveur illisible.");
                        identity.CheckedAt = DateTime.Now.ToString("dd/MM/yyyy HH:mm");
                        return identity;
                    }
                }
                finally
                {
                    response.Dispose();
                }
            }
        }

        private static async Task<HttpResponseMessage> Post(HttpClient client, string url, string json)
        {
            using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
            {
                return await client.PostAsync(url, content);
            }
        }
    }

    // Dernier profil connu, conservé pour fonctionner sans Internet.
    public static class UcIdentityStore
    {
        private static string CachePath { get { return Path.Combine(SaeivStore.RootDirectory, "uc-profile.json"); } }

        public static UcIdentity Load(string serial)
        {
            try
            {
                if (!File.Exists(CachePath)) return null;
                using (var stream = File.OpenRead(CachePath))
                {
                    var identity = (UcIdentity)new DataContractJsonSerializer(typeof(UcIdentity)).ReadObject(stream);
                    return identity != null && identity.Serial == serial ? identity : null;
                }
            }
            catch (Exception)
            {
                return null;
            }
        }

        public static void Save(UcIdentity identity)
        {
            try
            {
                Directory.CreateDirectory(SaeivStore.RootDirectory);
                // Les commandes ne se rejouent jamais depuis le cache.
                var commands = identity.Commands;
                identity.Commands = null;
                try
                {
                    using (var stream = File.Create(CachePath))
                    {
                        new DataContractJsonSerializer(typeof(UcIdentity)).WriteObject(stream, identity);
                    }
                }
                finally
                {
                    identity.Commands = commands;
                }
            }
            catch (Exception)
            {
                // Le cache est facultatif : une écriture impossible ne doit pas bloquer le logiciel.
            }
        }
    }

    // Images des écrans téléchargées depuis le serveur et conservées localement (fonctionnement hors connexion).
    public static class MediaCache
    {
        private const long MaxBytes = 8L * 1024 * 1024;
        private static readonly Regex IdPattern = new Regex("^[a-f0-9]{32}$", RegexOptions.Compiled);

        private static string Directory_ { get { return Path.Combine(SaeivStore.RootDirectory, "media"); } }

        public static string PathFor(string mediaId)
        {
            if (string.IsNullOrEmpty(mediaId) || !IdPattern.IsMatch(mediaId)) return null;
            var path = Path.Combine(Directory_, mediaId);
            return File.Exists(path) ? path : null;
        }

        public static IEnumerable<string> IdsOf(ScreenProfileInfo profile)
        {
            if (profile == null || profile.Screens == null) return new string[0];
            return profile.Screens
                .SelectMany(screen => new[] { screen.OfflineMediaId, screen.OnlineMediaId })
                .Where(id => !string.IsNullOrEmpty(id))
                .Distinct()
                .ToList();
        }

        // Télécharge les images manquantes ; retourne le nombre d'échecs (l'écran affichera alors un fond neutre).
        public static async Task<int> EnsureAsync(IEnumerable<string> mediaIds)
        {
            var failures = 0;
            foreach (var id in mediaIds)
            {
                if (string.IsNullOrEmpty(id) || !IdPattern.IsMatch(id) || PathFor(id) != null) continue;
                try
                {
                    System.IO.Directory.CreateDirectory(Directory_);
                    using (var client = ApiEndpoints.CreateHttpClient())
                    using (var response = await client.GetAsync(ApiEndpoints.MediaUrl(id), HttpCompletionOption.ResponseHeadersRead))
                    {
                        response.EnsureSuccessStatusCode();
                        if (response.Content.Headers.ContentLength.HasValue && response.Content.Headers.ContentLength.Value > MaxBytes)
                        {
                            throw new InvalidOperationException("Image trop volumineuse.");
                        }
                        var temporary = Path.Combine(Directory_, id + ".tmp");
                        using (var input = await response.Content.ReadAsStreamAsync())
                        using (var output = new FileStream(temporary, FileMode.Create, FileAccess.Write, FileShare.None))
                        {
                            await input.CopyToAsync(output);
                        }
                        File.Move(temporary, Path.Combine(Directory_, id));
                    }
                }
                catch (Exception)
                {
                    failures++;
                }
            }
            return failures;
        }

        // Supprime les images qui ne sont plus utilisées par le profil courant.
        public static void Prune(IEnumerable<string> keepIds)
        {
            try
            {
                var keep = new HashSet<string>(keepIds);
                if (!System.IO.Directory.Exists(Directory_)) return;
                foreach (var file in System.IO.Directory.GetFiles(Directory_))
                {
                    if (!keep.Contains(Path.GetFileName(file))) File.Delete(file);
                }
            }
            catch (Exception)
            {
            }
        }
    }
}
