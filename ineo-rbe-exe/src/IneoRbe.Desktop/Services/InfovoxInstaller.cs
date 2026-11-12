using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Text;
using Microsoft.Win32;

namespace IneoRbe.Desktop.Services
{
    // Installation d'Infovox Desktop 2.2 (voix embarquées) à partir du package « Infovox Desktop 2.2.zip ».
    // Le package est la copie du dossier installé : on le dézippe, on recrée les clés de registre, puis on enregistre les
    // moteurs SAPI4/SAPI5. Compatible Windows XP / .NET 4.0 (pas de ZipFile : lecteur ZIP minimal ci-dessous).
    // Droits administrateur requis : lancé par l'installateur (« IneoRbe.Desktop.exe /install-voices »).
    public static class InfovoxInstaller
    {
        public const string PackageName = "Infovox Desktop 2.2.zip";
        private const string FolderName = "Infovox Desktop 2.2";
        private const string VoiceFolder = @"Engine\French\Claire22k";

        private static string LogPath { get { return Path.Combine(SaeivStore.RootDirectory, "voix-setup.log"); } }

        private static string ProgramFiles32()
        {
            var path = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            return string.IsNullOrEmpty(path) ? Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles) : path;
        }

        public static string InstallFolder { get { return Path.Combine(ProgramFiles32(), @"Acapela Group\" + FolderName); } }

        // Vrai si le moteur et la voix française sont présents (un dossier vide ou incomplet ne compte pas).
        public static bool IsInstalled()
        {
            var folder = InstallFolder;
            return File.Exists(Path.Combine(folder, "AcaTts.dll")) && File.Exists(Path.Combine(folder, VoiceFolder, "Claire22k.vco"));
        }

        // Emplacements où chercher le package : à côté du logiciel, puis dans le dossier de données partagé des UC.
        public static string FindPackage(string explicitPath)
        {
            var candidates = new List<string>();
            if (!string.IsNullOrEmpty(explicitPath)) candidates.Add(explicitPath);
            candidates.Add(Path.Combine(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "voix"), PackageName));
            candidates.Add(Path.Combine(Path.Combine(SaeivStore.RootDirectory, "voix"), PackageName));
            foreach (var candidate in candidates) if (File.Exists(candidate)) return candidate;
            return null;
        }

        // Point d'entrée de « /install-voices [package.zip] » : 0 = installé (ou déjà présent), 1 = échec, 2 = package introuvable.
        public static int RunCommand(string[] args)
        {
            try
            {
                Directory.CreateDirectory(SaeivStore.RootDirectory);
                if (IsInstalled()) { Log("Infovox déjà installé : rien à faire."); return 0; }
                var package = FindPackage(args.Length > 1 ? args[1] : null);
                if (package == null) { Log("Package " + PackageName + " introuvable."); return 2; }
                var error = Install(package);
                if (error != null) { Log("ÉCHEC : " + error); return 1; }
                Log("Infovox installé.");
                return 0;
            }
            catch (Exception exception) { try { Log("ÉCHEC : " + exception.Message); } catch (Exception) { } return 1; }
        }

        private static void Log(string message)
        {
            File.AppendAllText(LogPath, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "  " + message + Environment.NewLine, Encoding.UTF8);
        }

        // Retourne null si l'installation a réussi, sinon le message d'erreur.
        public static string Install(string packagePath)
        {
            try
            {
                var target = Path.Combine(ProgramFiles32(), "Acapela Group");
                Log("Dézippage de " + packagePath + " vers " + target);
                ExtractZip(packagePath, target);

                CopyLicenses(Path.GetDirectoryName(packagePath));
                WriteRegistry();
                foreach (var dll in new[] { "AcaTtsSapi4.dll", "AcaTtsSapi5.dll" })
                {
                    var error = RegisterComponent(Path.Combine(InstallFolder, dll));
                    if (error != null) return error;
                }
                if (!IsInstalled()) return "Des fichiers d'Infovox sont manquants après le dézippage.";

                // Le package pèse plus de 90 Mo : inutile de le garder une fois installé.
                try { File.Delete(packagePath); } catch (Exception) { }
                return null;
            }
            catch (Exception exception) { return exception.Message; }
        }

        // Les fichiers de licence ne sont pas dans le package : s'ils sont déposés dans « licence » à côté du zip, on les copie
        // dans le dossier désigné par la clé de registre HW2L\License (C:\Infovox2.lic\).
        private static void CopyLicenses(string packageFolder)
        {
            var source = Path.Combine(packageFolder ?? string.Empty, "licence");
            if (!Directory.Exists(source)) { Log("Aucun dossier « licence » : les licences Infovox restent à installer."); return; }
            var destination = Path.Combine(Path.GetPathRoot(Environment.SystemDirectory), "Infovox2.lic");
            Directory.CreateDirectory(destination);
            foreach (var file in Directory.GetFiles(source)) File.Copy(file, Path.Combine(destination, Path.GetFileName(file)), true);
            Log("Licences copiées vers " + destination);
        }

        private static void WriteRegistry()
        {
            var programFiles = ProgramFiles32();
            using (var root = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry32))
            {
                RegistryKey key = null;
                try
                {
                    foreach (var entry in InfovoxRegistryData.Entries)
                    {
                        var parts = entry.Split(new[] { '|' }, 3);
                        if (parts[0] == "K")
                        {
                            if (key != null) key.Close();
                            key = root.CreateSubKey(parts[1]);
                        }
                        else if (key != null && parts[0] == "S") key.SetValue(parts[1], parts[2].Replace("%PF%", programFiles), RegistryValueKind.String);
                        else if (key != null && parts[0] == "D") key.SetValue(parts[1], int.Parse(parts[2], System.Globalization.CultureInfo.InvariantCulture), RegistryValueKind.DWord);
                    }
                }
                finally { if (key != null) key.Close(); }
            }
            Log("Registre Infovox écrit.");
        }

        // regsvr32 de ce processus 32 bits (SysWOW64 sur Windows 64 bits) : les voix doivent être visibles des applications 32 bits.
        private static string RegisterComponent(string dllPath)
        {
            var info = new ProcessStartInfo(Path.Combine(Environment.SystemDirectory, "regsvr32.exe"), "/s \"" + dllPath + "\"") { UseShellExecute = false, CreateNoWindow = true };
            using (var process = Process.Start(info))
            {
                if (!process.WaitForExit(60000)) { try { process.Kill(); } catch (Exception) { } return "L'enregistrement de " + Path.GetFileName(dllPath) + " ne répond pas."; }
                if (process.ExitCode != 0) return "L'enregistrement de " + Path.GetFileName(dllPath) + " a échoué (code " + process.ExitCode + ").";
            }
            Log(Path.GetFileName(dllPath) + " enregistré.");
            return null;
        }

        // --- Lecteur ZIP minimal (méthodes « stockée » et « deflate », sans ZIP64 : le package fait moins de 4 Go). ---

        private sealed class ZipEntryInfo
        {
            public string Name;
            public int Method;
            public long CompressedSize;
            public long Size;
            public long LocalOffset;
        }

        private static void ExtractZip(string zipPath, string targetFolder)
        {
            var root = Path.GetFullPath(targetFolder).TrimEnd('\\') + "\\";
            using (var stream = new FileStream(zipPath, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                foreach (var entry in ReadDirectory(stream))
                {
                    var relative = entry.Name.Replace('/', '\\');
                    var full = Path.GetFullPath(Path.Combine(root, relative));
                    if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Chemin interdit dans le package : " + entry.Name);
                    if (entry.Name.EndsWith("/")) { Directory.CreateDirectory(full); continue; }
                    Directory.CreateDirectory(Path.GetDirectoryName(full));
                    ExtractEntry(stream, entry, full);
                }
            }
        }

        private static List<ZipEntryInfo> ReadDirectory(FileStream stream)
        {
            var reader = new BinaryReader(stream);
            var scan = (int)Math.Min(stream.Length, 70000);
            stream.Seek(-scan, SeekOrigin.End);
            var tail = reader.ReadBytes(scan);
            var end = -1;
            for (var index = tail.Length - 22; index >= 0; index--)
                if (tail[index] == 0x50 && tail[index + 1] == 0x4B && tail[index + 2] == 5 && tail[index + 3] == 6) { end = index; break; }
            if (end < 0) throw new InvalidDataException("Archive ZIP invalide.");
            var count = BitConverter.ToUInt16(tail, end + 10);
            var directoryOffset = BitConverter.ToUInt32(tail, end + 16);

            var result = new List<ZipEntryInfo>();
            stream.Seek(directoryOffset, SeekOrigin.Begin);
            for (var item = 0; item < count; item++)
            {
                var header = reader.ReadBytes(46);
                if (header.Length < 46 || BitConverter.ToUInt32(header, 0) != 0x02014B50) throw new InvalidDataException("Répertoire ZIP corrompu.");
                var flags = BitConverter.ToUInt16(header, 8);
                var nameLength = BitConverter.ToUInt16(header, 28);
                var extraLength = BitConverter.ToUInt16(header, 30);
                var commentLength = BitConverter.ToUInt16(header, 32);
                var name = (((flags & 0x800) != 0) ? Encoding.UTF8 : Encoding.GetEncoding(437)).GetString(reader.ReadBytes(nameLength));
                reader.ReadBytes(extraLength + commentLength);
                result.Add(new ZipEntryInfo
                {
                    Name = name,
                    Method = BitConverter.ToUInt16(header, 10),
                    CompressedSize = BitConverter.ToUInt32(header, 20),
                    Size = BitConverter.ToUInt32(header, 24),
                    LocalOffset = BitConverter.ToUInt32(header, 42),
                });
            }
            return result;
        }

        private static void ExtractEntry(FileStream stream, ZipEntryInfo entry, string destination)
        {
            stream.Seek(entry.LocalOffset, SeekOrigin.Begin);
            var header = new byte[30];
            if (stream.Read(header, 0, 30) != 30 || BitConverter.ToUInt32(header, 0) != 0x04034B50) throw new InvalidDataException("En-tête ZIP corrompu : " + entry.Name);
            stream.Seek(BitConverter.ToUInt16(header, 26) + BitConverter.ToUInt16(header, 28), SeekOrigin.Current);

            using (var output = new FileStream(destination, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                Stream data = new BoundedStream(stream, entry.CompressedSize);
                if (entry.Method == 8) data = new DeflateStream(data, CompressionMode.Decompress);
                else if (entry.Method != 0) throw new InvalidDataException("Méthode de compression non prise en charge : " + entry.Name);
                var buffer = new byte[81920];
                int read;
                while ((read = data.Read(buffer, 0, buffer.Length)) > 0) output.Write(buffer, 0, read);
                if (output.Length != entry.Size) throw new InvalidDataException("Taille inattendue après extraction : " + entry.Name);
            }
        }

        // Limite la lecture à la taille compressée de l'entrée.
        private sealed class BoundedStream : Stream
        {
            private readonly Stream _inner;
            private long _remaining;

            public BoundedStream(Stream inner, long length) { _inner = inner; _remaining = length; }

            public override int Read(byte[] buffer, int offset, int count)
            {
                if (_remaining <= 0) return 0;
                var read = _inner.Read(buffer, offset, (int)Math.Min(count, _remaining));
                _remaining -= read;
                return read;
            }

            public override bool CanRead { get { return true; } }
            public override bool CanSeek { get { return false; } }
            public override bool CanWrite { get { return false; } }
            public override long Length { get { throw new NotSupportedException(); } }
            public override long Position { get { throw new NotSupportedException(); } set { throw new NotSupportedException(); } }
            public override void Flush() { }
            public override long Seek(long offset, SeekOrigin origin) { throw new NotSupportedException(); }
            public override void SetLength(long value) { throw new NotSupportedException(); }
            public override void Write(byte[] buffer, int offset, int count) { throw new NotSupportedException(); }
        }
    }
}
