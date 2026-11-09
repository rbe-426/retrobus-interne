using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.NetworkInformation;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Text.RegularExpressions;

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
        [DataMember(Name = "contentRevision")] public string ContentRevision { get; set; }
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
        [DataMember(Name = "contentRevision")] public string ContentRevision { get; set; }
        [DataMember(Name = "commandResults")] public List<PilotCommandResult> CommandResults { get; set; }
    }

    public sealed class UcIdentityClient
    {
        // Appel bloquant : à exécuter hors du thread d'interface.
        public UcIdentity Sync(string serial, string appVersion, string screensRevision, string contentRevision, IList<PilotCommandResult> results)
        {
            if (!NetworkInterface.GetIsNetworkAvailable()) throw new InternetUnavailableException();

            var request = new UcSyncRequest
            {
                Serial = serial,
                Hostname = Environment.MachineName,
                AppVersion = appVersion,
                Online = true,
                ScreensRevision = screensRevision,
                ContentRevision = contentRevision,
                CommandResults = results == null ? new List<PilotCommandResult>() : results.ToList(),
            };
            byte[] json;
            using (var buffer = new MemoryStream())
            {
                new DataContractJsonSerializer(typeof(UcSyncRequest)).WriteObject(buffer, request);
                json = buffer.ToArray();
            }

            var response = HttpTransport.Send("POST", ApiEndpoints.SyncUrl, "application/json", json, 20000);
            // Serveur pas encore mis à jour : on retombe sur l'ancienne identification (profil véhicule seul).
            if (response.StatusCode == 404) response = HttpTransport.Send("POST", ApiEndpoints.IdentifyUrl, "application/json", json, 20000);

            if (response.StatusCode == 400) throw new InvalidOperationException("Le serveur refuse le numéro de série de cet ordinateur.");
            if (response.StatusCode == 429) throw new InvalidOperationException("Trop de demandes, réessayez dans une minute.");
            if (!response.IsSuccess) throw new InvalidOperationException("Le serveur a répondu " + response.StatusCode + ".");

            using (var stream = new MemoryStream(response.Body))
            {
                var identity = (UcIdentity)new DataContractJsonSerializer(typeof(UcIdentity)).ReadObject(stream);
                if (identity == null) throw new InvalidOperationException("Réponse du serveur illisible.");
                identity.CheckedAt = DateTime.Now.ToString("dd/MM/yyyy HH:mm");
                return identity;
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

        private static string CacheDirectory { get { return Path.Combine(SaeivStore.RootDirectory, "media"); } }

        public static string PathFor(string mediaId)
        {
            if (string.IsNullOrEmpty(mediaId) || !IdPattern.IsMatch(mediaId)) return null;
            var path = Path.Combine(CacheDirectory, mediaId);
            return File.Exists(path) ? path : null;
        }

        // Identifiant d'une image du configurateur : son nom de fichier sans extension (32 caractères hexadécimaux).
        public static string IdOfStored(string storedName)
        {
            if (string.IsNullOrEmpty(storedName)) return null;
            var id = Path.GetFileNameWithoutExtension(storedName);
            return IdPattern.IsMatch(id) ? id : null;
        }

        // Rend une image du configurateur (déjà téléchargée dans le dossier des écrans) disponible au simulateur.
        public static void Adopt(string storedName)
        {
            var id = IdOfStored(storedName);
            if (id == null || PathFor(id) != null) return;
            var source = SaeivStore.ResolvePath(SaeivStore.ScreensFolder, storedName);
            if (source == null || !File.Exists(source)) return;
            Directory.CreateDirectory(CacheDirectory);
            File.Copy(source, Path.Combine(CacheDirectory, id), true);
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
        public static int Ensure(IEnumerable<string> mediaIds)
        {
            var failures = 0;
            foreach (var id in mediaIds)
            {
                if (string.IsNullOrEmpty(id) || !IdPattern.IsMatch(id) || PathFor(id) != null) continue;
                try
                {
                    Directory.CreateDirectory(CacheDirectory);
                    var status = HttpTransport.DownloadToFile(ApiEndpoints.MediaUrl(id), Path.Combine(CacheDirectory, id), MaxBytes, 30000);
                    if (status != 200) failures++;
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
                if (!Directory.Exists(CacheDirectory)) return;
                foreach (var file in Directory.GetFiles(CacheDirectory))
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
