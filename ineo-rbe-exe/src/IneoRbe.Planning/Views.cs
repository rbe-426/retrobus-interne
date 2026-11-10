using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Windows;
using System.Windows.Controls;

namespace IneoRbe.Planning
{
    public static class Views
    {
        private static readonly Dictionary<string, string> StatusLabels = new Dictionary<string, string>
        {
            { "PLANNED", "Planifié" }, { "ACTIVE", "En cours" }, { "COMPLETED", "Terminé" }, { "CANCELLED", "Annulé" },
        };

        private static string Label(Dictionary<string, string> map, string key)
        {
            string text;
            return map.TryGetValue(key, out text) ? text : key;
        }

        // ----- Planifier les services -----

        public static UIElement Missions()
        {
            var lines = new List<object>();
            var vehicle = new FieldDef("vehicleParc", "Véhicule", FieldKind.Combo);
            var driver = new FieldDef("driverIdentifier", "Conducteur", FieldKind.Combo) { Hint = "permis D + carte conducteur" };
            var view = new EditorView
            {
                Note = "Un service = un numéro libre (celui que le conducteur saisit dans la console) et une suite de courses : aller, retour, aller-retour ou haut-le-pied. Utilisez « Courses du service… » pour les définir.",
                Fields =
                {
                    new FieldDef("serviceReference", "Numéro de service") { Hint = "libre, ex. 12-03" },
                    new FieldDef("serviceName", "Nom du service") { Hint = "facultatif" },
                    vehicle, driver,
                    new FieldDef("scheduledDeparture", "Départ prévu", FieldKind.DateTime) { Hint = EditorView.DateFormat },
                    new FieldDef("scheduledArrival", "Arrivée prévue", FieldKind.DateTime) { Hint = EditorView.DateFormat },
                    new FieldDef("notes", "Notes", FieldKind.Multiline),
                    new FieldDef("coursesJson", "Courses", FieldKind.Hidden),
                },
                Columns =
                {
                    new ColDef("Statut", 80, i => Label(StatusLabels, Json.Str(i, "status"))),
                    new ColDef("Départ", 120, i => Data.Date(i, "scheduledDeparture")),
                    new ColDef("Service", 110, "serviceReference"),
                    new ColDef("Courses", 200, i => CoursesSummary(i)),
                    new ColDef("Véhicule", 70, "vehicleParc"),
                    new ColDef("Conducteur", 110, "driverIdentifier"),
                },
            };
            view.Prepare = () =>
            {
                lines = Data.List("/ineo/lines", "lines");
                vehicle.Options = Data.Options(Data.Vehicles(), v => Json.Str(v, "parc"), Data.VehicleLabel);
                var profiles = Data.List("/ineo/driver-profiles", "profiles").Where(p => Json.Bool(p, "hasCategoryDLicense") && Json.Bool(p, "hasDriverCard"));
                driver.Options = Data.Options(profiles, p => Json.Str(p, "driverIdentifier"), p => Json.Str(p, "driverIdentifier"));
            };
            view.Load = () =>
            {
                var missions = Data.List("/ineo/missions", "missions");
                foreach (var mission in missions) Json.Obj(mission)["coursesJson"] = Json.Write(CoursesToJson(LineData.ReadCourses(mission)));
                return missions;
            };
            view.AddButton("Courses du service…", item =>
            {
                var options = lines.Select(l => new KeyValuePair<string, string>(Json.Str(l, "id"), Json.Str(l, "name"))).ToList();
                if (options.Count == 0) { Ui.Error("Créez d'abord une ligne dans « Lignes et itinéraires »."); return; }
                var dialog = new CoursesDialog(Window.GetWindow(view), options, ParseCourses(view.GetValue("coursesJson")));
                if (dialog.ShowDialog() == true) view.SetValue("coursesJson", Json.Write(CoursesToJson(dialog.Courses)));
            });
            view.Save = (v, existing) =>
            {
                var service = ((string)v["serviceReference"] ?? string.Empty).Trim().ToUpperInvariant();
                if (service.Length == 0) throw new InvalidOperationException("Numéro de service requis.");
                var courses = CoursesToJson(ParseCourses((string)v["coursesJson"]));
                if (courses.Count == 0) throw new InvalidOperationException("Ajoutez au moins une course (bouton « Courses du service… »).");
                return Data.RetryFimo(allow =>
                {
                    var body = new Dictionary<string, object>
                    {
                        { "serviceName", string.IsNullOrEmpty((string)v["serviceName"]) ? service : v["serviceName"] }, { "serviceReference", service }, { "courses", courses },
                        { "vehicleParc", v["vehicleParc"] }, { "driverIdentifier", v["driverIdentifier"] }, { "driverName", v["driverIdentifier"] },
                        { "scheduledDeparture", v["scheduledDeparture"] }, { "scheduledArrival", v["scheduledArrival"] },
                        { "notes", v["notes"] }, { "allowExpiredFimo", allow },
                    };
                    return existing == null ? Api.Post("/ineo/missions", body) : Api.Patch("/ineo/missions/" + Json.Str(existing, "id"), body);
                });
            };
            view.Remove = item => Api.Delete("/ineo/missions/" + Json.Str(item, "id"));
            view.Describe = item => "Statut : " + Label(StatusLabels, Json.Str(item, "status"));
            view.Loaded += (s, e) => { if (view.Items.Count == 0) view.Start(); };
            return view;
        }

        private static string CoursesSummary(object mission)
        {
            var courses = Json.List(mission, "courses");
            if (courses.Count == 0) return Json.Str(mission, "courseReference");
            return courses.Count + " : " + string.Join(" ", courses.Select(c =>
            {
                var direction = Json.Str(c, "direction");
                var name = Json.Str(c, "lineName");
                return direction == "HLP" ? "HLP" : name + (direction == "ALLER" ? " A" : " R");
            }).ToArray());
        }

        private static List<CourseRow> ParseCourses(string json)
        {
            var rows = new List<CourseRow>();
            foreach (var item in Json.Arr(Json.Parse(json)))
            {
                rows.Add(new CourseRow { LineId = Json.Str(item, "lineId"), Direction = Json.Str(item, "direction"), DepartureTime = Json.Str(item, "departureTime") });
            }
            return rows;
        }

        private static List<object> CoursesToJson(IEnumerable<CourseRow> courses)
        {
            return courses.Select(c => (object)new Dictionary<string, object>
            {
                { "lineId", c.Direction == "HLP" ? string.Empty : c.LineId }, { "direction", c.Direction }, { "departureTime", string.IsNullOrWhiteSpace(c.DepartureTime) ? string.Empty : c.DepartureTime.Trim() },
            }).ToList();
        }

        // ----- Lignes et itinéraires -----

        private static readonly KeyValuePair<string, string>[] LineColors =
        {
            new KeyValuePair<string, string>("#9F063A", "Bordeaux RétroBus"), new KeyValuePair<string, string>("#DC2626", "Rouge"),
            new KeyValuePair<string, string>("#EA580C", "Orange"), new KeyValuePair<string, string>("#CA8A04", "Jaune"),
            new KeyValuePair<string, string>("#16A34A", "Vert"), new KeyValuePair<string, string>("#0D9488", "Turquoise"),
            new KeyValuePair<string, string>("#2563EB", "Bleu"), new KeyValuePair<string, string>("#1E3A8A", "Bleu marine"),
            new KeyValuePair<string, string>("#7C3AED", "Violet"), new KeyValuePair<string, string>("#DB2777", "Rose"),
            new KeyValuePair<string, string>("#78350F", "Marron"), new KeyValuePair<string, string>("#475569", "Gris"),
            new KeyValuePair<string, string>("#0F172A", "Noir"),
        };

        public static UIElement Lines()
        {
            var colorField = new FieldDef("color", "Couleur de la ligne", FieldKind.Combo) { Options = LineColors.ToList() };
            var view = new EditorView
            {
                Note = "Une ligne = un nom, deux destinations (hors déviation) et une couleur. Enregistrez-la, sélectionnez-la, puis éditez l'itinéraire aller (destination 1 → 2) et l'itinéraire retour (2 → 1) : tableau d'arrêts + carte avec tracé.",
                Fields =
                {
                    new FieldDef("name", "Nom de la ligne"),
                    new FieldDef("destination1", "Destination 1"),
                    new FieldDef("destination2", "Destination 2"),
                    colorField,
                },
                Columns =
                {
                    new ColDef("Ligne", 110, "name"),
                    new ColDef("Destination 1", 130, "destination1"),
                    new ColDef("Destination 2", 130, "destination2"),
                    new ColDef("Couleur", 100, i => LineColors.Where(c => c.Key == Json.Str(i, "color")).Select(c => c.Value).FirstOrDefault() ?? Json.Str(i, "color")),
                    new ColDef("Arrêts aller", 80, i => Json.List(i, "outboundStops").Count.ToString()),
                    new ColDef("Arrêts retour", 85, i => Json.List(i, "returnStops").Count.ToString()),
                },
            };
            view.Load = () => Data.List("/ineo/lines", "lines");
            view.Save = (v, existing) =>
            {
                if (string.IsNullOrEmpty((string)v["name"]) || string.IsNullOrEmpty((string)v["destination1"]) || string.IsNullOrEmpty((string)v["destination2"]))
                    throw new InvalidOperationException("Nom et destinations 1 et 2 requis.");
                var body = new Dictionary<string, object>
                {
                    { "name", v["name"] }, { "destination1", v["destination1"] }, { "destination2", v["destination2"] },
                    { "color", string.IsNullOrEmpty((string)v["color"]) ? LineColors[0].Key : v["color"] },
                };
                return existing == null ? Api.Post("/ineo/lines", body) : Api.Put("/ineo/lines/" + Json.Str(existing, "id"), body);
            };
            view.Remove = item => Api.Delete("/ineo/lines/" + Json.Str(item, "id"));
            view.AddButton("Itinéraire aller…", item => EditItinerary(view, item, true));
            view.AddButton("Itinéraire retour…", item => EditItinerary(view, item, false));
            view.Loaded += (s, e) => { if (view.Items.Count == 0) view.Start(); };
            return view;
        }

        private static void EditItinerary(EditorView view, object line, bool outbound)
        {
            if (line == null) { Ui.Error("Enregistrez puis sélectionnez une ligne avant d'éditer son itinéraire."); return; }
            var first = Json.Str(line, outbound ? "destination1" : "destination2");
            var last = Json.Str(line, outbound ? "destination2" : "destination1");
            var prefix = outbound ? "outbound" : "return";
            var dialog = new ItineraryDialog(Window.GetWindow(view), (outbound ? "Itinéraire aller : " : "Itinéraire retour : ") + Json.Str(line, "name") + " (" + first + " → " + last + ")",
                Json.Str(line, "color"), LineData.ReadStops(line, prefix + "Stops"), LineData.ReadPath(line, prefix + "Path"));
            if (dialog.ShowDialog() != true) return;
            var body = new Dictionary<string, object> { { prefix + "Stops", LineData.StopsJson(dialog.Stops) }, { prefix + "Path", LineData.PathJson(dialog.Path) } };
            view.SetStatus("Enregistrement de l'itinéraire…");
            Ui.Run(view.Dispatcher, () => Api.Put("/ineo/lines/" + Json.Str(line, "id"), body), result => view.Reload(), error => Ui.Error(error));
        }

        // ----- Conducteurs -----

        public static UIElement Drivers()
        {
            var view = new EditorView
            {
                Note = "Un conducteur n'est affectable à un service qu'avec le permis D et la carte conducteur. Saisissez l'identifiant URBEX (ex. n.tetillon).",
                Fields =
                {
                    new FieldDef("driverIdentifier", "Identifiant", FieldKind.Text) { ReadOnly = true },
                    new FieldDef("hasCategoryDLicense", "Permis D", FieldKind.Check),
                    new FieldDef("hasDriverCard", "Carte conducteur", FieldKind.Check),
                    new FieldDef("hasValidFimo", "FIMO / FCO valide", FieldKind.Check),
                    new FieldDef("hasTachographCard", "Carte chronotachygraphe", FieldKind.Check),
                },
                Columns =
                {
                    new ColDef("Identifiant", 120, "driverIdentifier"),
                    new ColDef("Permis D", 60, i => Data.YesNo(i, "hasCategoryDLicense")),
                    new ColDef("Carte", 55, i => Data.YesNo(i, "hasDriverCard")),
                    new ColDef("FIMO", 55, i => Data.YesNo(i, "hasValidFimo")),
                    new ColDef("Tachy.", 55, i => Data.YesNo(i, "hasTachographCard")),
                    new ColDef("H théo.", 55, i => (Json.Num(i, "theoreticalDrivingHours") ?? 0).ToString("0.#")),
                    new ColDef("H réelles", 60, i => (Json.Num(i, "actualDrivingHours") ?? 0).ToString("0.#")),
                },
            };
            view.Load = () => Data.List("/ineo/driver-profiles", "profiles");
            view.Save = (v, existing) =>
            {
                var identifier = existing != null ? Json.Str(existing, "driverIdentifier") : ((string)v["driverIdentifier"]).ToLowerInvariant();
                if (identifier.Length == 0) throw new InvalidOperationException("Identifiant requis.");
                return Api.Put("/ineo/driver-profiles/" + Data.Encode(identifier), new Dictionary<string, object>
                {
                    { "hasCategoryDLicense", v["hasCategoryDLicense"] }, { "hasDriverCard", v["hasDriverCard"] },
                    { "hasValidFimo", v["hasValidFimo"] }, { "hasTachographCard", v["hasTachographCard"] },
                });
            };
            view.Loaded += (s, e) => { if (view.Items.Count == 0) view.Start(); };
            return view;
        }

        // ----- Profils véhicules -----

        public static UIElement VehicleProfiles()
        {
            var types = new[] { "BUS STANDARD", "BUS ARTICULE", "BUS BI ARTICULE", "BUS GABARIT REDUIT", "VOITURES", "DIVERS" };
            var typeField = new FieldDef("vehicleType", "Type de véhicule", FieldKind.Combo);
            typeField.Options = types.Select(t => new KeyValuePair<string, string>(t, t)).ToList();
            var view = new EditorView
            {
                Note = "Sélectionnez un véhicule du parc pour renseigner son profil, son boîtier de suivi (IMEI) et le PC UC embarqué. Les écrans et annonces se configurent dans « Configurateur SAEIV ».",
                Fields =
                {
                    new FieldDef("vehicleParc", "Parc", FieldKind.Text) { ReadOnly = true },
                    typeField,
                    new FieldDef("maxSpeedKmh", "Vitesse max (km/h)", FieldKind.Number),
                    new FieldDef("lengthM", "Longueur (m)", FieldKind.Number),
                    new FieldDef("widthM", "Largeur (m)", FieldKind.Number),
                    new FieldDef("heightM", "Hauteur (m)", FieldKind.Number),
                    new FieldDef("options", "Options", FieldKind.Multiline),
                    new FieldDef("imei", "IMEI du boîtier", FieldKind.Text) { Hint = "14 à 17 chiffres" },
                    new FieldDef("deviceLabel", "Nom du boîtier"),
                    new FieldDef("ucSerial", "N° de série du PC UC"),
                },
                Columns =
                {
                    new ColDef("Parc", 60, "vehicleParc"),
                    new ColDef("Véhicule", 200, "label"),
                    new ColDef("Type", 120, "vehicleType"),
                    new ColDef("IMEI", 130, "imei"),
                    new ColDef("UC", 120, "ucSerial"),
                },
            };
            view.Load = () =>
            {
                var vehicles = Data.Vehicles();
                var profiles = Data.List("/ineo/vehicle-profiles", "profiles");
                var trackers = Data.List("/ineo/vehicle-trackers", "trackers");
                var merged = new List<object>();
                foreach (var vehicle in vehicles)
                {
                    var parc = Json.Str(vehicle, "parc");
                    var profile = profiles.FirstOrDefault(p => Json.Str(p, "vehicleParc") == parc);
                    var tracker = trackers.FirstOrDefault(t => Json.Str(t, "vehicleParc") == parc);
                    var row = new Dictionary<string, object> { { "vehicleParc", parc }, { "label", Data.VehicleLabel(vehicle) } };
                    foreach (var key in new[] { "vehicleType", "maxSpeedKmh", "lengthM", "widthM", "heightM", "options", "ucSerial" })
                        row[key] = Json.Get(profile, key);
                    row["imei"] = Json.Get(tracker, "imei");
                    row["deviceLabel"] = Json.Get(tracker, "deviceLabel");
                    merged.Add(row);
                }
                return merged;
            };
            view.Save = (v, existing) =>
            {
                if (existing == null) throw new InvalidOperationException("Sélectionnez d'abord un véhicule dans la liste.");
                var parc = Json.Str(existing, "vehicleParc");
                var body = new Dictionary<string, object>();
                foreach (var key in new[] { "vehicleType", "maxSpeedKmh", "lengthM", "widthM", "heightM", "options", "ucSerial" }) body[key] = v[key];
                var result = Api.Put("/ineo/vehicle-profiles/" + Data.Encode(parc), body);
                var imei = ((string)v["imei"]).Replace(" ", string.Empty);
                if (imei.Length > 0)
                    Api.Put("/ineo/vehicle-trackers/" + Data.Encode(parc), new Dictionary<string, object> { { "imei", imei }, { "deviceLabel", v["deviceLabel"] } });
                return result;
            };
            view.Loaded += (s, e) => { if (view.Items.Count == 0) view.Start(); };
            return view;
        }

        // ----- Flash conducteurs -----

        public static UIElement Flashes()
        {
            var modes = new Dictionary<string, string>
            {
                { "IMMEDIATE", "Immédiat" }, { "AT_TIME", "À une heure précise" }, { "ON_SERVICE_START", "Au début du service" }, { "AT_LOCATION", "À un endroit précis" },
            };
            var mode = new FieldDef("scheduleMode", "Diffusion", FieldKind.Combo);
            mode.Options = modes.Select(m => new KeyValuePair<string, string>(m.Key, m.Value)).ToList();
            var view = new EditorView
            {
                Note = "Message affiché sur l'écran des conducteurs. Pour « À un endroit précis », utilisez « Rechercher un lieu ».",
                Fields =
                {
                    new FieldDef("message", "Message", FieldKind.Multiline),
                    mode,
                    new FieldDef("scheduledAt", "Heure de diffusion", FieldKind.DateTime) { Hint = EditorView.DateFormat },
                    new FieldDef("locationLabel", "Lieu"),
                    new FieldDef("locationLat", "Latitude", FieldKind.Number),
                    new FieldDef("locationLng", "Longitude", FieldKind.Number),
                    new FieldDef("radiusMeters", "Rayon (m)", FieldKind.Number),
                    new FieldDef("active", "Actif", FieldKind.Check),
                },
                Columns =
                {
                    new ColDef("Message", 240, i => Json.Str(i, "message").Replace('\n', ' ')),
                    new ColDef("Diffusion", 130, i => Label(modes, Json.Str(i, "scheduleMode"))),
                    new ColDef("Actif", 50, i => Data.YesNo(i, "active")),
                    new ColDef("Acquittés", 65, i => Json.List(i, "acknowledgements").Count.ToString()),
                },
            };
            view.Load = () => Data.List("/ineo/flashes", "flashes");
            view.Save = (v, existing) =>
            {
                if (string.IsNullOrEmpty((string)v["message"])) throw new InvalidOperationException("Le message est requis.");
                var body = new Dictionary<string, object>(v);
                if (string.IsNullOrEmpty((string)v["scheduleMode"])) body["scheduleMode"] = "IMMEDIATE";
                return existing == null ? Api.Post("/ineo/flashes", body) : Api.Patch("/ineo/flashes/" + Json.Str(existing, "id"), body);
            };
            view.Remove = item => Api.Delete("/ineo/flashes/" + Json.Str(item, "id"));
            view.Describe = item =>
            {
                var acks = Json.List(item, "acknowledgements");
                return acks.Count == 0 ? "Aucun acquittement." : "Acquitté par : " + string.Join(", ", acks.Select(a => Json.Str(a, "driverName").Length > 0 ? Json.Str(a, "driverName") : Json.Str(a, "driverIdentifier")).ToArray());
            };
            view.AddButton("Rechercher un lieu", item =>
            {
                var dialog = new GeocodeDialog(Window.GetWindow(view));
                if (dialog.ShowDialog() != true) return;
                view.SetValue("scheduleMode", "AT_LOCATION");
                view.SetValue("locationLabel", dialog.Label);
                view.SetValue("locationLat", dialog.Lat.ToString(CultureInfo.InvariantCulture));
                view.SetValue("locationLng", dialog.Lng.ToString(CultureInfo.InvariantCulture));
                view.SetValue("radiusMeters", "200");
            });
            view.AddButton("Rediffuser", item =>
            {
                if (item == null) { Ui.Error("Sélectionnez un flash."); return; }
                Ui.Run(view.Dispatcher, () => Api.Post("/ineo/flashes/" + Json.Str(item, "id") + "/rebroadcast", new Dictionary<string, object>()), r => view.Reload(), null);
            });
            view.Loaded += (s, e) => { if (view.Items.Count == 0) view.Start(); };
            return view;
        }

        // ----- Ordinateurs Maintenance -----

        public static UIElement MaintenancePcs()
        {
            var view = new EditorView
            {
                Note = "Seuls les PC enregistrés ici peuvent lancer l'outil Inéo RétroBus Maintenance.",
                Fields =
                {
                    new FieldDef("serial", "N° de série", FieldKind.Text) { ReadOnly = true },
                    new FieldDef("name", "Technicien / poste"),
                    new FieldDef("notes", "Notes", FieldKind.Multiline),
                    new FieldDef("active", "Autorisé", FieldKind.Check),
                },
                Columns =
                {
                    new ColDef("Nom", 140, "name"),
                    new ColDef("N° de série", 170, "serial"),
                    new ColDef("Autorisé", 60, i => Data.YesNo(i, "active")),
                    new ColDef("Version", 80, "appVersion"),
                    new ColDef("Vu le", 120, i => Data.Date(i, "lastSeenAt")),
                },
            };
            view.Load = () => Data.List("/ineo/maintenance-pcs", "pcs");
            view.Save = (v, existing) =>
            {
                if (existing == null)
                    return Api.Post("/ineo/maintenance-pcs", new Dictionary<string, object> { { "serial", v["serial"] }, { "name", v["name"] }, { "notes", v["notes"] } });
                return Api.Patch("/ineo/maintenance-pcs/" + Json.Str(existing, "id"), new Dictionary<string, object> { { "name", v["name"] }, { "notes", v["notes"] }, { "active", v["active"] } });
            };
            view.Remove = item => Api.Delete("/ineo/maintenance-pcs/" + Json.Str(item, "id"));
            view.Loaded += (s, e) => { if (view.Items.Count == 0) view.Start(); };
            return view;
        }
    }
}
