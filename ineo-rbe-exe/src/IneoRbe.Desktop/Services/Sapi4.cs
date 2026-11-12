using System;
using System.Runtime.InteropServices;
using System.Threading;

namespace IneoRbe.Desktop.Services
{
    // Lecture directe par SAPI4 (COM non scriptable) : sélectionne un mode vocal précis par son nom, ce que Speech.VoiceText ne permet pas.
    internal static class Sapi4
    {
        private static readonly Guid EnumeratorClsid = new Guid("D67C0280-C743-11cd-80E5-00AA003E4B50");
        private static readonly Guid AudioDestClsid = new Guid("CB96B400-C743-11cd-80E5-00AA003E4B50");
        private static readonly Guid NotifySinkIid = new Guid("C0FA8F40-4A46-101B-931A-00AA0047BA4F");

        [StructLayout(LayoutKind.Sequential)]
        private struct SData { public IntPtr Data; public uint Size; }

        [ComImport, Guid("6B837B20-4A47-101B-931A-00AA0047BA4F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface ITTSEnumW
        {
            [PreserveSig] int Next(uint count, IntPtr modeInfo, out uint fetched);
            [PreserveSig] int Skip(uint count);
            [PreserveSig] int Reset();
            [PreserveSig] int Clone(out ITTSEnumW clone);
            [PreserveSig] int Select(Guid modeId, [MarshalAs(UnmanagedType.IUnknown)] out object central, IntPtr audio);
        }

        [ComImport, Guid("28016060-4A47-101B-931A-00AA0047BA4F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface ITTSCentralW
        {
            [PreserveSig] int Inject(IntPtr text);
            [PreserveSig] int ModeGet(IntPtr modeInfo);
            [PreserveSig] int Phoneme(int charSet, uint flags, SData text, IntPtr phoneme);
            [PreserveSig] int PosnGet(out ulong position);
            [PreserveSig] int TextData(int charSet, uint flags, SData text, IntPtr bufNotify, Guid bufNotifyIid);
            [PreserveSig] int ToFileTime(ref ulong position, IntPtr fileTime);
            [PreserveSig] int AudioPause();
            [PreserveSig] int AudioResume();
            [PreserveSig] int AudioReset();
            [PreserveSig] int Register(IntPtr notifySink, Guid iid, out uint key);
            [PreserveSig] int UnRegister(uint key);
        }

        [ComImport, Guid("C0FA8F40-4A46-101B-931A-00AA0047BA4F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface ITTSNotifySinkW
        {
            [PreserveSig] int AttribChanged(uint attribute);
            [PreserveSig] int AudioStart(ulong timeStamp);
            [PreserveSig] int AudioStop(ulong timeStamp);
            [PreserveSig] int Visual(ulong timeStamp, ushort ipaPhoneme, ushort enginePhoneme, uint hints, IntPtr mouth);
        }

        [ComImport, Guid("1287A280-4A47-101B-931A-00AA0047BA4F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface ITTSAttributesW
        {
            [PreserveSig] int PitchGet(out ushort pitch);
            [PreserveSig] int PitchSet(ushort pitch);
            [PreserveSig] int RealTimeGet(out uint realTime);
            [PreserveSig] int RealTimeSet(uint realTime);
            [PreserveSig] int SpeedGet(out uint speed);
            [PreserveSig] int SpeedSet(uint speed);
            [PreserveSig] int VolumeGet(out uint volume);
            [PreserveSig] int VolumeSet(uint volume);
        }

        [ClassInterface(ClassInterfaceType.None)]
        private sealed class Sink : ITTSNotifySinkW
        {
            public readonly ManualResetEvent Stopped = new ManualResetEvent(false);
            public int AttribChanged(uint attribute) { return 0; }
            public int AudioStart(ulong timeStamp) { return 0; }
            public int AudioStop(ulong timeStamp) { Stopped.Set(); return 0; }
            public int Visual(ulong timeStamp, ushort ipaPhoneme, ushort enginePhoneme, uint hints, IntPtr mouth) { return 0; }
        }

        // Décalages dans TTSMODEINFOW (Unicode) : identifiant du mode à 1064, nom du mode à 1080.
        private const int ModeIdOffset = 1064;
        private const int ModeNameOffset = 1080;
        private const int ModeInfoSize = 4096;

        // Identifiant du mode SAPI4 dont le nom contient tous les fragments ; Guid.Empty s'il n'existe pas.
        public static Guid FindMode(params string[] fragments)
        {
            Guid found = Guid.Empty;
            var info = Marshal.AllocHGlobal(ModeInfoSize);
            try
            {
                var type = Type.GetTypeFromCLSID(EnumeratorClsid);
                var enumerator = (ITTSEnumW)Activator.CreateInstance(type);
                try
                {
                    for (var guard = 0; guard < 1000; guard++)
                    {
                        uint fetched;
                        if (enumerator.Next(1, info, out fetched) != 0 || fetched == 0) break;
                        var name = Marshal.PtrToStringUni(new IntPtr(info.ToInt64() + ModeNameOffset)) ?? string.Empty;
                        var all = true;
                        foreach (var fragment in fragments) if (name.IndexOf(fragment, StringComparison.OrdinalIgnoreCase) < 0) { all = false; break; }
                        if (!all) continue;
                        var bytes = new byte[16];
                        Marshal.Copy(new IntPtr(info.ToInt64() + ModeIdOffset), bytes, 0, 16);
                        found = new Guid(bytes);
                        break;
                    }
                }
                finally { Marshal.ReleaseComObject(enumerator); }
            }
            catch (Exception) { found = Guid.Empty; }
            finally { Marshal.FreeHGlobal(info); }
            return found;
        }

        // Vitesse : pourcentage de la vitesse par défaut de la voix (100 = normale). Volume : 0 à 100 % du maximum.
        private static void ApplyAttributes(object central, int ratePercent, int volumePercent)
        {
            var attributes = central as ITTSAttributesW;
            if (attributes == null) return;
            try
            {
                uint speed;
                if (attributes.SpeedGet(out speed) == 0 && speed > 0)
                {
                    var wanted = (uint)Math.Max(1.0, speed * Math.Max(50, Math.Min(150, ratePercent)) / 100.0);
                    attributes.SpeedSet(wanted);
                }
                var level = (uint)(0xFFFF * Math.Max(0, Math.Min(100, volumePercent)) / 100.0);
                attributes.VolumeSet((level << 16) | level);
            }
            catch (Exception) { }
        }

        // Lit le texte avec le mode donné ; bloque jusqu'à la fin de la lecture (ou maxMs). Appelé depuis un thread MTA.
        public static void Speak(Guid mode, string text, int ratePercent, int volumePercent, int maxMs, Func<bool> cancelled)
        {
            var type = Type.GetTypeFromCLSID(EnumeratorClsid);
            var enumerator = (ITTSEnumW)Activator.CreateInstance(type);
            object central = null, audio = null;
            var audioPointer = IntPtr.Zero;
            var sinkPointer = IntPtr.Zero;
            var textPointer = IntPtr.Zero;
            var key = 0u;
            ITTSCentralW tts = null;
            try
            {
                audio = Activator.CreateInstance(Type.GetTypeFromCLSID(AudioDestClsid));
                audioPointer = Marshal.GetIUnknownForObject(audio);
                var hr = enumerator.Select(mode, out central, audioPointer);
                if (hr != 0 || central == null) throw new InvalidOperationException("Voix SAPI4 indisponible (code 0x" + hr.ToString("X8") + ").");
                tts = (ITTSCentralW)central;
                ApplyAttributes(central, ratePercent, volumePercent);

                var sink = new Sink();
                sinkPointer = Marshal.GetComInterfaceForObject(sink, typeof(ITTSNotifySinkW));
                var iid = NotifySinkIid;
                tts.Register(sinkPointer, iid, out key);

                textPointer = Marshal.StringToHGlobalUni(text ?? string.Empty);
                var data = new SData { Data = textPointer, Size = (uint)(((text ?? string.Empty).Length + 1) * 2) };
                var bufIid = Guid.Empty;
                hr = tts.TextData(0, 0, data, IntPtr.Zero, bufIid);
                if (hr != 0) throw new InvalidOperationException("Lecture SAPI4 impossible (code 0x" + hr.ToString("X8") + ").");

                var started = Environment.TickCount;
                while (!sink.Stopped.WaitOne(100))
                {
                    if ((cancelled != null && cancelled()) || Environment.TickCount - started > maxMs) { tts.AudioReset(); break; }
                }
            }
            finally
            {
                try { if (tts != null && key != 0) tts.UnRegister(key); } catch (Exception) { }
                if (sinkPointer != IntPtr.Zero) Marshal.Release(sinkPointer);
                if (textPointer != IntPtr.Zero) Marshal.FreeHGlobal(textPointer);
                if (central != null) Marshal.ReleaseComObject(central);
                if (audioPointer != IntPtr.Zero) Marshal.Release(audioPointer);
                if (audio != null) Marshal.ReleaseComObject(audio);
                Marshal.ReleaseComObject(enumerator);
            }
        }
    }
}
