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
        }

        public static object Get(string path) { return Call("GET", path, null); }
        public static object Post(string path, object body) { return Call("POST", path, body); }
        public static object Put(string path, object body) { return Call("PUT", path, body); }
        public static object Patch(string path, object body) { return Call("PATCH", path, body); }
        public static object Delete(string path) { return Call("DELETE", path, null); }

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
