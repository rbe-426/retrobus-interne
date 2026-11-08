using System.Collections.Generic;
using System.Runtime.Serialization;

namespace IneoRbe.Desktop.Services
{
    public static class AnnouncementTrigger
    {
        public const string Gps = "GPS";
        public const string PreAnnouncement = "PRE";
    }

    [DataContract]
    public sealed class Announcement
    {
        public Announcement() { SetDefaults(); }

        [OnDeserializing]
        private void OnDeserializing(StreamingContext context) { SetDefaults(); }

        private void SetDefaults()
        {
            Id = System.Guid.NewGuid().ToString("N");
            Name = string.Empty;
            Trigger = AnnouncementTrigger.PreAnnouncement;
            DistanceMeters = 100;
            Enabled = true;
        }

        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "trigger")] public string Trigger { get; set; }
        [DataMember(Name = "latitude")] public double Latitude { get; set; }
        [DataMember(Name = "longitude")] public double Longitude { get; set; }
        [DataMember(Name = "distanceMeters")] public int DistanceMeters { get; set; }
        [DataMember(Name = "soundFile")] public string SoundFile { get; set; }
        [DataMember(Name = "soundName")] public string SoundName { get; set; }
        [DataMember(Name = "enabled")] public bool Enabled { get; set; }

        public string DisplayText
        {
            get
            {
                var kind = Trigger == AnnouncementTrigger.Gps ? "GPS" : "pré-annonce";
                return (Enabled ? string.Empty : "(désactivée) ") + Name + " [" + kind + "]";
            }
        }
    }

    [DataContract]
    public sealed class ScreenConfig
    {
        public ScreenConfig() { SetDefaults(); }

        [OnDeserializing]
        private void OnDeserializing(StreamingContext context) { SetDefaults(); }

        private void SetDefaults()
        {
            Id = System.Guid.NewGuid().ToString("N");
            Name = string.Empty;
        }

        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "offlineImage")] public string OfflineImage { get; set; }
        [DataMember(Name = "offlineName")] public string OfflineName { get; set; }
        [DataMember(Name = "onlineImage")] public string OnlineImage { get; set; }
        [DataMember(Name = "onlineName")] public string OnlineName { get; set; }

        public string DisplayText { get { return Name; } }
    }

    [DataContract]
    public sealed class SaeivConfig
    {
        public SaeivConfig() { SetDefaults(); }

        [OnDeserializing]
        private void OnDeserializing(StreamingContext context) { SetDefaults(); }

        private void SetDefaults()
        {
            Announcements = new List<Announcement>();
            Screens = new List<ScreenConfig>();
            EngineEnabled = true;
            GpsSource = "AUTO";
            GpsPort = "AUTO";
            GpsBaud = 9600;
            MaintenancePort = "NONE";
        }

        [OnDeserialized]
        private void OnDeserialized(StreamingContext context)
        {
            if (Announcements == null) Announcements = new List<Announcement>();
            if (Screens == null) Screens = new List<ScreenConfig>();
        }

        [DataMember(Name = "engineEnabled")] public bool EngineEnabled { get; set; }
        [DataMember(Name = "gpsSource")] public string GpsSource { get; set; }
        [DataMember(Name = "gpsPort")] public string GpsPort { get; set; }
        [DataMember(Name = "gpsBaud")] public int GpsBaud { get; set; }
        // Port série du câble USB-USB de maintenance (NONE = liaison USB désactivée).
        [DataMember(Name = "maintenancePort")] public string MaintenancePort { get; set; }
        [DataMember(Name = "announcements")] public List<Announcement> Announcements { get; set; }
        [DataMember(Name = "screens")] public List<ScreenConfig> Screens { get; set; }
    }
}
