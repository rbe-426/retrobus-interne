using System;
using System.Collections.Generic;
using System.Text;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Planning
{
    public sealed class ApiException : Exception
    {
        public int Status { get; private set; }
        public object Payload { get; private set; }
        public ApiException(int status, string message, object payload) : base(message) { Status = status; Payload = payload; }
    }

    // Session API URBEX : connexion, jeton JWT (1 h) renouvelé automatiquement, jeton CSRF pour les écritures.
    public static class Api
    {
        private static readonly object Gate = new object();
        private static string _token;
        private static string _refresh;
        private static string _csrf;
        private static DateTime _expires = DateTime.MinValue;

        public static string UserName { get; private set; }

        public static bool IsAuthenticated { get { return _token != null; } }

        public static void Login(string identifier, string password)
        {
            lock (Gate)
            {
                var body = new Dictionary<string, object> { { "email", identifier }, { "password", password } };
                var result = Raw("POST", "/auth/login", body, null, false);
                if (!result.IsSuccess) throw Failure(result, "Identifiants invalides");
                Store(Json.Parse(result.BodyText));
                var user = Json.Get(Json.Parse(result.BodyText), "user");
                UserName = (Json.Str(user, "firstName") + " " + Json.Str(user, "lastName")).Trim();
                if (UserName.Length == 0) UserName = Json.Str(user, "email");
                if (UserName.Length == 0) UserName = identifier;
            }
        }

        public static void Logout()
        {
            lock (Gate) { _token = null; _refresh = null; _csrf = null; UserName = null; }
            Invalidate();
        }

        // Listes de référence préchargées pendant le démarrage ; servies instantanément puis rafraîchies en arrière-plan.
        public static readonly string[] Preloaded =
        {
            "/vehicles", "/ineo/routes", "/ineo/missions", "/ineo/driver-profiles", "/ineo/screen-profiles",
            "/ineo/vehicle-profiles", "/ineo/vehicle-trackers", "/ineo/flashes", "/ineo/maintenance-pcs",
        };

        private static readonly TimeSpan CacheFresh = TimeSpan.FromSeconds(20);
        private static readonly Dictionary<string, KeyValuePair<DateTime, object>> Cache = new Dictionary<string, KeyValuePair<DateTime, object>>();
        private static readonly HashSet<string> Refreshing = new HashSet<string>();

        public static object Get(string path)
        {
            if (Array.IndexOf(Preloaded, path) < 0) return Call("GET", path, null);
            KeyValuePair<DateTime, object> hit;
            bool found;
            lock (Cache) { found = Cache.TryGetValue(path, out hit); }
            if (!found) return Fetch(path);
            if (DateTime.UtcNow - hit.Key > CacheFresh)
            {
                lock (Cache) { if (!Refreshing.Add(path)) return hit.Value; }
                System.Threading.ThreadPool.QueueUserWorkItem(delegate
                {
                    try { Fetch(path); } catch (Exception) { }
                    finally { lock (Cache) { Refreshing.Remove(path); } }
                });
            }
            return hit.Value;
        }

        private static object Fetch(string path)
        {
            var value = Call("GET", path, null);
            lock (Cache) { Cache[path] = new KeyValuePair<DateTime, object>(DateTime.UtcNow, value); }
            return value;
        }

        // Précharge toutes les listes en parallèle ; renvoie le nombre d'échecs.
        public static int Preload(Action<int, int> progress)
        {
            var total = Preloaded.Length;
            var done = 0;
            var failed = 0;
            var threads = new List<System.Threading.Thread>();
            foreach (var path in Preloaded)
            {
                var target = path;
                var thread = new System.Threading.Thread(() =>
                {
                    try { Fetch(target); } catch (Exception) { System.Threading.Interlocked.Increment(ref failed); }
                    var count = System.Threading.Interlocked.Increment(ref done);
                    if (progress != null) progress(count, total);
                });
                thread.IsBackground = true;
                thread.Start();
                threads.Add(thread);
            }
            foreach (var thread in threads) thread.Join(60000);
            return failed;
        }

        private static void Invalidate() { lock (Cache) { Cache.Clear(); } }

        public static object Post(string path, object body) { return Mutate("POST", path, body); }
        public static object Put(string path, object body) { return Mutate("PUT", path, body); }
        public static object Patch(string path, object body) { return Mutate("PATCH", path, body); }
        public static object Delete(string path) { return Mutate("DELETE", path, null); }

        private static object Mutate(string method, string path, object body)
        {
            try { return Call(method, path, body); }
            finally { Invalidate(); }
        }

        public static byte[] GetBytes(string path)
        {
            EnsureToken();
            var result = Raw("GET", path, null, _token, false);
            if (!result.IsSuccess) throw Failure(result, "Erreur " + result.StatusCode);
            return result.Body;
        }

        private static object Call(string method, string path, object body)
        {
            EnsureToken();
            var write = method != "GET";
            var result = Raw(method, path, body, _token, write);
            if (result.StatusCode == 401 && TryRefresh()) result = Raw(method, path, body, _token, write);
            if (result.StatusCode == 403 && write && Mentions(result, "csrf"))
            {
                lock (Gate) { _csrf = null; }
                result = Raw(method, path, body, _token, true);
            }
            if (!result.IsSuccess) throw Failure(result, "Erreur " + result.StatusCode);
            return string.IsNullOrWhiteSpace(result.BodyText) ? null : Json.Parse(result.BodyText);
        }

        private static bool Mentions(HttpResult result, string word)
        {
            return result.BodyText.IndexOf(word, StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static void EnsureToken()
        {
            if (_token == null) throw new ApiException(401, "Session expirée : reconnectez-vous.", null);
            if (DateTime.UtcNow > _expires.AddMinutes(-3)) TryRefresh();
        }

        private static bool TryRefresh()
        {
            lock (Gate)
            {
                if (_refresh == null) return false;
                var result = Raw("POST", "/auth/refresh-token", new Dictionary<string, object> { { "refreshToken", _refresh } }, null, false);
                if (!result.IsSuccess) return false;
                Store(Json.Parse(result.BodyText));
                return true;
            }
        }

        private static void Store(object payload)
        {
            _token = Json.Str(payload, "accessToken");
            if (_token.Length == 0) _token = Json.Str(payload, "token");
            _refresh = Json.Str(payload, "refreshToken");
            _expires = DateTime.UtcNow.AddMinutes(60);
        }

        private static string EnsureCsrf()
        {
            lock (Gate)
            {
                if (_csrf != null) return _csrf;
                var result = Raw("GET", "/csrf-token", null, null, false);
                if (!result.IsSuccess) throw Failure(result, "Jeton de sécurité indisponible");
                _csrf = Json.Str(Json.Parse(result.BodyText), "csrfToken");
                return _csrf;
            }
        }

        private static HttpResult Raw(string method, string path, object body, string token, bool csrf)
        {
            var headers = new Dictionary<string, string>();
            if (token != null) headers["Authorization"] = "Bearer " + token;
            if (csrf) headers["X-CSRF-Token"] = EnsureCsrf();
            var payload = body == null ? null : Encoding.UTF8.GetBytes(Json.Write(body));
            var url = path.StartsWith("http", StringComparison.Ordinal) ? path : ApiEndpoints.ApiRoot + path;
            try
            {
                return HttpTransport.Send(method, url, payload == null ? null : "application/json", payload, 45000, headers);
            }
            catch (HttpTransportException exception)
            {
                throw new ApiException(0, "Serveur injoignable : " + exception.Message, null);
            }
        }

        private static ApiException Failure(HttpResult result, string fallback)
        {
            object payload = null;
            try { payload = Json.Parse(result.BodyText); } catch (Exception) { }
            var message = Json.Str(payload, "error");
            if (message.Length == 0) message = Json.Str(payload, "message");
            return new ApiException(result.StatusCode, message.Length == 0 ? fallback : message, payload);
        }
    }
}
