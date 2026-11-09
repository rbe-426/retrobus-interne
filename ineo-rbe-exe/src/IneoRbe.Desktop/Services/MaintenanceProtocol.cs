using System;
using System.IO;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;

namespace IneoRbe.Desktop.Services
{
    // Protocole de maintenance partagé par l'UC et l'outil Maintenance.
    // Même échange en Wi-Fi (HTTP : GET /maintenance/<commande>) et en USB-USB (une ligne JSON {"cmd":"<commande>"} -> une ligne JSON).
    public static class MaintenanceProtocol
    {
        public const int TcpPort = 47800;
        public const int DefaultBaud = 115200;
        public const string Ping = "ping";
        public const string Info = "info";
        public const string Mirror = "mirror";
        public const string Content = "content";
        // Ordre de mise à jour à distance : l'UC recherche, télécharge (empreinte vérifiée) et installe lui-même la version officielle.
        public const string Update = "update";
        // Ordre de redémarrage du logiciel UC (sans redémarrer le PC ni le bus).
        public const string Restart = "restart";

        // Niveau d'un voyant : vert, rouge, orange (mise à jour disponible non installée), gris (inconnu).
        public const string Ok = "OK";
        public const string Ko = "KO";
        public const string Warn = "WARN";
        public const string Unknown = "UNKNOWN";

        public static string ToJson<T>(T value)
        {
            using (var stream = new MemoryStream())
            {
                new DataContractJsonSerializer(typeof(T)).WriteObject(stream, value);
                return Encoding.UTF8.GetString(stream.ToArray());
            }
        }

        public static T FromJson<T>(string json) where T : class
        {
            using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(json)))
            {
                return (T)new DataContractJsonSerializer(typeof(T)).ReadObject(stream);
            }
        }
    }

    [DataContract]
    public sealed class MaintenanceStatusItem
    {
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "level")] public string Level { get; set; }
        [DataMember(Name = "detail")] public string Detail { get; set; }
    }

    [DataContract]
    public sealed class MaintenanceRequest
    {
        [DataMember(Name = "cmd")] public string Command { get; set; }
    }

    [DataContract]
    public sealed class MaintenanceReply
    {
        [DataMember(Name = "ok")] public bool Ok { get; set; }
        [DataMember(Name = "error")] public string Error { get; set; }
        [DataMember(Name = "message")] public string Message { get; set; }
        [DataMember(Name = "serial")] public string Serial { get; set; }
        [DataMember(Name = "version")] public string Version { get; set; }
        [DataMember(Name = "hostname")] public string Hostname { get; set; }
        [DataMember(Name = "deviceTime")] public string DeviceTime { get; set; }
        [DataMember(Name = "timeZone")] public string TimeZone { get; set; }
        [DataMember(Name = "hasPosition")] public bool HasPosition { get; set; }
        [DataMember(Name = "latitude")] public double Latitude { get; set; }
        [DataMember(Name = "longitude")] public double Longitude { get; set; }
        [DataMember(Name = "positionAge")] public int PositionAgeSeconds { get; set; }
        [DataMember(Name = "profile")] public string Profile { get; set; }
        [DataMember(Name = "screensRevision")] public string ScreensRevision { get; set; }
        // Révision du contenu embarqué : numéro à venir, vide tant qu'il n'existe pas.
        [DataMember(Name = "contentRevision")] public string ContentRevision { get; set; }
        [DataMember(Name = "updateVersion")] public string UpdateVersion { get; set; }
        [DataMember(Name = "statuses")] public MaintenanceStatusItem[] Statuses { get; set; }
        [DataMember(Name = "png")] public string PngBase64 { get; set; }

        public static MaintenanceReply Failure(string message)
        {
            return new MaintenanceReply { Ok = false, Error = message };
        }
    }
}
