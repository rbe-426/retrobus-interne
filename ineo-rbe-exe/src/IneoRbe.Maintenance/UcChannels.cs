using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Ports;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Maintenance
{
    // Liaison avec un UC : Wi-Fi / réseau (HTTP) ou câble USB-USB (ligne série). Un seul échange à la fois.
    public abstract class UcChannel : IDisposable
    {
        private readonly object _lock = new object();

        public abstract string Description { get; }

        public MaintenanceReply Request(string command)
        {
            lock (_lock) return Exchange(command);
        }

        protected abstract MaintenanceReply Exchange(string command);
        public virtual void Dispose() { }
    }

    public sealed class HttpUcChannel : UcChannel
    {
        private readonly string _host;

        public HttpUcChannel(string host) { _host = host; }

        public override string Description { get { return "Wi-Fi / réseau " + _host; } }

        protected override MaintenanceReply Exchange(string command)
        {
            var request = (HttpWebRequest)WebRequest.Create("http://" + _host + ":" + MaintenanceProtocol.TcpPort + "/maintenance/" + command);
            request.Timeout = command == MaintenanceProtocol.Update ? 40000 : 8000;
            request.ReadWriteTimeout = 15000;
            request.Proxy = null;
            using (var response = (HttpWebResponse)request.GetResponse())
            using (var reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
            {
                return MaintenanceProtocol.FromJson<MaintenanceReply>(reader.ReadToEnd());
            }
        }
    }

    public sealed class SerialUcChannel : UcChannel
    {
        private readonly SerialPort _port;
        private readonly string _name;

        public SerialUcChannel(string portName)
        {
            _name = portName;
            _port = new SerialPort(portName, MaintenanceProtocol.DefaultBaud, Parity.None, 8, StopBits.One)
            {
                ReadTimeout = 20000,
                WriteTimeout = 5000,
                NewLine = "\n",
            };
            _port.Open();
        }

        public override string Description { get { return "USB-USB " + _name; } }

        protected override MaintenanceReply Exchange(string command)
        {
            _port.DiscardInBuffer();
            _port.ReadTimeout = command == MaintenanceProtocol.Update ? 45000 : 20000;
            _port.WriteLine(MaintenanceProtocol.ToJson(new MaintenanceRequest { Command = command }));
            return MaintenanceProtocol.FromJson<MaintenanceReply>(_port.ReadLine().Trim());
        }

        public override void Dispose()
        {
            try { _port.Close(); } catch (Exception) { }
            _port.Dispose();
        }
    }

    public sealed class DetectedUc
    {
        public string Address { get; set; }
        public string Serial { get; set; }
        public string Version { get; set; }
        public string Hostname { get; set; }
    }

    // Détection Wi-Fi : recherche, sur les réseaux locaux du PC, les UC qui répondent sur le port de maintenance.
    public static class UcScanner
    {
        private const int ConnectTimeoutMs = 500;
        private const int MaxHostsPerNetwork = 1022;

        public static List<DetectedUc> Scan(Action<int> progressPercent)
        {
            var targets = CandidateAddresses();
            var found = new List<DetectedUc>();
            var done = 0;
            var gate = new object();

            using (var finished = new CountdownEvent(Math.Max(1, targets.Count)))
            {
                if (targets.Count == 0) finished.Signal();
                var slots = new Semaphore(48, 48);
                foreach (var address in targets)
                {
                    slots.WaitOne();
                    var target = address;
                    ThreadPool.QueueUserWorkItem(delegate
                    {
                        try
                        {
                            var uc = Probe(target);
                            if (uc != null) lock (gate) found.Add(uc);
                        }
                        finally
                        {
                            slots.Release();
                            var percent = (int)(Interlocked.Increment(ref done) * 100L / targets.Count);
                            if (progressPercent != null) progressPercent(percent);
                            finished.Signal();
                        }
                    });
                }
                finished.Wait();
            }
            found.Sort((left, right) => string.Compare(left.Address, right.Address, StringComparison.Ordinal));
            return found;
        }

        // Teste directement une adresse saisie à la main (réseau non scannable, UC derrière un routeur…).
        public static DetectedUc Probe(string host)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var connect = client.BeginConnect(host, MaintenanceProtocol.TcpPort, null, null);
                    if (!connect.AsyncWaitHandle.WaitOne(ConnectTimeoutMs)) return null;
                    client.EndConnect(connect);
                }
                using (var channel = new HttpUcChannel(host))
                {
                    var reply = channel.Request(MaintenanceProtocol.Info);
                    if (reply == null || !reply.Ok) return null;
                    return new DetectedUc { Address = host, Serial = reply.Serial, Version = reply.Version, Hostname = reply.Hostname };
                }
            }
            catch (Exception)
            {
                return null;
            }
        }

        private static List<string> CandidateAddresses()
        {
            var result = new List<string>();
            var own = new HashSet<string>();
            foreach (var adapter in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (adapter.OperationalStatus != OperationalStatus.Up || adapter.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
                foreach (var unicast in adapter.GetIPProperties().UnicastAddresses)
                {
                    if (unicast.Address.AddressFamily != AddressFamily.InterNetwork || unicast.IPv4Mask == null) continue;
                    own.Add(unicast.Address.ToString());
                    var address = ToUInt(unicast.Address);
                    var mask = ToUInt(unicast.IPv4Mask);
                    var network = address & mask;
                    var broadcast = network | ~mask;
                    var hostCount = (long)broadcast - network - 1;
                    if (hostCount < 1) continue;
                    // Réseau plus grand que /22 : on ne balaie que les 1022 voisins de l'adresse du PC.
                    var first = hostCount > MaxHostsPerNetwork ? Math.Max(network + 1L, address - MaxHostsPerNetwork / 2) : network + 1L;
                    var last = hostCount > MaxHostsPerNetwork ? Math.Min(broadcast - 1L, first + MaxHostsPerNetwork - 1) : broadcast - 1L;
                    for (var value = first; value <= last; value++) result.Add(ToAddress((uint)value));
                }
            }
            result.RemoveAll(own.Contains);
            var unique = new HashSet<string>(result);
            return new List<string>(unique);
        }

        private static uint ToUInt(IPAddress address)
        {
            var bytes = address.GetAddressBytes();
            return ((uint)bytes[0] << 24) | ((uint)bytes[1] << 16) | ((uint)bytes[2] << 8) | bytes[3];
        }

        private static string ToAddress(uint value)
        {
            return string.Format("{0}.{1}.{2}.{3}", value >> 24, (value >> 16) & 255, (value >> 8) & 255, value & 255);
        }
    }
}
