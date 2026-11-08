using System;
using System.IO;
using System.Runtime.Serialization.Json;

namespace IneoRbe.Desktop.Services
{
    public static class SaeivStore
    {
        public const string SoundsFolder = "sounds";
        public const string ScreensFolder = "screens";
        public static readonly string[] SoundExtensions = { ".wav", ".mp3", ".wma" };
        public static readonly string[] ImageExtensions = { ".png", ".jpg", ".jpeg", ".bmp", ".gif" };
        public const long MaxSoundBytes = 50L * 1024 * 1024;
        public const long MaxImageBytes = 20L * 1024 * 1024;

        // Dossier de données commun à l'utilisateur du poste ; l'outil Maintenance utilise son propre dossier.
        public static string RootFolderName = "IneoRbe";

        public static string RootDirectory
        {
            get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), RootFolderName); }
        }

        private static string ConfigPath { get { return Path.Combine(RootDirectory, "saeiv-config.json"); } }

        public static SaeivConfig Load()
        {
            if (!File.Exists(ConfigPath)) return new SaeivConfig();
            try
            {
                using (var stream = File.OpenRead(ConfigPath))
                {
                    var config = (SaeivConfig)new DataContractJsonSerializer(typeof(SaeivConfig)).ReadObject(stream);
                    return config ?? new SaeivConfig();
                }
            }
            catch (Exception)
            {
                // Le fichier illisible est conservé pour analyse au lieu d'être écrasé.
                var backup = ConfigPath + ".corrompu-" + DateTime.Now.ToString("yyyyMMddHHmmss");
                try { File.Move(ConfigPath, backup); } catch (Exception) { }
                return new SaeivConfig();
            }
        }

        public static void Save(SaeivConfig config)
        {
            Directory.CreateDirectory(RootDirectory);
            var temporary = ConfigPath + ".tmp";
            using (var stream = File.Create(temporary))
            {
                new DataContractJsonSerializer(typeof(SaeivConfig)).WriteObject(stream, config);
            }
            if (File.Exists(ConfigPath)) File.Delete(ConfigPath);
            File.Move(temporary, ConfigPath);
        }

        public static string Import(string sourcePath, string folder, string[] allowedExtensions, long maxBytes)
        {
            var extension = (Path.GetExtension(sourcePath) ?? string.Empty).ToLowerInvariant();
            if (Array.IndexOf(allowedExtensions, extension) < 0)
            {
                throw new InvalidOperationException("Format non pris en charge (" + extension + "). Formats acceptés : " + string.Join(", ", allowedExtensions));
            }

            var info = new FileInfo(sourcePath);
            if (!info.Exists) throw new FileNotFoundException("Le fichier sélectionné est introuvable.");
            if (info.Length > maxBytes) throw new InvalidOperationException("Le fichier dépasse la taille maximale de " + (maxBytes / 1024 / 1024) + " Mo.");

            var directory = Path.Combine(RootDirectory, folder);
            Directory.CreateDirectory(directory);
            var storedName = Guid.NewGuid().ToString("N") + extension;
            File.Copy(sourcePath, Path.Combine(directory, storedName));
            return storedName;
        }

        public static string ResolvePath(string folder, string storedName)
        {
            if (string.IsNullOrEmpty(storedName)) return null;
            return Path.Combine(RootDirectory, folder, Path.GetFileName(storedName));
        }

        public static void DeleteStored(string folder, string storedName)
        {
            var path = ResolvePath(folder, storedName);
            if (path == null) return;
            try { if (File.Exists(path)) File.Delete(path); } catch (Exception) { }
        }
    }
}
