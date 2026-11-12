using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading;

namespace IneoRbe.Desktop.Services
{
    // Voix embarquée par liaison tardive COM : SAPI4 (Speech.VoiceText, voix du panneau « Parole ») ou SAPI5 (SAPI.SpVoice).
    // Chaque lecture s'exécute sur un thread STA dédié ; aucun type COM n'est référencé à la compilation.
    public static class TtsEngine
    {
        private static int _generation;

        public static bool IsAvailable(string engine)
        {
            return Type.GetTypeFromProgID(ProgIdOf(engine)) != null;
        }

        // Entrée de liste « Claire TICE / SAPI4 » : en réalité la voix SAPI5 Claire 22 kHz d'Infovox (32 bits, absente du panneau Parole 64 bits).
        public const string ClaireTice = "Claire TICE / SAPI4";

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

        public static void Cancel() { Interlocked.Increment(ref _generation); }

        // Garde-fou : un moteur qui ne signale jamais la fin ne doit pas lire sans fin.
        private static double MaxDurationMs(string text)
        {
            return 5000 + 150.0 * (text == null ? 0 : text.Length);
        }

        // Voix SAPI5 installées (même visibilité 32/64 bits que le processus appelant). Liste vide si le moteur est absent.
        public static List<string> InstalledVoices()
        {
            var result = new List<string>();
            try
            {
                var type = Type.GetTypeFromProgID("SAPI.SpVoice");
                if (type == null) return result;
                var voice = Activator.CreateInstance(type);
                try
                {
                    var voices = Call(voice, "GetVoices");
                    var count = (int)Get(voices, "Count");
                    for (var index = 0; index < count; index++)
                    {
                        var description = Call(Call(voices, "Item", index), "GetDescription") as string;
                        if (!string.IsNullOrEmpty(description)) result.Add(description);
                    }
                }
                finally { try { System.Runtime.InteropServices.Marshal.ReleaseComObject(voice); } catch (Exception) { } }
            }
            catch (Exception) { }
            return result;
        }

        // Lit le texte puis appelle done(null) ou done(message d'erreur), depuis le thread de lecture.
        public static void Speak(string text, TtsNorm norm, Action<string> done)
        {
            var generation = _generation;
            var finished = 0;
            Action<string> finish = error =>
            {
                if (Interlocked.Exchange(ref finished, 1) == 0 && done != null) done(error);
            };
            var thread = new Thread(() =>
            {
                string error = null;
                try { Run(text, norm ?? new TtsNorm(), generation); }
                catch (Exception exception) { error = (exception.InnerException ?? exception).Message; }
                finish(error);
            });
            thread.SetApartmentState(ApartmentState.STA);
            thread.IsBackground = true;
            thread.Start();

            // Un moteur qui se bloque dans un appel COM ne rend jamais la main : on libère l'interface.
            var watchdog = new Thread(() =>
            {
                if (!thread.Join((int)MaxDurationMs(text) + 4000))
                    finish("Le moteur vocal ne répond pas (SAPI4 : vérifiez la voix du panneau « Parole » de Windows).");
            });
            watchdog.IsBackground = true;
            watchdog.Start();
        }

        private static object Get(object target, string name) { return target.GetType().InvokeMember(name, BindingFlags.GetProperty, null, target, null); }
        private static void Set(object target, string name, object value) { target.GetType().InvokeMember(name, BindingFlags.SetProperty, null, target, new[] { value }); }
        private static object Call(object target, string name, params object[] args) { return target.GetType().InvokeMember(name, BindingFlags.InvokeMethod, null, target, args); }

        private static void Run(string text, TtsNorm norm, int generation)
        {
            if (norm.Voice == ClaireTice) norm = new TtsNorm { Engine = "SAPI5", Voice = "Claire 22", Rate = norm.Rate, Volume = norm.Volume };
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
                        var found = false;
                        for (var index = 0; index < count && !found; index++)
                        {
                            var item = Call(voices, "Item", index);
                            var description = Call(item, "GetDescription") as string;
                            if (description != null && description.IndexOf(norm.Voice, StringComparison.OrdinalIgnoreCase) >= 0) { Set(voice, "Voice", item); found = true; }
                        }
                        if (!found) throw new InvalidOperationException("Voix « " + norm.Voice + " » introuvable sur ce PC.");
                    }
                    var limit = DateTime.UtcNow.AddMilliseconds(MaxDurationMs(text));
                    Call(voice, "Speak", text, 1);
                    while (!(bool)Call(voice, "WaitUntilDone", 100))
                    {
                        if (generation != _generation || DateTime.UtcNow > limit) { Call(voice, "Speak", string.Empty, 3); break; }
                    }
                }
                else
                {
                    Call(voice, "Register", string.Empty, "IneoRbe");
                    Set(voice, "Enabled", 1);
                    try { Set(voice, "Speed", Math.Max(1, (int)(150 * norm.Rate / 100.0))); } catch (Exception) { }
                    var limit = DateTime.UtcNow.AddMilliseconds(MaxDurationMs(text));
                    Call(voice, "Speak", text, 0);
                    while ((bool)Get(voice, "IsSpeaking"))
                    {
                        if (generation != _generation || DateTime.UtcNow > limit) { Call(voice, "StopSpeaking"); break; }
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
