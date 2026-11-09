using System;
using System.IO;
using System.IO.Ports;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace IneoRbe.Desktop.Services
{
    // Reçoit les demandes de l'outil Maintenance : HTTP local (Wi-Fi / réseau) et ligne série (câble USB-USB).
    // Le service est en lecture seule : informations et miroir d'écran, aucune modification de l'UC.
    public sealed class MaintenanceLink : IDisposable
    {
        private const int SerialRetryMs = 5000;
        private readonly Func<string, MaintenanceReply> _handler;
        private readonly string _serialPortName;
        private TcpListener _listener;
        private volatile bool _stopped;

        public MaintenanceLink(Func<string, MaintenanceReply> handler, string serialPortName)
        {
            _handler = handler;
            _serialPortName = serialPortName;
        }

        public void Start()
        {
            try
            {
                _listener = new TcpListener(IPAddress.Any, MaintenanceProtocol.TcpPort);
                _listener.Start();
                Background(AcceptLoop, "maintenance-http");
            }
            catch (Exception)
            {
                // Port déjà pris ou pare-feu : la liaison USB-USB reste utilisable.
                _listener = null;
            }

            if (!string.IsNullOrEmpty(_serialPortName) && !string.Equals(_serialPortName, "NONE", StringComparison.OrdinalIgnoreCase))
            {
                Background(SerialLoop, "maintenance-serial");
            }
        }

        public void Dispose()
        {
            _stopped = true;
            var listener = _listener;
            if (listener != null)
            {
                try { listener.Stop(); } catch (Exception) { }
            }
        }

        private static void Background(ThreadStart work, string name)
        {
            new Thread(work) { IsBackground = true, Name = name }.Start();
        }

        private void AcceptLoop()
        {
            while (!_stopped)
            {
                TcpClient client;
                try { client = _listener.AcceptTcpClient(); }
                catch (Exception) { return; }
                ThreadPool.QueueUserWorkItem(delegate { Serve(client); });
            }
        }

        private void Serve(TcpClient client)
        {
            using (client)
            {
                try
                {
                    client.ReceiveTimeout = 5000;
                    client.SendTimeout = 10000;
                    var stream = client.GetStream();
                    var request = ReadRequestHead(stream);
                    string json;
                    int status = 200;
                    var command = ParseCommand(request);
                    if (command == null)
                    {
                        status = 404;
                        json = MaintenanceProtocol.ToJson(MaintenanceReply.Failure("Commande inconnue."));
                    }
                    else json = MaintenanceProtocol.ToJson(Safe(command));

                    var body = Encoding.UTF8.GetBytes(json);
                    var head = Encoding.ASCII.GetBytes(
                        "HTTP/1.1 " + status + (status == 200 ? " OK" : " Not Found") + "\r\n" +
                        "Content-Type: application/json; charset=utf-8\r\n" +
                        "Content-Length: " + body.Length + "\r\n" +
                        "Cache-Control: no-store\r\n" +
                        "Connection: close\r\n\r\n");
                    stream.Write(head, 0, head.Length);
                    stream.Write(body, 0, body.Length);
                }
                catch (Exception)
                {
                    // Client parti ou requête invalide : rien à répondre.
                }
            }
        }

        private static string ReadRequestHead(Stream stream)
        {
            var buffer = new byte[8192];
            var length = 0;
            while (length < buffer.Length)
            {
                var read = stream.Read(buffer, length, buffer.Length - length);
                if (read <= 0) break;
                length += read;
                var text = Encoding.ASCII.GetString(buffer, 0, length);
                if (text.IndexOf("\r\n\r\n", StringComparison.Ordinal) >= 0) return text;
            }
            return Encoding.ASCII.GetString(buffer, 0, length);
        }

        private static string ParseCommand(string head)
        {
            var line = head.Split('\r', '\n')[0];
            var parts = line.Split(' ');
            if (parts.Length < 2 || parts[0] != "GET") return null;
            var path = parts[1].Split('?')[0];
            const string prefix = "/maintenance/";
            if (!path.StartsWith(prefix, StringComparison.Ordinal)) return null;
            return NormalizeCommand(path.Substring(prefix.Length));
        }

        private static string NormalizeCommand(string command)
        {
            command = (command ?? string.Empty).Trim().ToLowerInvariant();
            return command == MaintenanceProtocol.Ping || command == MaintenanceProtocol.Info || command == MaintenanceProtocol.Mirror || command == MaintenanceProtocol.Update || command == MaintenanceProtocol.Content || command == MaintenanceProtocol.Restart ? command : null;
        }

        private MaintenanceReply Safe(string command)
        {
            try { return _handler(command); }
            catch (Exception exception) { return MaintenanceReply.Failure(exception.Message); }
        }

        private void SerialLoop()
        {
            while (!_stopped)
            {
                try
                {
                    using (var port = new SerialPort(_serialPortName, MaintenanceProtocol.DefaultBaud, Parity.None, 8, StopBits.One))
                    {
                        port.ReadTimeout = 1000;
                        port.WriteTimeout = 5000;
                        port.NewLine = "\n";
                        port.Open();
                        while (!_stopped)
                        {
                            string line;
                            try { line = port.ReadLine(); }
                            catch (TimeoutException) { continue; }

                            var command = ParseSerialCommand(line);
                            var reply = command == null ? MaintenanceReply.Failure("Commande inconnue.") : Safe(command);
                            port.WriteLine(MaintenanceProtocol.ToJson(reply));
                        }
                    }
                }
                catch (Exception)
                {
                    // Câble débranché ou port occupé : nouvelle tentative plus tard.
                }
                if (!_stopped) Thread.Sleep(SerialRetryMs);
            }
        }

        private static string ParseSerialCommand(string line)
        {
            try
            {
                var request = MaintenanceProtocol.FromJson<MaintenanceRequest>((line ?? string.Empty).Trim());
                return request == null ? null : NormalizeCommand(request.Command);
            }
            catch (Exception)
            {
                return null;
            }
        }
    }
}
