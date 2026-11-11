using System.Collections.Generic;
using System.Runtime.Serialization;

namespace IneoRbe.Desktop.Services
{
    public static class AnnouncementTrigger
    {
        public const string Gps = "GPS";
        public const string PreAnnouncement = "PRE";
        // À l'allumage du véhicule (lancement du logiciel).
        public const string Startup = "START";
    }

    // Ligne publiée depuis le configurateur : destinations, couleur et itinéraires (arrêts + tracé [lat, lng]).
    [DataContract]
    public sealed class LineStop
    {
        [DataMember(Name = "city")] public string City { get; set; }
        [DataMember(Name = "label")] public string Label { get; set; }
        [DataMember(Name = "lat")] public double Lat { get; set; }
        [DataMember(Name = "lng")] public double Lng { get; set; }
    }

    [DataContract]
    public sealed class LineConfig
    {
        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "color")] public string Color { get; set; }
        [DataMember(Name = "destination1")] public string Destination1 { get; set; }
        [DataMember(Name = "destination2")] public string Destination2 { get; set; }
        [DataMember(Name = "outboundStops")] public List<LineStop> OutboundStops { get; set; }
        [DataMember(Name = "outboundPath")] public List<List<double>> OutboundPath { get; set; }
        [DataMember(Name = "returnStops")] public List<LineStop> ReturnStops { get; set; }
        [DataMember(Name = "returnPath")] public List<List<double>> ReturnPath { get; set; }
    }

    // Normes SAEIV : annonces vocales (TTS embarqué) et écrans TFT (gabarit, diapositives, affichages fixes).
    // Variables de texte : {ligne} {destination} {arret} {correspondances}.
    [DataContract]
    public sealed class TtsTexts
    {
        public TtsTexts() { SetDefaults(); }

        [OnDeserializing]
        private void OnDeserializing(StreamingContext context) { SetDefaults(); }

        private void SetDefaults()
        {
            Line = "Ligne {ligne}, direction {destination}.";
            NextStop = "Prochain arrêt : {arret}.";
            Correspondence = "Correspondance : {correspondances}.";
            Terminus = "Terminus. Merci de descendre du véhicule.";
        }

        [DataMember(Name = "line")] public string Line { get; set; }
        [DataMember(Name = "nextStop")] public string NextStop { get; set; }
        [DataMember(Name = "correspondence")] public string Correspondence { get; set; }
        [DataMember(Name = "terminus")] public string Terminus { get; set; }
    }

    [DataContract]
    public sealed class TtsNorm
    {
        public TtsNorm() { SetDefaults(); }

        [OnDeserializing]
        private void OnDeserializing(StreamingContext context) { SetDefaults(); }

        [OnDeserialized]
        private void OnDeserialized(StreamingContext context) { if (Texts == null) Texts = new TtsTexts(); }

        private void SetDefaults()
        {
            Enabled = true;
            Engine = "SAPI4";
            Voice = string.Empty;
            Rate = 100;
            Volume = 100;
            PreAnnounceMeters = 150;
            Texts = new TtsTexts();
        }

        [DataMember(Name = "enabled")] public bool Enabled { get; set; }
        // SAPI4 (voix du panneau de configuration « Parole » de l'UC) ou SAPI5.
        [DataMember(Name = "engine")] public string Engine { get; set; }
        [DataMember(Name = "voice")] public string Voice { get; set; }
        // Vitesse et volume en % (100 = normal).
        [DataMember(Name = "rate")] public int Rate { get; set; }
        [DataMember(Name = "volume")] public int Volume { get; set; }
        [DataMember(Name = "preAnnounceMeters")] public int PreAnnounceMeters { get; set; }
        [DataMember(Name = "texts")] public TtsTexts Texts { get; set; }
    }

    public static class SlideType
    {
        public const string NextStop = "NEXT_STOP";
        public const string Correspondences = "CORRESPONDENCES";
        public const string Destination = "DESTINATION";
        public const string Clock = "CLOCK";
        public const string Message = "MESSAGE";
    }

    [DataContract]
    public sealed class SlideNorm
    {
        public SlideNorm() { Type = SlideType.NextStop; Seconds = 6; Text = string.Empty; }

        [DataMember(Name = "type")] public string Type { get; set; }
        [DataMember(Name = "seconds")] public int Seconds { get; set; }
        [DataMember(Name = "text")] public string Text { get; set; }
    }

    [DataContract]
    public sealed class ScreenNorm
    {
        public ScreenNorm() { SetDefaults(); }

        [OnDeserializing]
        private void OnDeserializing(StreamingContext context) { SetDefaults(); }

        [OnDeserialized]
        private void OnDeserialized(StreamingContext context) { if (Slides == null) Slides = new List<SlideNorm>(); }

        private void SetDefaults()
        {
            BaseColor = "#0F172A";
            TextColor = "#FFFFFF";
            BandColor = "#9F063A";
            LineColorBand = true;
            AdaptiveText = true;
            GapSeconds = 1;
            ShowLine = true;
            ShowDestination = true;
            ShowClock = true;
            ShowNextStop = false;
            FixedPosition = "TOP";
            Slides = new List<SlideNorm>
            {
                new SlideNorm { Type = SlideType.NextStop, Seconds = 6 },
                new SlideNorm { Type = SlideType.Correspondences, Seconds = 4 },
            };
        }

        [DataMember(Name = "baseColor")] public string BaseColor { get; set; }
        [DataMember(Name = "textColor")] public string TextColor { get; set; }
        [DataMember(Name = "bandColor")] public string BandColor { get; set; }
        [DataMember(Name = "baseImage")] public string BaseImage { get; set; }
        [DataMember(Name = "baseName")] public string BaseName { get; set; }
        // Bandeau fixe aux couleurs de la ligne en cours, et texte noir ou blanc selon le fond.
        [DataMember(Name = "lineColorBand")] public bool LineColorBand { get; set; }
        [DataMember(Name = "adaptiveText")] public bool AdaptiveText { get; set; }
        [DataMember(Name = "gapSeconds")] public int GapSeconds { get; set; }
        [DataMember(Name = "showLine")] public bool ShowLine { get; set; }
        [DataMember(Name = "showDestination")] public bool ShowDestination { get; set; }
        [DataMember(Name = "showClock")] public bool ShowClock { get; set; }
        [DataMember(Name = "showNextStop")] public bool ShowNextStop { get; set; }
        [DataMember(Name = "fixedPosition")] public string FixedPosition { get; set; }
        [DataMember(Name = "slides")] public List<SlideNorm> Slides { get; set; }
    }

    [DataContract]
    public sealed class SaeivNorms
    {
        public SaeivNorms() { Tts = new TtsNorm(); Screens = new ScreenNorm(); }

        [OnDeserializing]
        private void OnDeserializing(StreamingContext context) { Tts = new TtsNorm(); Screens = new ScreenNorm(); }

        [OnDeserialized]
        private void OnDeserialized(StreamingContext context)
        {
            if (Tts == null) Tts = new TtsNorm();
            if (Screens == null) Screens = new ScreenNorm();
        }

        [DataMember(Name = "tts")] public TtsNorm Tts { get; set; }
        [DataMember(Name = "screens")] public ScreenNorm Screens { get; set; }
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
        // Texte lu par la voix embarquée quand l'annonce n'a pas de fichier son.
        [DataMember(Name = "text")] public string Text { get; set; }
        [DataMember(Name = "enabled")] public bool Enabled { get; set; }

        public string DisplayText
        {
            get
            {
                var kind = Trigger == AnnouncementTrigger.Gps ? "GPS" : Trigger == AnnouncementTrigger.Startup ? "allumage" : "pré-annonce";
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
            Place = "CUSTOM";
            X = 40; Y = 60; WidthPct = 16; WidthPx = 1280; HeightPx = 720;
        }

        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        // Emplacement dans le véhicule, position (en % du plan), largeur d'affichage (en % du plan) et résolution de l'écran.
        [DataMember(Name = "place")] public string Place { get; set; }
        [DataMember(Name = "x")] public double X { get; set; }
        [DataMember(Name = "y")] public double Y { get; set; }
        [DataMember(Name = "widthPct")] public double WidthPct { get; set; }
        [DataMember(Name = "widthPx")] public int WidthPx { get; set; }
        [DataMember(Name = "heightPx")] public int HeightPx { get; set; }
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
            Norms = new SaeivNorms();
        }

        [OnDeserialized]
        private void OnDeserialized(StreamingContext context)
        {
            if (Announcements == null) Announcements = new List<Announcement>();
            if (Screens == null) Screens = new List<ScreenConfig>();
            if (Lines == null) Lines = new List<LineConfig>();
            if (Norms == null) Norms = new SaeivNorms();
        }

        // Norme effective sur l'UC ; dans le Gestionnaire : norme propre au véhicule, utilisée si NormsOverride.
        [DataMember(Name = "norms")] public SaeivNorms Norms { get; set; }
        [DataMember(Name = "normsOverride")] public bool NormsOverride { get; set; }

        [DataMember(Name = "engineEnabled")] public bool EngineEnabled { get; set; }
        [DataMember(Name = "gpsSource")] public string GpsSource { get; set; }
        [DataMember(Name = "gpsPort")] public string GpsPort { get; set; }
        [DataMember(Name = "gpsBaud")] public int GpsBaud { get; set; }
        // Port série du câble USB-USB de maintenance (NONE = liaison USB désactivée).
        [DataMember(Name = "maintenancePort")] public string MaintenancePort { get; set; }
        [DataMember(Name = "announcements")] public List<Announcement> Announcements { get; set; }
        [DataMember(Name = "screens")] public List<ScreenConfig> Screens { get; set; }
        [DataMember(Name = "lines")] public List<LineConfig> Lines { get; set; }
    }
}
