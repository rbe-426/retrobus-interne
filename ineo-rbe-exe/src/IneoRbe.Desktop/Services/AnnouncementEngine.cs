using System;
using System.Collections.Generic;
using System.Device.Location;
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
        private GeoCoordinateWatcher _watcher;
        private bool _playing;

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
        public bool IsRunning { get { return _watcher != null; } }

        public void Start()
        {
            if (_watcher != null) return;
            _inside.Clear();
            _watcher = new GeoCoordinateWatcher(GeoPositionAccuracy.High) { MovementThreshold = 3 };
            _watcher.PositionChanged += OnPositionChanged;
            _watcher.StatusChanged += OnWatcherStatusChanged;
            if (!_watcher.TryStart(false, TimeSpan.FromSeconds(5)))
            {
                SetStatus("Aucun capteur GPS disponible : en attente de position.");
            }
            else
            {
                SetStatus("Diffusion automatique active : en attente de position GPS.");
            }
        }

        public void Stop()
        {
            if (_watcher == null) return;
            _watcher.PositionChanged -= OnPositionChanged;
            _watcher.StatusChanged -= OnWatcherStatusChanged;
            _watcher.Stop();
            _watcher.Dispose();
            _watcher = null;
            _queue.Clear();
            _player.Stop();
            _playing = false;
            SetStatus("Diffusion automatique arrêtée.");
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

        private void OnWatcherStatusChanged(object sender, GeoPositionStatusChangedEventArgs e)
        {
            Dispatch(() =>
            {
                if (e.Status == GeoPositionStatus.Disabled) SetStatus("Service de localisation désactivé sur ce poste.");
                else if (e.Status == GeoPositionStatus.NoData) SetStatus("Capteur GPS actif, en attente de signal.");
            });
        }

        private void OnPositionChanged(object sender, GeoPositionChangedEventArgs<GeoCoordinate> e)
        {
            var location = e.Position.Location;
            if (location.IsUnknown) return;
            Dispatch(() =>
            {
                SetStatus(string.Format("Position GPS : {0:0.00000}, {1:0.00000}", location.Latitude, location.Longitude));
                Evaluate(location.Latitude, location.Longitude);
            });
        }

        private void Evaluate(double latitude, double longitude)
        {
            foreach (var announcement in _config.Announcements.ToList())
            {
                if (!announcement.Enabled || string.IsNullOrEmpty(announcement.SoundFile)) continue;
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
