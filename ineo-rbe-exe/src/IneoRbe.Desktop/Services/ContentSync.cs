using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;

namespace IneoRbe.Desktop.Services
{
    // Contenu SAEIV publié depuis le configurateur : annonces sonores et écrans d'une révision.
    [DataContract]
    public sealed class ContentPackage
    {
        [DataMember(Name = "revision")] public string Revision { get; set; }
        [DataMember(Name = "hasContent")] public bool HasContent { get; set; }
        [DataMember(Name = "announcements")] public List<Announcement> Announcements { get; set; }
        [DataMember(Name = "screens")] public List<ScreenConfig> Screens { get; set; }
        [DataMember(Name = "lines")] public List<LineConfig> Lines { get; set; }
        [DataMember(Name = "norms")] public SaeivNorms Norms { get; set; }
        [DataMember(Name = "exceptional")] public List<ExceptionalMessage> Exceptional { get; set; }
    }

    // Applique sur cet UC la révision de contenu publiée : tant que ce n'est pas fait, l'UC ne déclare pas la révision comme appliquée.
    public static class ContentSync
    {
        private const int Timeout = 60000;

        private static string AppliedPath { get { return Path.Combine(SaeivStore.RootDirectory, "content-applied.txt"); } }

        public static string LoadApplied()
        {
            try
            {
                if (!File.Exists(AppliedPath)) return null;
                var text = File.ReadAllText(AppliedPath, Encoding.UTF8).Trim();
                return text.Length == 0 ? null : text;
            }
            catch (Exception)
            {
                return null;
            }
        }

        private static void SaveApplied(string revision)
        {
            Directory.CreateDirectory(SaeivStore.RootDirectory);
            File.WriteAllText(AppliedPath, revision ?? string.Empty, Encoding.UTF8);
        }

        // Appel bloquant. Retourne la révision appliquée, ou lève une exception (rien n'est alors modifié : nouvelle tentative à la prochaine synchronisation).
        public static bool LastHadContent { get; private set; }

        public static string Apply(string serial, SaeivConfig config)
        {
            LastHadContent = false;
            var response = HttpTransport.Send("GET", ApiEndpoints.ContentUrl(serial), null, null, Timeout);
            if (!response.IsSuccess) throw new InvalidOperationException("Le serveur a répondu " + response.StatusCode + " pour le contenu.");

            ContentPackage package;
            using (var stream = new MemoryStream(response.Body))
            {
                package = (ContentPackage)new DataContractJsonSerializer(typeof(ContentPackage)).ReadObject(stream);
            }
            if (package == null || string.IsNullOrEmpty(package.Revision)) throw new InvalidOperationException("Contenu du serveur illisible.");

            // Révision sans contenu (publiée avant l'envoi du contenu) : elle n'est pas considérée comme appliquée.
            if (!package.HasContent) return package.Revision;

            var announcements = package.Announcements ?? new List<Announcement>();
            var screens = package.Screens ?? new List<ScreenConfig>();

            foreach (var announcement in announcements)
            {
                Download(SaeivStore.SoundsFolder, announcement.SoundFile);
            }
            foreach (var screen in screens)
            {
                Download(SaeivStore.ScreensFolder, screen.OfflineImage);
                Download(SaeivStore.ScreensFolder, screen.OnlineImage);
                MediaCache.Adopt(screen.OfflineImage);
                MediaCache.Adopt(screen.OnlineImage);
            }

            // Réglages propres à l'UC (GPS, liaison de maintenance) conservés : seuls les annonces et les écrans viennent de la révision.
            config.Announcements = announcements;
            config.Screens = screens;
            if (package.Lines != null) config.Lines = package.Lines;
            if (package.Exceptional != null) config.Exceptional = package.Exceptional;
            if (package.Norms != null)
            {
                Download(SaeivStore.ScreensFolder, package.Norms.Screens.BaseImage);
                config.Norms = package.Norms;
            }
            SaeivStore.Save(config);
            SaveApplied(package.Revision);
            LastHadContent = true;
            return package.Revision;
        }

        private static void Download(string folder, string storedName)
        {
            if (string.IsNullOrEmpty(storedName)) return;
            var path = SaeivStore.ResolvePath(folder, storedName);
            if (File.Exists(path)) return;
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            var status = HttpTransport.DownloadToFile(ApiEndpoints.ContentFileUrl(storedName), path, 26L * 1024 * 1024, Timeout * 2);
            if (status != 200) throw new InvalidOperationException("Fichier « " + storedName + " » indisponible (code " + status + ").");
        }

        // Écrans de la configuration locale, au format du profil écran de l'URBEX (affichage dans le simulateur) ; null s'il n'y en a pas.
        public static ScreenProfileInfo BuildScreenProfile(SaeivConfig config, string revision)
        {
            if (config == null || config.Screens == null || config.Screens.Count == 0) return null;
            return new ScreenProfileInfo
            {
                Id = "content",
                Name = "Configurateur SAEIV",
                Revision = string.IsNullOrEmpty(revision) ? "local" : revision,
                Screens = config.Screens.Select(screen => new ScreenInfo
                {
                    Id = screen.Id,
                    Name = screen.Name,
                    Place = screen.Place,
                    X = screen.X,
                    Y = screen.Y,
                    WidthPct = screen.WidthPct,
                    WidthPx = screen.WidthPx,
                    HeightPx = screen.HeightPx,
                    OfflineMediaId = MediaCache.IdOfStored(screen.OfflineImage),
                    OnlineMediaId = MediaCache.IdOfStored(screen.OnlineImage),
                }).ToList(),
            };
        }
    }
}
