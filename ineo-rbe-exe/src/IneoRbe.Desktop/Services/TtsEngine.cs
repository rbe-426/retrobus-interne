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

        private static string ProgIdOf(string engine)
        {
            return string.Equals(engine, "SAPI5", StringComparison.OrdinalIgnoreCase) ? "SAPI.SpVoice" : "Speech.VoiceText";
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
            var sapi5 = string.Equals(norm.Engine, "SAPI5", StringComparison.OrdinalIgnoreCase);
            var type = Type.GetTypeFromProgID(ProgIdOf(norm.Engine));
            if (type == null) throw new InvalidOperationException("Moteur vocal " + (sapi5 ? "SAPI5" : "SAPI4") + " non installé sur ce PC.");
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
