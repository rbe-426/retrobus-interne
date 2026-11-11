using System;
using System.Reflection;
using System.Threading;

namespace IneoRbe.Desktop.Services
{
    // Voix embarquée par liaison tardive COM : SAPI4 (Speech.VoiceText, voix du panneau « Parole ») ou SAPI5 (SAPI.SpVoice).
    // Chaque lecture s'exécute sur un thread STA dédié ; aucun type COM n'est référencé à la compilation.
    public static class TtsEngine
    {
        private static readonly object Sync = new object();
        private static volatile bool _cancel;

        public static bool IsAvailable(string engine)
        {
            return Type.GetTypeFromProgID(ProgIdOf(engine)) != null;
        }

        // INFOVOX (Acapela Infovox Desktop) s'expose comme voix SAPI5 : même lecture, voix choisie par son nom.
        private static bool IsSapi5(string engine)
        {
            return string.Equals(engine, "SAPI5", StringComparison.OrdinalIgnoreCase) || string.Equals(engine, "INFOVOX", StringComparison.OrdinalIgnoreCase);
        }

        private static string ProgIdOf(string engine)
        {
            return IsSapi5(engine) ? "SAPI.SpVoice" : "Speech.VoiceText";
        }

        // Voix SAPI5 installées sur ce PC (Infovox comprise).
        public static string[] ListVoices()
        {
            var names = new System.Collections.Generic.List<string>();
            var type = Type.GetTypeFromProgID("SAPI.SpVoice");
            if (type == null) return names.ToArray();
            object voice = null;
            try
            {
                voice = Activator.CreateInstance(type);
                var voices = Call(voice, "GetVoices");
                var count = (int)Get(voices, "Count");
                for (var index = 0; index < count; index++)
                {
                    var description = Call(Call(voices, "Item", index), "GetDescription") as string;
                    if (!string.IsNullOrEmpty(description)) names.Add(description);
                }
            }
            catch (Exception) { }
            finally { if (voice != null) { try { System.Runtime.InteropServices.Marshal.ReleaseComObject(voice); } catch (Exception) { } } }
            return names.ToArray();
        }

        // Dossier d'Infovox Desktop 2.2 s'il est installé.
        public static string InfovoxFolder()
        {
            foreach (var root in new[] { Environment.GetEnvironmentVariable("ProgramFiles(x86)"), Environment.GetEnvironmentVariable("ProgramFiles") })
            {
                if (string.IsNullOrEmpty(root)) continue;
                var folder = System.IO.Path.Combine(root, @"Acapela Group\Infovox Desktop 2.2");
                if (System.IO.Directory.Exists(folder)) return folder;
            }
            return null;
        }

        public static bool InfovoxInstalled() { return InfovoxFolder() != null; }

        // Dossier « voix » contenant les installateurs Infovox (à côté du logiciel, ou dans le dépôt en développement).
        public static string InfovoxSetupFolder()
        {
            var dir = AppDomain.CurrentDomain.BaseDirectory;
            for (var level = 0; level < 8 && !string.IsNullOrEmpty(dir); level++)
            {
                var candidate = System.IO.Path.Combine(dir, "voix");
                if (System.IO.File.Exists(System.IO.Path.Combine(candidate, InfovoxEngineSetup))) return candidate;
                dir = System.IO.Path.GetDirectoryName(dir);
            }
            return null;
        }

        public const string InfovoxEngineSetup = "Infovox Desktop v2.2 Engine.exe";
        public const string InfovoxUpdateSetup = "Infovox Desktop v2.210 Service Pack 1.exe";

        // Installe le moteur puis le Service Pack 1 (droits administrateur requis). Retourne null si tout s'est bien passé.
        // L'installateur du moteur est lancé avec son assistant ; la clé de licence reste à saisir par l'utilisateur.
        public static string InstallInfovox()
        {
            var folder = InfovoxSetupFolder();
            if (folder == null) return "Installateurs Infovox introuvables (dossier « voix »).";
            try
            {
                if (!InfovoxInstalled()) RunSetup(System.IO.Path.Combine(folder, InfovoxEngineSetup), string.Empty);
                if (!InfovoxInstalled()) return "Installation du moteur Infovox non terminée.";
                var update = System.IO.Path.Combine(folder, InfovoxUpdateSetup);
                if (System.IO.File.Exists(update)) RunSetup(update, "/SILENT /NORESTART");
                return null;
            }
            catch (Exception exception) { return exception.Message; }
        }

        private static void RunSetup(string path, string arguments)
        {
            var info = new System.Diagnostics.ProcessStartInfo(path, arguments) { UseShellExecute = true, Verb = "runas" };
            using (var process = System.Diagnostics.Process.Start(info)) { if (process != null) process.WaitForExit(); }
        }

        public static void Cancel() { _cancel = true; }

        // Lit le texte puis appelle done(null) ou done(message d'erreur), depuis le thread de lecture.
        public static void Speak(string text, TtsNorm norm, Action<string> done)
        {
            var thread = new Thread(() =>
            {
                string error = null;
                lock (Sync)
                {
                    _cancel = false;
                    try { Run(text, norm ?? new TtsNorm()); }
                    catch (Exception exception) { error = (exception.InnerException ?? exception).Message; }
                }
                if (done != null) done(error);
            });
            thread.SetApartmentState(ApartmentState.STA);
            thread.IsBackground = true;
            thread.Start();
        }

        private static object Get(object target, string name) { return target.GetType().InvokeMember(name, BindingFlags.GetProperty, null, target, null); }
        private static void Set(object target, string name, object value) { target.GetType().InvokeMember(name, BindingFlags.SetProperty, null, target, new[] { value }); }
        private static object Call(object target, string name, params object[] args) { return target.GetType().InvokeMember(name, BindingFlags.InvokeMethod, null, target, args); }

        private static void Run(string text, TtsNorm norm)
        {
            var sapi5 = IsSapi5(norm.Engine);
            var type = Type.GetTypeFromProgID(ProgIdOf(norm.Engine));
            if (type == null) throw new InvalidOperationException("Moteur vocal " + (norm.Engine ?? "SAPI4") + " non installé sur ce PC.");
            var voice = Activator.CreateInstance(type);
            try
            {
                if (sapi5)
                {
                    Set(voice, "Rate", Math.Max(-10, Math.Min(10, (norm.Rate - 100) / 10)));
                    Set(voice, "Volume", Math.Max(0, Math.Min(100, norm.Volume)));
                    if (!string.IsNullOrEmpty(norm.Voice))
                    {
                        var voices = Call(voice, "GetVoices");
                        var count = (int)Get(voices, "Count");
                        for (var index = 0; index < count; index++)
                        {
                            var item = Call(voices, "Item", index);
                            var description = Call(item, "GetDescription") as string;
                            if (description != null && description.IndexOf(norm.Voice, StringComparison.OrdinalIgnoreCase) >= 0) { Set(voice, "Voice", item); break; }
                        }
                    }
                    Call(voice, "Speak", text, 1);
                    while (!(bool)Call(voice, "WaitUntilDone", 100)) { if (_cancel) { Call(voice, "Speak", string.Empty, 3); break; } }
                }
                else
                {
                    Call(voice, "Register", string.Empty, "IneoRbe");
                    Set(voice, "Enabled", 1);
                    try { Set(voice, "Speed", Math.Max(1, (int)(150 * norm.Rate / 100.0))); } catch (Exception) { }
                    Call(voice, "Speak", text, 0);
                    while ((bool)Get(voice, "IsSpeaking"))
                    {
                        if (_cancel) { Call(voice, "StopSpeaking"); break; }
                        Thread.Sleep(80);
                    }
                }
            }
            finally
            {
                try { System.Runtime.InteropServices.Marshal.ReleaseComObject(voice); } catch (Exception) { }
            }
        }

        // Remplace {ligne} {destination} {arret} {correspondances} dans un texte de norme.
        public static string Fill(string template, string line, string destination, string stop, string correspondences)
        {
            return (template ?? string.Empty)
                .Replace("{ligne}", line ?? string.Empty)
                .Replace("{destination}", destination ?? string.Empty)
                .Replace("{arret}", stop ?? string.Empty)
                .Replace("{correspondances}", correspondences ?? string.Empty);
        }
    }
}
