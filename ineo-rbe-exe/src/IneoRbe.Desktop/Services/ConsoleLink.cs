using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Security.Cryptography;
using System.Text;
using System.Threading;

namespace IneoRbe.Desktop.Services
{
    [DataContract]
    public sealed class ConsoleStop
    {
        [DataMember(Name = "city")] public string City { get; set; }
        [DataMember(Name = "label")] public string Label { get; set; }
        [DataMember(Name = "lat")] public double Lat { get; set; }
        [DataMember(Name = "lng")] public double Lng { get; set; }
    }

    // Une course d'un service : ligne, sens et arrêts.
    [DataContract]
    public sealed class ConsoleCourse
    {
        [DataMember(Name = "direction")] public string Direction { get; set; }
        [DataMember(Name = "routeName")] public string RouteName { get; set; }
        [DataMember(Name = "lineName")] public string LineName { get; set; }
        [DataMember(Name = "color")] public string Color { get; set; }
        [DataMember(Name = "scheduledDeparture")] public string ScheduledDeparture { get; set; }
        [DataMember(Name = "stops")] public List<ConsoleStop> Stops { get; set; }
    }

    [DataContract]
    public sealed class ConsoleService
    {
        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "serviceName")] public string ServiceName { get; set; }
        [DataMember(Name = "serviceReference")] public string ServiceReference { get; set; }
        [DataMember(Name = "status")] public string Status { get; set; }
        [DataMember(Name = "driverIdentifier")] public string DriverIdentifier { get; set; }
        [DataMember(Name = "driverName")] public string DriverName { get; set; }
        [DataMember(Name = "courseIndex")] public int CourseIndex { get; set; }
        [DataMember(Name = "stopIndex")] public int StopIndex { get; set; }
        [DataMember(Name = "scheduledDeparture")] public string ScheduledDeparture { get; set; }
        [DataMember(Name = "routes")] public List<ConsoleCourse> Routes { get; set; }
    }

    [DataContract]
    public sealed class ConsoleDriver
    {
        [DataMember(Name = "identifier")] public string Identifier { get; set; }
        [DataMember(Name = "number")] public string Number { get; set; }
        [DataMember(Name = "codeHash")] public string CodeHash { get; set; }
    }

    [DataContract]
    internal sealed class ConsoleRequest
    {
        [DataMember(Name = "token")] public string Token { get; set; }
        [DataMember(Name = "number")] public string Number { get; set; }
        [DataMember(Name = "code")] public string Code { get; set; }
        [DataMember(Name = "missionId")] public string MissionId { get; set; }
        [DataMember(Name = "serviceReference")] public string ServiceReference { get; set; }
        [DataMember(Name = "latitude")] public double Latitude { get; set; }
        [DataMember(Name = "longitude")] public double Longitude { get; set; }
        [DataMember(Name = "speedKmh")] public double? SpeedKmh { get; set; }
        [DataMember(Name = "accuracy")] public double? Accuracy { get; set; }
    }

    [DataContract]
    internal sealed class ConsoleReply
    {
        [DataMember(Name = "ok")] public bool Ok { get; set; }
        [DataMember(Name = "error")] public string Error { get; set; }
        [DataMember(Name = "token")] public string Token { get; set; }
        [DataMember(Name = "driverIdentifier")] public string DriverIdentifier { get; set; }
        [DataMember(Name = "vehicle")] public string Vehicle { get; set; }
        [DataMember(Name = "serial")] public string Serial { get; set; }
        [DataMember(Name = "service")] public ConsoleService Service { get; set; }
        [DataMember(Name = "online")] public bool Online { get; set; }
    }

    [DataContract]
    internal sealed class ConsoleServiceEvent
    {
        [DataMember(Name = "serial")] public string Serial { get; set; }
        [DataMember(Name = "missionId")] public string MissionId { get; set; }
        [DataMember(Name = "event")] public string Event { get; set; }
        [DataMember(Name = "courseIndex")] public int? CourseIndex { get; set; }
        [DataMember(Name = "latitude")] public double? Latitude { get; set; }
        [DataMember(Name = "longitude")] public double? Longitude { get; set; }
        [DataMember(Name = "speedKmh")] public double? SpeedKmh { get; set; }
        [DataMember(Name = "accuracy")] public double? Accuracy { get; set; }
    }

    // API locale de la console conducteur : l'UC détient les services et les conducteurs (reçus du serveur) et sert d'unique
    // interlocuteur à la console. Les événements de service sont remontés au serveur dès que la connexion le permet.
    public sealed class ConsoleLink : IDisposable
    {
        public const int TcpPort = 47801;
        private const int MaxBody = 8192;
        private const int MaxAttempts = 5;
        private static readonly TimeSpan SessionLifetime = TimeSpan.FromHours(14);
        private static readonly TimeSpan LockDuration = TimeSpan.FromSeconds(30);

        private readonly object _lock = new object();
        private readonly Func<string> _serial;
        private readonly Func<string> _vehicle;
        private readonly Dictionary<string, KeyValuePair<string, DateTime>> _sessions = new Dictionary<string, KeyValuePair<string, DateTime>>();
        private readonly Queue<ConsoleServiceEvent> _outbox = new Queue<ConsoleServiceEvent>();
        private List<ConsoleService> _services = new List<ConsoleService>();
        private List<ConsoleDriver> _drivers = new List<ConsoleDriver>();
        private int _failures;
        private DateTime _lockedUntil = DateTime.MinValue;
        private volatile TcpListener _listener;
        private volatile bool _stopped;
        private volatile bool _online = true;

        public event Action<double, double> PositionReceived;

        // Renseigné par la synchronisation avec le serveur : la console affiche la perte de connexion quand l'UC n'a plus Internet.
        public void SetOnline(bool online) { _online = online; }

        public ConsoleLink(Func<string> serial, Func<string> vehicle)
        {
            _serial = serial;
            _vehicle = vehicle;
        }

        public void Start()
        {
            Background(AcceptLoop, "console-http");
            Background(OutboxLoop, "console-outbox");
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

        // Reçoit les services et conducteurs du serveur. Tant que des événements ne sont pas remontés, l'état local fait foi.
        public void Update(UcIdentity identity)
        {
            if (identity == null) return;
            lock (_lock)
            {
                if (identity.Drivers != null) _drivers = identity.Drivers;
                if (identity.Services != null && _outbox.Count == 0) _services = identity.Services;
            }
        }

        private static void Background(ThreadStart work, string name)
        {
            new Thread(work) { IsBackground = true, Name = name }.Start();
        }

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetHandleInformation(IntPtr handle, int mask, int flags);

        private static void NoInherit(Socket socket)
        {
            try { SetHandleInformation(socket.Handle, 1, 0); } catch (Exception) { }
        }

        private bool OpenListener()
        {
            try
            {
                var old = _listener;
                if (old != null) { try { old.Stop(); } catch (Exception) { } }
                var listener = new TcpListener(IPAddress.Any, TcpPort);
                listener.Start();
                NoInherit(listener.Server);
                _listener = listener;
                return true;
            }
            catch (Exception)
            {
                _listener = null;
                return false;
            }
        }

        private void AcceptLoop()
        {
            while (!_stopped)
            {
                var listener = _listener;
                if (listener == null)
                {
                    if (!OpenListener()) Thread.Sleep(2000);
                    continue;
                }
                TcpClient client;
                try { client = listener.AcceptTcpClient(); }
                catch (Exception)
                {
                    if (_stopped) return;
                    Thread.Sleep(500);
                    OpenListener();
                    continue;
                }
                NoInherit(client.Client);
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
                    string path;
                    var body = ReadRequest(stream, out path);
                    ConsoleReply reply;
                    int status = 200;
                    if (path == null) { status = 400; reply = Fail("Requête invalide."); }
                    else
                    {
                        try { reply = Handle(path, Parse(body)); }
                        catch (Exception exception) { status = 500; reply = Fail(exception.Message); }
                    }
                    reply.Online = _online;
                    if (!reply.Ok && status == 200) status = 409;

                    byte[] json;
                    using (var buffer = new MemoryStream())
                    {
                        new DataContractJsonSerializer(typeof(ConsoleReply)).WriteObject(buffer, reply);
                        json = buffer.ToArray();
                    }
                    var head = Encoding.ASCII.GetBytes(
                        "HTTP/1.1 " + status + " " + (status == 200 ? "OK" : "Error") + "\r\n" +
                        "Content-Type: application/json; charset=utf-8\r\n" +
                        "Content-Length: " + json.Length + "\r\n" +
                        "Cache-Control: no-store\r\n" +
                        "Connection: close\r\n\r\n");
                    stream.Write(head, 0, head.Length);
                    stream.Write(json, 0, json.Length);
                }
                catch (Exception)
                {
                }
            }
        }

        private static byte[] ReadRequest(Stream stream, out string path)
        {
            path = null;
            var buffer = new byte[MaxBody + 4096];
            var length = 0;
            var headEnd = -1;
            while (length < buffer.Length)
            {
                var read = stream.Read(buffer, length, buffer.Length - length);
                if (read <= 0) break;
                length += read;
                headEnd = IndexOfHeadEnd(buffer, length);
                if (headEnd >= 0) break;
            }
            if (headEnd < 0) return null;

            var head = Encoding.ASCII.GetString(buffer, 0, headEnd);
            var lines = head.Split(new[] { "\r\n" }, StringSplitOptions.None);
            var parts = lines[0].Split(' ');
            if (parts.Length < 2) return null;
            path = parts[1].Split('?')[0];

            var contentLength = 0;
            foreach (var line in lines.Skip(1))
            {
                if (line.StartsWith("content-length:", StringComparison.OrdinalIgnoreCase)) int.TryParse(line.Substring(15).Trim(), out contentLength);
            }
            if (contentLength < 0 || contentLength > MaxBody) { path = null; return null; }

            var bodyStart = headEnd + 4;
            var body = new byte[contentLength];
            var have = Math.Min(contentLength, length - bodyStart);
            if (have > 0) Array.Copy(buffer, bodyStart, body, 0, have);
            while (have < contentLength)
            {
                var read = stream.Read(body, have, contentLength - have);
                if (read <= 0) break;
                have += read;
            }
            return body;
        }

        private static int IndexOfHeadEnd(byte[] buffer, int length)
        {
            for (var i = 0; i + 3 < length; i++)
            {
                if (buffer[i] == 13 && buffer[i + 1] == 10 && buffer[i + 2] == 13 && buffer[i + 3] == 10) return i;
            }
            return -1;
        }

        private static ConsoleRequest Parse(byte[] body)
        {
            if (body == null || body.Length == 0) return new ConsoleRequest();
            try
            {
                using (var stream = new MemoryStream(body))
                {
                    return (ConsoleRequest)new DataContractJsonSerializer(typeof(ConsoleRequest)).ReadObject(stream) ?? new ConsoleRequest();
                }
            }
            catch (Exception)
            {
                return new ConsoleRequest();
            }
        }

        private static ConsoleReply Fail(string message)
        {
            return new ConsoleReply { Ok = false, Error = message };
        }

        private ConsoleReply Handle(string path, ConsoleRequest request)
        {
            switch (path)
            {
                case "/console/ping": return new ConsoleReply { Ok = true, Vehicle = _vehicle(), Serial = _serial() };
                case "/console/login": return Login(request);
                case "/console/logout": lock (_lock) _sessions.Remove(request.Token ?? string.Empty); return new ConsoleReply { Ok = true };
            }

            string driver;
            lock (_lock) driver = DriverOf(request.Token);
            if (driver == null) return Fail("Session expirée : reconnectez-vous.");

            switch (path)
            {
                case "/console/current": return Current(driver);
                case "/console/start": return Start(driver, request);
                case "/console/next": return Next(driver, request);
                case "/console/complete": return Complete(driver, request);
                case "/console/abort": return Abort(driver, request);
                case "/console/position": return Position(driver, request);
                default: return Fail("Commande inconnue.");
            }
        }

        private string DriverOf(string token)
        {
            KeyValuePair<string, DateTime> session;
            if (string.IsNullOrEmpty(token) || !_sessions.TryGetValue(token, out session)) return null;
            if (DateTime.UtcNow - session.Value > SessionLifetime) { _sessions.Remove(token); return null; }
            return session.Key;
        }

        private ConsoleReply Login(ConsoleRequest request)
        {
            lock (_lock)
            {
                if (DateTime.UtcNow < _lockedUntil) return Fail("Trop d'essais : patientez quelques secondes.");
                var number = (request.Number ?? string.Empty).Trim();
                var code = (request.Code ?? string.Empty).Trim();
                var driver = _drivers.FirstOrDefault(item => item.Number == number);
                if (driver == null || !VerifyCode(code, driver.CodeHash))
                {
                    if (++_failures >= MaxAttempts) { _failures = 0; _lockedUntil = DateTime.UtcNow + LockDuration; }
                    return Fail("Matricule ou code incorrect.");
                }
                _failures = 0;
                var token = Guid.NewGuid().ToString("N");
                _sessions[token] = new KeyValuePair<string, DateTime>(driver.Identifier, DateTime.UtcNow);
                return new ConsoleReply { Ok = true, Token = token, DriverIdentifier = driver.Identifier, Vehicle = _vehicle(), Service = FindService(driver.Identifier) };
            }
        }

        // Format du serveur : « sel$hex » = PBKDF2-HMAC-SHA1, 10 000 itérations, 20 octets, sel pris comme texte UTF-8.
        private static bool VerifyCode(string code, string stored)
        {
            if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(stored)) return false;
            var parts = stored.Split('$');
            if (parts.Length != 2) return false;
            using (var kdf = new Rfc2898DeriveBytes(code, Encoding.UTF8.GetBytes(parts[0]), 10000))
            {
                var hex = string.Concat(kdf.GetBytes(20).Select(b => b.ToString("x2")).ToArray());
                var diff = hex.Length ^ parts[1].Length;
                for (var i = 0; i < hex.Length && i < parts[1].Length; i++) diff |= hex[i] ^ parts[1][i];
                return diff == 0;
            }
        }

        private ConsoleService FindService(string identifier)
        {
            var mine = _services.Where(s => string.Equals(s.DriverIdentifier, identifier, StringComparison.OrdinalIgnoreCase)).ToList();
            return mine.FirstOrDefault(s => s.Status == "ACTIVE") ?? mine.FirstOrDefault(s => s.Status == "PLANNED");
        }

        private ConsoleService FindMine(string identifier, string missionId)
        {
            return _services.FirstOrDefault(s => s.Id == missionId && string.Equals(s.DriverIdentifier, identifier, StringComparison.OrdinalIgnoreCase));
        }

        private ConsoleReply Current(string driver)
        {
            lock (_lock) return new ConsoleReply { Ok = true, DriverIdentifier = driver, Vehicle = _vehicle(), Service = FindService(driver) };
        }

        private void Queue(ConsoleServiceEvent item)
        {
            item.Serial = _serial();
            _outbox.Enqueue(item);
        }

        private ConsoleReply Start(string driver, ConsoleRequest request)
        {
            lock (_lock)
            {
                var service = FindMine(driver, request.MissionId);
                if (service == null) return Fail("Service introuvable.");
                if (service.Status != "PLANNED") return Fail("Ce service ne peut pas être démarré.");
                var expected = (service.ServiceReference ?? string.Empty).Trim();
                if (expected.Length > 0 && !string.Equals(expected, (request.ServiceReference ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
                    return Fail("Le numéro de service saisi ne correspond pas à votre affectation.");
                service.Status = "ACTIVE";
                service.CourseIndex = 0;
                Queue(new ConsoleServiceEvent { MissionId = service.Id, Event = "start" });
                return new ConsoleReply { Ok = true, Service = service };
            }
        }

        private ConsoleReply Next(string driver, ConsoleRequest request)
        {
            lock (_lock)
            {
                var service = FindMine(driver, request.MissionId);
                if (service == null || service.Status != "ACTIVE") return Fail("Le service doit être en cours.");
                var total = service.Routes == null ? 0 : service.Routes.Count;
                if (service.CourseIndex + 1 >= total) return Fail("Dernière course du service : terminez le service.");
                service.CourseIndex++;
                service.StopIndex = 0;
                Queue(new ConsoleServiceEvent { MissionId = service.Id, Event = "next", CourseIndex = service.CourseIndex });
                return new ConsoleReply { Ok = true, Service = service };
            }
        }

        private ConsoleReply Complete(string driver, ConsoleRequest request)
        {
            lock (_lock)
            {
                var service = FindMine(driver, request.MissionId);
                if (service == null || service.Status != "ACTIVE") return Fail("Ce service n'est pas en cours.");
                service.Status = "COMPLETED";
                Queue(new ConsoleServiceEvent { MissionId = service.Id, Event = "complete" });
                return new ConsoleReply { Ok = true };
            }
        }

        private ConsoleReply Abort(string driver, ConsoleRequest request)
        {
            lock (_lock)
            {
                var service = FindMine(driver, request.MissionId);
                if (service == null || service.Status != "ACTIVE") return Fail("Ce service n'est pas en cours.");
                service.Status = "CANCELLED";
                Queue(new ConsoleServiceEvent { MissionId = service.Id, Event = "abort" });
                return new ConsoleReply { Ok = true };
            }
        }

        private ConsoleReply Position(string driver, ConsoleRequest request)
        {
            ConsoleService service;
            lock (_lock) service = FindMine(driver, request.MissionId);
            if (service == null || service.Status != "ACTIVE") return Fail("Service non actif.");
            var item = new ConsoleServiceEvent
            {
                Serial = _serial(), MissionId = service.Id, Event = "position",
                Latitude = request.Latitude, Longitude = request.Longitude, SpeedKmh = request.SpeedKmh, Accuracy = request.Accuracy,
            };
            // La console est la source GPS de l'UC : la position alimente aussi les annonces sonores.
            var received = PositionReceived;
            if (received != null && (request.Latitude != 0 || request.Longitude != 0)) received(request.Latitude, request.Longitude);
            // Les positions ne sont pas mises en file : une position perdue n'a plus d'intérêt.
            ThreadPool.QueueUserWorkItem(delegate { try { Post(item); } catch (Exception) { } });
            return new ConsoleReply { Ok = true };
        }

        private static void Post(ConsoleServiceEvent item)
        {
            byte[] json;
            using (var buffer = new MemoryStream())
            {
                new DataContractJsonSerializer(typeof(ConsoleServiceEvent)).WriteObject(buffer, item);
                json = buffer.ToArray();
            }
            var response = HttpTransport.Send("POST", ApiEndpoints.ServiceEventUrl, "application/json", json, 15000);
            // Un refus définitif (409 = état déjà à jour, 403/404 = service retiré) ne doit pas bloquer la file.
            if (!response.IsSuccess && response.StatusCode >= 500) throw new InvalidOperationException("Serveur indisponible.");
        }

        private void OutboxLoop()
        {
            while (!_stopped)
            {
                Thread.Sleep(5000);
                while (!_stopped)
                {
                    ConsoleServiceEvent next;
                    lock (_lock) next = _outbox.Count == 0 ? null : _outbox.Peek();
                    if (next == null) break;
                    try { Post(next); }
                    catch (Exception) { break; }
                    lock (_lock) { if (_outbox.Count > 0) _outbox.Dequeue(); }
                }
            }
        }
    }
}
