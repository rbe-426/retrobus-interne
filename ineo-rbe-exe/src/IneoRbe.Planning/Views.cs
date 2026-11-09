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
            var routes = new List<object>();
            var course = new FieldDef("courseReference", "Trajet / code course", FieldKind.Combo);
            var vehicle = new FieldDef("vehicleParc", "Véhicule", FieldKind.Combo);
            var driver = new FieldDef("driverIdentifier", "Conducteur", FieldKind.Combo) { Hint = "permis D + carte conducteur" };
            var view = new EditorView
            {
                Note = "Le code service est repris du trajet choisi. Créez d'abord le trajet dans « Trajets et codes course ».",
                Fields =
                {
                    new FieldDef("serviceName", "Nom du service"),
                    course, vehicle, driver,
                    new FieldDef("scheduledDeparture", "Départ prévu", FieldKind.DateTime) { Hint = EditorView.DateFormat },
                    new FieldDef("scheduledArrival", "Arrivée prévue", FieldKind.DateTime) { Hint = EditorView.DateFormat },
                    new FieldDef("notes", "Notes", FieldKind.Multiline),
                },
                Columns =
                {
                    new ColDef("Statut", 80, i => Label(StatusLabels, Json.Str(i, "status"))),
                    new ColDef("Départ", 120, i => Data.Date(i, "scheduledDeparture")),
                    new ColDef("Service", 150, "serviceName"),
                    new ColDef("Code course", 120, "courseReference"),
                    new ColDef("Véhicule", 70, "vehicleParc"),
                    new ColDef("Conducteur", 110, "driverIdentifier"),
                },
            };
            view.Prepare = () =>
            {
                routes = Data.List("/ineo/routes", "routes");
                course.Options = Data.Options(routes, r => Json.Str(r, "courseReference"), r => Json.Str(r, "courseReference") + " — " + Json.Str(r, "routeName"));
                vehicle.Options = Data.Options(Data.Vehicles(), v => Json.Str(v, "parc"), Data.VehicleLabel);
                var profiles = Data.List("/ineo/driver-profiles", "profiles").Where(p => Json.Bool(p, "hasCategoryDLicense") && Json.Bool(p, "hasDriverCard"));
                driver.Options = Data.Options(profiles, p => Json.Str(p, "driverIdentifier"), p => Json.Str(p, "driverIdentifier"));
            };
            view.Load = () => Data.List("/ineo/missions", "missions");
            view.Save = (v, existing) =>
            {
                var courseReference = (string)v["courseReference"];
                var route = routes.FirstOrDefault(r => Json.Str(r, "courseReference") == courseReference);
                if (route == null) throw new InvalidOperationException("Choisissez un trajet (code course).");
                var serviceReference = Json.Str(route, "serviceReference");
                if (serviceReference.Length == 0) throw new InvalidOperationException("Le trajet choisi n'a pas de code service : complétez-le dans « Trajets et codes course ».");
                if (string.IsNullOrEmpty((string)v["serviceName"])) v["serviceName"] = Json.Str(route, "routeName");
                return Data.RetryFimo(allow =>
                {
                    var body = new Dictionary<string, object>
                    {
                        { "serviceName", v["serviceName"] }, { "serviceReference", serviceReference }, { "courseReference", courseReference },
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

        // ----- Trajets et codes course -----

        private static string StopsToText(object route)
        {
            var builder = new StringBuilder();
            foreach (var stop in Json.List(route, "stops"))
            {
                builder.Append(Json.Str(stop, "label")).Append(';').Append(Json.Str(stop, "scheduledTime")).Append(';')
                    .Append(Json.Num(stop, "lat") ?? 0).Append(';').Append(Json.Num(stop, "lng") ?? 0).Append("\r\n");
            }
            return builder.ToString().Replace(',', '.');
        }

        private static List<object> TextToStops(string text)
        {
            var stops = new List<object>();
            var lines = (text ?? string.Empty).Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var line in lines)
            {
                var parts = line.Split(';');
                double lat, lng;
                if (parts.Length < 4 || !double.TryParse(parts[2].Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out lat) || !double.TryParse(parts[3].Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out lng))
                    throw new FormatException("Arrêt illisible : « " + line + " ». Format : libellé;HH:mm;latitude;longitude.");
                stops.Add(new Dictionary<string, object> { { "label", parts[0].Trim() }, { "scheduledTime", parts[1].Trim() }, { "lat", lat }, { "lng", lng } });
            }
            return stops;
        }

        public static UIElement Routes()
        {
            var vehicle = new FieldDef("vehicleParc", "Véhicule imposé", FieldKind.Combo);
            var view = new EditorView
            {
                Note = "Un arrêt par ligne : libellé;HH:mm;latitude;longitude. Le bouton « Ajouter un arrêt » cherche une adresse.",
                Fields =
                {
                    new FieldDef("courseReference", "Code course", FieldKind.Text) { ReadOnly = true, Hint = "999-26726-920" },
                    new FieldDef("routeName", "Nom du trajet"),
                    new FieldDef("serviceReference", "Code service", FieldKind.Text) { Hint = "RBE-999-999" },
                    new FieldDef("lineName", "Ligne"),
                    vehicle,
                    new FieldDef("scheduledDeparture", "Heure de départ", FieldKind.Text) { Hint = "HH:mm" },
                    new FieldDef("scheduledArrival", "Heure d'arrivée", FieldKind.Text) { Hint = "HH:mm" },
                    new FieldDef("stopsText", "Arrêts", FieldKind.Multiline),
                    new FieldDef("notes", "Notes", FieldKind.Multiline),
                    new FieldDef("isFreeTracking", "Traçage libre", FieldKind.Check),
                },
                Columns =
                {
                    new ColDef("Code course", 120, "courseReference"),
                    new ColDef("Trajet", 170, "routeName"),
                    new ColDef("Service", 100, "serviceReference"),
                    new ColDef("Ligne", 70, "lineName"),
                    new ColDef("Arrêts", 50, i => Json.List(i, "stops").Count.ToString()),
                },
            };
            view.Prepare = () => vehicle.Options = Data.Options(Data.Vehicles(), v => Json.Str(v, "parc"), Data.VehicleLabel);
            view.Load = () =>
            {
                var routes = Data.List("/ineo/routes", "routes");
                foreach (var route in routes) Json.Obj(route)["stopsText"] = StopsToText(route);
                return routes;
            };
            view.Save = (v, existing) =>
            {
                var reference = ((string)v["courseReference"]).ToUpperInvariant();
                if (existing != null) reference = Json.Str(existing, "courseReference");
                var body = new Dictionary<string, object>
                {
                    { "courseReference", reference }, { "routeName", v["routeName"] }, { "serviceReference", v["serviceReference"] },
                    { "lineName", v["lineName"] }, { "vehicleParc", v["vehicleParc"] }, { "scheduledDeparture", v["scheduledDeparture"] },
                    { "scheduledArrival", v["scheduledArrival"] }, { "stops", TextToStops((string)v["stopsText"]) },
                    { "notes", v["notes"] }, { "isFreeTracking", v["isFreeTracking"] },
                };
                return Api.Put("/ineo/routes/reference/" + Data.Encode(reference), body);
            };
            view.Remove = item => Api.Delete("/ineo/routes/reference/" + Data.Encode(Json.Str(item, "courseReference")));
            view.AddButton("Ajouter un arrêt", item =>
            {
                var dialog = new GeocodeDialog(Window.GetWindow(view));
                if (dialog.ShowDialog() != true) return;
                var line = dialog.Label.Replace(';', ',') + ";;" + dialog.Lat.ToString(CultureInfo.InvariantCulture) + ";" + dialog.Lng.ToString(CultureInfo.InvariantCulture);
                view.AppendValue("stopsText", line);
            });
            view.Loaded += (s, e) => { if (view.Items.Count == 0) view.Start(); };
            return view;
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
