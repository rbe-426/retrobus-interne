using System;
using System.IO;
using System.Threading;
using System.Windows;
using System.Windows.Media.Imaging;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Maintenance
{
    // Fenêtre séparée qui reproduit la simulation de l'UC. La requête suivante part après la réponse :
    // sur une liaison lente (USB à 115200 bauds) le rythme s'adapte tout seul.
    public partial class MirrorWindow : Window
    {
        private readonly UcChannel _channel;
        private volatile bool _closed;

        public MirrorWindow(UcChannel channel)
        {
            _channel = channel;
            InitializeComponent();
            Title = "Miroir de l'UC - " + channel.Description;
            Closed += (sender, args) => _closed = true;
            Loaded += (sender, args) => Next();
        }

        private void Next()
        {
            if (_closed) return;
            ThreadPool.QueueUserWorkItem(delegate
            {
                var started = Environment.TickCount;
                MaintenanceReply reply = null;
                string error = null;
                try { reply = _channel.Request(MaintenanceProtocol.Mirror); }
                catch (Exception exception) { error = exception.Message; }
                var elapsed = Environment.TickCount - started;

                Dispatcher.BeginInvoke(new Action(() =>
                {
                    if (_closed) return;
                    if (reply == null || !reply.Ok || string.IsNullOrEmpty(reply.PngBase64))
                    {
                        MirrorStatus.Text = "Miroir indisponible : " + (error ?? (reply == null ? "pas de réponse" : reply.Error ?? "image vide"));
                    }
                    else
                    {
                        try
                        {
                            var image = new BitmapImage();
                            image.BeginInit();
                            image.CacheOption = BitmapCacheOption.OnLoad;
                            image.StreamSource = new MemoryStream(Convert.FromBase64String(reply.PngBase64));
                            image.EndInit();
                            image.Freeze();
                            MirrorImage.Source = image;
                            MirrorStatus.Text = "Image reçue à " + DateTime.Now.ToString("HH:mm:ss") + " (" + elapsed + " ms)";
                        }
                        catch (Exception exception)
                        {
                            MirrorStatus.Text = "Image illisible : " + exception.Message;
                        }
                    }

                    // Pause minimale pour ne pas saturer l'UC quand la liaison est rapide.
                    var timer = new System.Windows.Threading.DispatcherTimer { Interval = TimeSpan.FromMilliseconds(reply != null && reply.Ok ? 500 : 3000) };
                    timer.Tick += (s, a) => { timer.Stop(); Next(); };
                    timer.Start();
                }));
            });
        }
    }
}
