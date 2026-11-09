using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Media;

namespace IneoRbe.Desktop.Services
{
    // Diffuse les annonces dont le point GPS (ou la pré-annonce) est atteint.
    public sealed class AnnouncementEngine : IDisposable
    {
        private readonly SaeivConfig _config;
        private readonly MediaPlayer _player = new MediaPlayer();
        private readonly Queue<string> _queue = new Queue<string>();
        private readonly HashSet<string> _inside = new HashSet<string>();
        private GpsSource _source;
        private bool _playing;
        private bool _startupPlayed;

        public AnnouncementEngine(SaeivConfig config)
        {
            _config = config;
            Status = "Diffusion automatique arrêtée.";
            _player.MediaEnded += (s, e) => { _playing = false; PlayNext(); };
            _player.MediaFailed += (s, e) =>
            {
                SetStatus("Lecture impossible : " + (e.ErrorException != null ? e.ErrorException.Message : "fichier audio illisible."));
                _playing = false;
                PlayNext();
            };
        }

        public event EventHandler StatusChanged;
        public string Status { get; private set; }
        public bool IsRunning { get { return _source != null; } }

        public void Start()
        {
            if (_source != null) return;
            _inside.Clear();

            _source = GpsSettings.Resolve(_config.GpsSource) == GpsSettings.Serial
                ? (GpsSource)new SerialGpsSource(_config.GpsPort, _config.GpsBaud)
                : new WindowsGpsSource();
            _source.PositionChanged += OnPositionChanged;
            _source.StatusChanged += OnSourceStatusChanged;
            SetStatus("Diffusion automatique active : en attente de position GPS.");
            _source.Start();
        }

        // Annonces « à l'allumage » : jouées une seule fois par lancement du logiciel, même sans diffusion GPS.
        public void PlayStartupAnnouncements()
        {
            if (_startupPlayed) return;
            _startupPlayed = true;
            foreach (var announcement in _config.Announcements.ToList())
            {
                if (!announcement.Enabled || announcement.Trigger != AnnouncementTrigger.Startup || string.IsNullOrEmpty(announcement.SoundFile)) continue;
                _queue.Enqueue(SaeivStore.ResolvePath(SaeivStore.SoundsFolder, announcement.SoundFile));
            }
            PlayNext();
        }

        public void Stop()
        {
            var source = _source;
            if (source == null) return;
            _source = null;
            source.PositionChanged -= OnPositionChanged;
            source.StatusChanged -= OnSourceStatusChanged;
            source.Dispose();
            _queue.Clear();
            _player.Stop();
            _playing = false;
            SetStatus("Diffusion automatique arrêtée.");
        }

        // Applique un changement de source GPS (type, port, vitesse) sans désactiver la diffusion.
        public void Restart()
        {
            if (_source == null) return;
            Stop();
            Start();
        }

        public void PlayTest(string path)
        {
            if (path == null || !File.Exists(path))
            {
                SetStatus("Fichier audio introuvable.");
                return;
            }
            _queue.Clear();
            _queue.Enqueue(path);
            _playing = false;
            PlayNext();
        }

        public void Dispose()
        {
            Stop();
            _player.Close();
        }

        // Les sources GPS notifient depuis leurs propres threads : tout repasse par le thread d'interface.
        private void OnSourceStatusChanged(string status)
        {
            Dispatch(() => SetStatus(status));
        }

        private readonly object _positionLock = new object();
        private double _lastLatitude;
        private double _lastLongitude;
        private DateTime _lastFixUtc = DateTime.MinValue;

        // Dernière position reçue, pour l'outil Maintenance. Retourne false tant qu'aucun point n'a été reçu.
        public bool TryGetLastPosition(out double latitude, out double longitude, out TimeSpan age)
        {
            lock (_positionLock)
            {
                latitude = _lastLatitude;
                longitude = _lastLongitude;
                age = DateTime.UtcNow - _lastFixUtc;
                return _lastFixUtc != DateTime.MinValue;
            }
        }

        private void OnPositionChanged(double latitude, double longitude)
        {
            lock (_positionLock)
            {
                _lastLatitude = latitude;
                _lastLongitude = longitude;
                _lastFixUtc = DateTime.UtcNow;
            }
            Dispatch(() =>
            {
                if (_source == null) return;
                Evaluate(latitude, longitude);
            });
        }

        private void Evaluate(double latitude, double longitude)
        {
            foreach (var announcement in _config.Announcements.ToList())
            {
                if (!announcement.Enabled || announcement.Trigger == AnnouncementTrigger.Startup || string.IsNullOrEmpty(announcement.SoundFile)) continue;
                var distance = DistanceMeters(latitude, longitude, announcement.Latitude, announcement.Longitude);
                if (distance <= announcement.DistanceMeters)
                {
                    if (_inside.Add(announcement.Id))
                    {
                        _queue.Enqueue(SaeivStore.ResolvePath(SaeivStore.SoundsFolder, announcement.SoundFile));
                        PlayNext();
                    }
                }
                else if (distance > announcement.DistanceMeters * 1.5 + 10)
                {
                    // Le point se réarme une fois le bus suffisamment éloigné.
                    _inside.Remove(announcement.Id);
                }
            }
        }

        private void PlayNext()
        {
            if (_playing) return;
            while (_queue.Count > 0)
            {
                var path = _queue.Dequeue();
                if (!File.Exists(path)) continue;
                _playing = true;
                _player.Open(new Uri(path));
                _player.Play();
                return;
            }
        }

        private static void Dispatch(Action action)
        {
            var dispatcher = Application.Current != null ? Application.Current.Dispatcher : null;
            if (dispatcher == null || dispatcher.CheckAccess()) action();
            else dispatcher.BeginInvoke(action);
        }

        private void SetStatus(string status)
        {
            Status = status;
            var handler = StatusChanged;
            if (handler != null) handler(this, EventArgs.Empty);
        }

        public static double DistanceMeters(double lat1, double lon1, double lat2, double lon2)
        {
            const double EarthRadius = 6371000;
            var dLat = ToRadians(lat2 - lat1);
            var dLon = ToRadians(lon2 - lon1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                + Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            return EarthRadius * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        }

        private static double ToRadians(double degrees) { return degrees * Math.PI / 180; }
    }
}
