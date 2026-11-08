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

        // Configuration propre à un véhicule (outil Planification) : saeiv-config-<parc>.json.
        public static string ProfilePath(string key)
        {
            if (string.IsNullOrEmpty(key)) return ConfigPath;
            var safe = new System.Text.StringBuilder();
            foreach (var c in key) safe.Append(char.IsLetterOrDigit(c) || c == '-' || c == '_' ? c : '_');
            return Path.Combine(RootDirectory, "saeiv-config-" + safe + ".json");
        }

        public static SaeivConfig Load() { return Load(null); }

        public static SaeivConfig Load(string key)
        {
            var path = ProfilePath(key);
            if (!File.Exists(path)) return new SaeivConfig();
            try
            {
                using (var stream = File.OpenRead(path))
                {
                    var config = (SaeivConfig)new DataContractJsonSerializer(typeof(SaeivConfig)).ReadObject(stream);
                    return config ?? new SaeivConfig();
                }
            }
            catch (Exception)
            {
                // Le fichier illisible est conservé pour analyse au lieu d'être écrasé.
                var backup = path + ".corrompu-" + DateTime.Now.ToString("yyyyMMddHHmmss");
                try { File.Move(path, backup); } catch (Exception) { }
                return new SaeivConfig();
            }
        }

        public static void Save(SaeivConfig config) { Save(config, null); }

        public static void Save(SaeivConfig config, string key)
        {
            var path = ProfilePath(key);
            Directory.CreateDirectory(RootDirectory);
            var temporary = path + ".tmp";
            using (var stream = File.Create(temporary))
            {
                new DataContractJsonSerializer(typeof(SaeivConfig)).WriteObject(stream, config);
            }
            if (File.Exists(path)) File.Delete(path);
            File.Move(temporary, path);
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
