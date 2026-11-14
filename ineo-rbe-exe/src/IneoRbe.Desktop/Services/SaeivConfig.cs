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
        public const string Cover = "COVER";
        public const string NextStop = "NEXT_STOP";
        public const string NextStops = "NEXT_STOPS";
        public const string MainStops = "MAIN_STOPS";
        public const string Correspondences = "CORRESPONDENCES";
        public const string Destination = "DESTINATION";
        public const string Clock = "CLOCK";
        public const string Message = "MESSAGE";
    }

    // Une diapositive = une action d'affichage (page de garde, prochains arrêts, délai d'arrivée…) avec son propre gabarit et sa propre disposition.
    [DataContract]
    public sealed class SlideNorm
    {
        public SlideNorm() { Type = SlideType.NextStop; Seconds = 6; Text = string.Empty; Name = string.Empty; BaseColor = string.Empty; Elements = ScreenNorm.DefaultElements(Type); }

        [OnDeserializing]
        private void OnDeserializing(StreamingContext context) { Name = string.Empty; BaseColor = string.Empty; Text = string.Empty; Seconds = 6; Type = SlideType.NextStop; }

        [OnDeserialized]
        private void OnDeserialized(StreamingContext context)
        {
            if (Name == null) Name = string.Empty;
            if (Text == null) Text = string.Empty;
            if (BaseColor == null) BaseColor = string.Empty;
            if (Elements == null) Elements = ScreenNorm.DefaultElements(Type);
        }

        [DataMember(Name = "type")] public string Type { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "seconds")] public int Seconds { get; set; }
        [DataMember(Name = "text")] public string Text { get; set; }
        // Gabarit (image de fond) propre à la diapositive ; vide : gabarit par défaut de la norme.
        [DataMember(Name = "baseImage")] public string BaseImage { get; set; }
        [DataMember(Name = "baseName")] public string BaseName { get; set; }
        // Couleur de fond propre à la diapositive ; vide : couleur de la norme.
        [DataMember(Name = "baseColor")] public string BaseColor { get; set; }
        // Vrai dès que la disposition a été enregistrée depuis l'éditeur (elle n'est alors plus remplacée en changeant de type).
        [DataMember(Name = "customized")] public bool Customized { get; set; }
        [DataMember(Name = "elements")] public List<ScreenElement> Elements { get; set; }
    }

    // Éléments positionnables d'un écran TFT, dans un repère virtuel (Width x Height de la norme, 800 x 480 par défaut).
    // Les couleurs valent « LINE » pour reprendre la couleur de la ligne en cours.
    public static class ElementKind
    {
        public const string Band = "BAND";
        public const string Line = "LINE";
        public const string Destination = "DESTINATION";
        // Ville du terminus (l'arrêt de destination est DESTINATION).
        public const string DestinationCity = "DESTINATION_CITY";
        public const string Clock = "CLOCK";
        public const string Date = "DATE";
        public const string NextStop = "NEXT_STOP";
        public const string Stops = "STOPS";
        public const string Delay = "DELAY";
        public const string Slide = "SLIDE";
        public const string Text = "TEXT";
        public const string ShapeLine = "SHAPE_LINE";
        public const string ShapeArrow = "SHAPE_ARROW";
        public const string ShapeRect = "SHAPE_RECT";

        public const string ShapeEllipse = "SHAPE_ELLIPSE";

        public static bool IsShape(string kind) { return kind == ShapeLine || kind == ShapeArrow || kind == ShapeRect || kind == ShapeEllipse; }
        // Rectangle et ellipse : remplissage, contour et dégradé.
        public static bool IsArea(string kind) { return kind == ShapeRect || kind == ShapeEllipse; }
        // Liste d'arrêts : maximum d'arrêts affichés, et maximum quand le terminus est proche.
        public const int MaxStops = 4;
        public const int MaxStopsNearTerminus = 3;
    }

    [DataContract]
    public sealed class ScreenElement
    {
        public ScreenElement()
        {
            Id = System.Guid.NewGuid().ToString("N");
            Kind = ElementKind.Text;
            Label = string.Empty;
            Text = string.Empty;
            X = 20; Y = 20; W = 200; H = 48;
            FontFamily = "Segoe UI";
            FontSize = 24;
            Align = "LEFT";
            Color = string.Empty;
            Background = string.Empty;
            Format = string.Empty;
            Thickness = 6;
            Rows = 4;
            ArrowStyle = "POINTED";
            FillMode = "SOLID";
            Color2 = string.Empty;
            StrokeColor = string.Empty;
            StrokeWidth = 4;
            ManualStops = string.Empty;
        }

        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "kind")] public string Kind { get; set; }
        // Libellé affiché avant la valeur (ex. « Prochain arrêt : »).
        [DataMember(Name = "label")] public string Label { get; set; }
        // Texte fixe (élément de type TEXT).
        [DataMember(Name = "text")] public string Text { get; set; }
        [DataMember(Name = "x")] public int X { get; set; }
        [DataMember(Name = "y")] public int Y { get; set; }
        [DataMember(Name = "w")] public int W { get; set; }
        [DataMember(Name = "h")] public int H { get; set; }
        [DataMember(Name = "fontFamily")] public string FontFamily { get; set; }
        [DataMember(Name = "fontSize")] public int FontSize { get; set; }
        [DataMember(Name = "bold")] public bool Bold { get; set; }
        [DataMember(Name = "italic")] public bool Italic { get; set; }
        [DataMember(Name = "underline")] public bool Underline { get; set; }
        // LEFT, CENTER ou RIGHT.
        [DataMember(Name = "align")] public string Align { get; set; }
        // Vide : couleur automatique (norme, noir ou blanc selon le fond).
        [DataMember(Name = "color")] public string Color { get; set; }
        // Vide : transparent. Pour un bandeau, vide : couleur de la ligne ou du bandeau par défaut.
        [DataMember(Name = "background")] public string Background { get; set; }
        // Date et heure : format .NET (vide = jj/MM/aaaa ou HH:mm).
        [DataMember(Name = "format")] public string Format { get; set; }
        // Formes : épaisseur du trait, pointe de flèche (POINTED = pleine, CUT = coupée) et rotation en degrés.
        [DataMember(Name = "thickness")] public int Thickness { get; set; }
        [DataMember(Name = "arrowStyle")] public string ArrowStyle { get; set; }
        [DataMember(Name = "rotation")] public int Rotation { get; set; }
        // Liste d'arrêts : nombre de lignes, délai d'arrivée affiché, arrêts principaux seulement.
        [DataMember(Name = "rows")] public int Rows { get; set; }
        [DataMember(Name = "showDelay")] public bool ShowDelay { get; set; }
        [DataMember(Name = "mainOnly")] public bool MainOnly { get; set; }
        // Liste d'arrêts : saisie manuelle (une ligne « VILLE - Arrêt » par arrêt) qui remplace les données en cas de dépassement.
        [DataMember(Name = "manualStops")] public string ManualStops { get; set; }
        // Rectangle et ellipse : SOLID (plein), NONE (vide, contour seul) ou GRADIENT (dégradé Color -> Color2 selon GradientAngle).
        [DataMember(Name = "fillMode")] public string FillMode { get; set; }
        [DataMember(Name = "color2")] public string Color2 { get; set; }
        [DataMember(Name = "gradientAngle")] public int GradientAngle { get; set; }
        // Contour (vide = aucun) et son épaisseur.
        [DataMember(Name = "strokeColor")] public string StrokeColor { get; set; }
        [DataMember(Name = "strokeWidth")] public int StrokeWidth { get; set; }

        [OnDeserializing]
        private void OnDeserializing(StreamingContext context)
        {
            Thickness = 6; Rows = 4; ArrowStyle = "POINTED"; Format = string.Empty;
            FillMode = "SOLID"; Color2 = string.Empty; StrokeColor = string.Empty; StrokeWidth = 4; ManualStops = string.Empty;
        }

        public ScreenElement Copy()
        {
            return (ScreenElement)MemberwiseClone();
        }
    }

    [DataContract]
    public sealed class ScreenNorm
    {
        public ScreenNorm() { SetDefaults(); }

        [OnDeserializing]
        private void OnDeserializing(StreamingContext context) { SetDefaults(); }

        [OnDeserialized]
        private void OnDeserialized(StreamingContext context)
        {
            if (Slides == null) Slides = new List<SlideNorm>();
            if (Width < 100) Width = 800;
            if (Height < 100) Height = 480;
        }

        // Disposition standard selon l'action de la diapositive (repère 800 x 480).
        public static List<ScreenElement> DefaultElements(string type)
        {
            var list = new List<ScreenElement>();
            if (type == SlideType.Cover)
            {
                list.Add(new ScreenElement { Kind = ElementKind.Band, X = 0, Y = 0, W = 800, H = 72 });
                list.Add(new ScreenElement { Kind = ElementKind.Date, X = 12, Y = 8, W = 400, H = 56, FontSize = 26 });
                list.Add(new ScreenElement { Kind = ElementKind.Clock, X = 636, Y = 8, W = 152, H = 56, FontSize = 28, Align = "RIGHT" });
                list.Add(new ScreenElement { Kind = ElementKind.ShapeRect, X = 40, Y = 120, W = 220, H = 220, Color = "LINE" });
                list.Add(new ScreenElement { Kind = ElementKind.Line, X = 40, Y = 120, W = 220, H = 220, FontSize = 120, Bold = true, Align = "CENTER", Color = "#FFFFFF" });
                list.Add(new ScreenElement { Kind = ElementKind.ShapeArrow, X = 290, Y = 130, W = 120, H = 40, Thickness = 10, Color = "LINE" });
                list.Add(new ScreenElement { Kind = ElementKind.Destination, X = 290, Y = 180, W = 490, H = 160, FontSize = 54, Bold = true });
                return list;
            }
            list.Add(new ScreenElement { Kind = ElementKind.Band, X = 0, Y = 0, W = 800, H = 72 });
            list.Add(new ScreenElement { Kind = ElementKind.Line, X = 12, Y = 8, W = 96, H = 56, FontSize = 36, Bold = true, Align = "CENTER" });
            list.Add(new ScreenElement { Kind = ElementKind.Destination, X = 120, Y = 8, W = 500, H = 56, FontSize = 28 });
            list.Add(new ScreenElement { Kind = ElementKind.Clock, X = 636, Y = 8, W = 152, H = 56, FontSize = 28, Align = "RIGHT" });
            if (type == SlideType.NextStops)
                list.Add(new ScreenElement { Kind = ElementKind.Stops, X = 40, Y = 100, W = 720, H = 340, FontSize = 34, Rows = 4 });
            else if (type == SlideType.MainStops)
                list.Add(new ScreenElement { Kind = ElementKind.Stops, X = 40, Y = 100, W = 720, H = 340, FontSize = 34, Rows = 4, ShowDelay = true, MainOnly = true });
            else
                list.Add(new ScreenElement { Kind = ElementKind.Slide, X = 24, Y = 100, W = 752, H = 340, FontSize = 40, Align = "CENTER" });
            return list;
        }

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
            Width = 800;
            Height = 480;
            Slides = new List<SlideNorm>
            {
                new SlideNorm { Type = SlideType.Cover, Seconds = 5, Elements = DefaultElements(SlideType.Cover) },
                new SlideNorm { Type = SlideType.NextStop, Seconds = 6 },
                new SlideNorm { Type = SlideType.Correspondences, Seconds = 4, Elements = DefaultElements(SlideType.Correspondences) },
            };
        }

        [DataMember(Name = "width")] public int Width { get; set; }
        [DataMember(Name = "height")] public int Height { get; set; }

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

    // Message exceptionnel (déviation, perturbation…) : relu toutes les N minutes pendant sa période.
    // Portée : ALL (partout), LINES (lignes choisies) ou STOPS (lignes qui desservent les arrêts choisis).
    [DataContract]
    public sealed class ExceptionalMessage
    {
        public const string ScopeAll = "ALL";
        public const string ScopeLines = "LINES";
        public const string ScopeStops = "STOPS";

        public ExceptionalMessage() { SetDefaults(); }

        [OnDeserializing]
        private void OnDeserializing(StreamingContext context) { SetDefaults(); }

        private void SetDefaults()
        {
            Id = System.Guid.NewGuid().ToString("N");
            Title = string.Empty;
            Text = string.Empty;
            Enabled = true;
            Scope = ScopeAll;
            LineIds = new List<string>();
            Stops = new List<string>();
            IntervalMinutes = 10;
            StartsAt = string.Empty;
            EndsAt = string.Empty;
        }

        [OnDeserialized]
        private void OnDeserialized(StreamingContext context)
        {
            if (LineIds == null) LineIds = new List<string>();
            if (Stops == null) Stops = new List<string>();
        }

        [DataMember(Name = "id")] public string Id { get; set; }
        [DataMember(Name = "title")] public string Title { get; set; }
        [DataMember(Name = "text")] public string Text { get; set; }
        [DataMember(Name = "enabled")] public bool Enabled { get; set; }
        [DataMember(Name = "scope")] public string Scope { get; set; }
        [DataMember(Name = "lineIds")] public List<string> LineIds { get; set; }
        [DataMember(Name = "stops")] public List<string> Stops { get; set; }
        [DataMember(Name = "intervalMinutes")] public int IntervalMinutes { get; set; }
        // Format « yyyy-MM-dd HH:mm », heure locale ; vide = sans limite.
        [DataMember(Name = "startsAt")] public string StartsAt { get; set; }
        [DataMember(Name = "endsAt")] public string EndsAt { get; set; }

        public string DisplayText
        {
            get
            {
                var scope = Scope == ScopeLines ? "lignes" : Scope == ScopeStops ? "arrêts" : "partout";
                return (Enabled ? string.Empty : "(désactivé) ") + (string.IsNullOrEmpty(Title) ? "Message sans titre" : Title) + " [" + scope + ", toutes les " + IntervalMinutes + " min]";
            }
        }

        public static bool TryParseTime(string text, out System.DateTime value)
        {
            return System.DateTime.TryParseExact((text ?? string.Empty).Trim(), "yyyy-MM-dd HH:mm", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out value);
        }

        public bool IsActiveAt(System.DateTime now)
        {
            System.DateTime start, end;
            if (TryParseTime(StartsAt, out start) && now < start) return false;
            if (TryParseTime(EndsAt, out end) && now > end) return false;
            return true;
        }

        // Une ligne inconnue (null) ne reçoit que les messages « partout ».
        public bool Concerns(LineConfig line)
        {
            if (Scope == ScopeAll) return true;
            if (line == null) return false;
            if (Scope == ScopeLines) return LineIds.Contains(line.Id);
            foreach (var stop in AllStops(line))
            {
                foreach (var wanted in Stops)
                {
                    if (string.Equals(stop.Label, wanted, System.StringComparison.OrdinalIgnoreCase)) return true;
                }
            }
            return false;
        }

        public static IEnumerable<LineStop> AllStops(LineConfig line)
        {
            if (line.OutboundStops != null) foreach (var stop in line.OutboundStops) yield return stop;
            if (line.ReturnStops != null) foreach (var stop in line.ReturnStops) yield return stop;
        }

        // {ligne}, {arrets} : arrêts choisis, séparés par des virgules.
        public string SpokenText(LineConfig line)
        {
            return (Text ?? string.Empty)
                .Replace("{ligne}", line == null ? string.Empty : line.Name ?? string.Empty)
                .Replace("{arrets}", string.Join(", ", Stops.ToArray()));
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
            Slides = new List<SlideNorm>();
        }

        [OnDeserialized]
        private void OnDeserialized(StreamingContext context) { if (Slides == null) Slides = new List<SlideNorm>(); }

        // Diapositives de cet écran, chacune liée à une action d'affichage.
        [DataMember(Name = "slides")] public List<SlideNorm> Slides { get; set; }

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
            Exceptional = new List<ExceptionalMessage>();
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
            if (Exceptional == null) Exceptional = new List<ExceptionalMessage>();
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
        [DataMember(Name = "exceptional")] public List<ExceptionalMessage> Exceptional { get; set; }
    }
}
