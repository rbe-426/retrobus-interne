using System;
using System.Collections.Generic;
using System.Device.Location;
using System.IO;
using System.IO.Ports;
using System.Linq;
using System.Threading;

namespace IneoRbe.Desktop.Services
{
    public static class GpsSettings
    {
        public const string Auto = "AUTO";
        public const string Windows = "WINDOWS";
        public const string Serial = "SERIAL";
        public static readonly int[] BaudRates = { 4800, 9600, 19200, 38400, 57600, 115200 };

        // L'API de localisation de Windows n'existe qu'à partir de Windows 7 (6.1) : avant, le GPS se lit sur un port série.
        public static bool WindowsLocationAvailable
        {
            get { return Environment.OSVersion.Platform == PlatformID.Win32NT && Environment.OSVersion.Version >= new Version(6, 1); }
        }

        public static string Resolve(string setting)
        {
            if (setting == Windows || setting == Serial) return setting;
            return WindowsLocationAvailable ? Windows : Serial;
        }
    }

    // Source de position (GPS) : localisation Windows ou récepteur NMEA sur port série.
    public abstract class GpsSource : IDisposable
    {
        public event Action<double, double> PositionChanged;
        public event Action<string> StatusChanged;

        public abstract void Start();
        public abstract void Stop();

        public void Dispose()
        {
            Stop();
        }

        protected void RaisePosition(double latitude, double longitude)
        {
            var handler = PositionChanged;
            if (handler != null) handler(latitude, longitude);
        }

        protected void RaiseStatus(string status)
        {
            var handler = StatusChanged;
            if (handler != null) handler(status);
        }
    }

    public sealed class WindowsGpsSource : GpsSource
    {
        private GeoCoordinateWatcher _watcher;

        public override void Start()
        {
            if (_watcher != null) return;
            if (!GpsSettings.WindowsLocationAvailable)
            {
                RaiseStatus("La localisation Windows n'existe pas sur ce système : choisissez « Port série » comme source GPS.");
                return;
            }
            _watcher = new GeoCoordinateWatcher(GeoPositionAccuracy.High) { MovementThreshold = 3 };
            _watcher.PositionChanged += OnPositionChanged;
            _watcher.StatusChanged += OnStatusChanged;
            RaiseStatus(_watcher.TryStart(false, TimeSpan.FromSeconds(5))
                ? "Diffusion automatique active : en attente de position GPS."
                : "Aucun capteur GPS Windows disponible : en attente de position.");
        }

        public override void Stop()
        {
            if (_watcher == null) return;
            _watcher.PositionChanged -= OnPositionChanged;
            _watcher.StatusChanged -= OnStatusChanged;
            _watcher.Stop();
            _watcher.Dispose();
            _watcher = null;
        }

        private void OnStatusChanged(object sender, GeoPositionStatusChangedEventArgs e)
        {
            if (e.Status == GeoPositionStatus.Disabled) RaiseStatus("Service de localisation désactivé sur ce poste.");
            else if (e.Status == GeoPositionStatus.NoData) RaiseStatus("Capteur GPS actif, en attente de signal.");
        }

        private void OnPositionChanged(object sender, GeoPositionChangedEventArgs<GeoCoordinate> e)
        {
            var location = e.Position.Location;
            if (location.IsUnknown) return;
            RaisePosition(location.Latitude, location.Longitude);
        }
    }

    // Lit un récepteur GPS (puce USB/série) qui émet des phrases NMEA. Port « AUTO » : détecte le port qui parle NMEA.
    public sealed class SerialGpsSource : GpsSource
    {
        private const int DetectionSeconds = 4;
        private readonly string _portSetting;
        private readonly int _baud;
        private volatile bool _stop;
        private Thread _thread;

        public SerialGpsSource(string portSetting, int baud)
        {
            _portSetting = string.IsNullOrWhiteSpace(portSetting) ? GpsSettings.Auto : portSetting.Trim();
            _baud = baud > 0 ? baud : 9600;
        }

        public override void Start()
        {
            if (_thread != null) return;
            _stop = false;
            _thread = new Thread(Run) { IsBackground = true, Name = "GPS série" };
            _thread.Start();
        }

        public override void Stop()
        {
            _stop = true;
            var thread = _thread;
            _thread = null;
            if (thread != null && thread != Thread.CurrentThread) thread.Join(3000);
        }

        private bool AutoDetect { get { return string.Equals(_portSetting, GpsSettings.Auto, StringComparison.OrdinalIgnoreCase); } }

        private void Run()
        {
            while (!_stop)
            {
                var candidates = AutoDetect ? SerialPort.GetPortNames().OrderBy(name => name, StringComparer.OrdinalIgnoreCase).ToList() : new List<string> { _portSetting };
                if (candidates.Count == 0) RaiseStatus("Aucun port série détecté : branchez le récepteur GPS.");

                foreach (var name in candidates)
                {
                    if (_stop) return;
                    TryPort(name);
                }
                Wait(10);
            }
        }

        // Ouvre le port ; en détection automatique, abandonne s'il ne reçoit aucune phrase NMEA.
        private void TryPort(string name)
        {
            SerialPort port = null;
            try
            {
                port = new SerialPort(name, _baud, Parity.None, 8, StopBits.One) { ReadTimeout = 1000, NewLine = "\n" };
                RaiseStatus(AutoDetect ? "Recherche du GPS sur " + name + " (" + _baud + " bauds)…" : "Ouverture de " + name + " (" + _baud + " bauds)…");
                port.Open();

                var deadline = DateTime.UtcNow.AddSeconds(DetectionSeconds);
                var confirmed = false;
                while (!_stop)
                {
                    string line;
                    try
                    {
                        line = port.ReadLine();
                    }
                    catch (TimeoutException)
                    {
                        if (!confirmed && DateTime.UtcNow > deadline)
                        {
                            RaiseStatus("Aucune donnée GPS sur " + name + " : vérifiez le port et la vitesse (bauds).");
                            return;
                        }
                        continue;
                    }

                    if (!NmeaParser.IsValid(line)) continue;
                    if (!confirmed)
                    {
                        confirmed = true;
                        RaiseStatus("GPS détecté sur " + name + " : en attente de signal satellite.");
                    }

                    double latitude, longitude;
                    if (NmeaParser.TryParsePosition(line, out latitude, out longitude))
                    {
                        RaiseStatus(string.Format("Position GPS ({0}) : {1:0.00000}, {2:0.00000}", name, latitude, longitude));
                        RaisePosition(latitude, longitude);
                    }
                }
            }
            catch (UnauthorizedAccessException)
            {
                RaiseStatus("Le port " + name + " est utilisé par un autre programme.");
            }
            catch (IOException exception)
            {
                RaiseStatus("Port " + name + " indisponible : " + exception.Message);
            }
            catch (ArgumentException exception)
            {
                RaiseStatus("Port " + name + " invalide : " + exception.Message);
            }
            catch (InvalidOperationException exception)
            {
                RaiseStatus("Port " + name + " : " + exception.Message);
            }
            finally
            {
                if (port != null)
                {
                    try { port.Dispose(); } catch (Exception) { }
                }
            }
        }

        private void Wait(int seconds)
        {
            for (var elapsed = 0; elapsed < seconds * 10 && !_stop; elapsed++) Thread.Sleep(100);
        }
    }
}
