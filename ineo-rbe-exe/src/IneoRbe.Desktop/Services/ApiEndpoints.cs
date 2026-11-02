using System;
using System.Net;
using System.Net.Http;

namespace IneoRbe.Desktop.Services
{
    public static class ApiEndpoints
    {
        private const string ProductionBaseUrl = "https://attractive-kindness-rbe-serveurs.up.railway.app/api/ineo-rbe-desktop";
        private static readonly string BaseUrl = ResolveBaseUrl();

        static ApiEndpoints()
        {
            // Windows 7 n'active pas TLS 1.2 par défaut, alors que Railway et GitHub l'exigent.
            ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
        }

        public static string UpdateUrl { get { return BaseUrl + "/update"; } }
        public static string IdentifyUrl { get { return BaseUrl + "/identify"; } }
        public static string SyncUrl { get { return BaseUrl + "/sync"; } }

        public static string MediaUrl(string mediaId)
        {
            return BaseUrl + "/media/" + Uri.EscapeDataString(mediaId);
        }

        // Test en développement : INEO_RBE_API_BASE peut pointer vers un serveur local (http://localhost... ou http://127.0.0.1...),
        // jamais vers une adresse distante.
        private static string ResolveBaseUrl()
        {
            var overrideUrl = (Environment.GetEnvironmentVariable("INEO_RBE_API_BASE") ?? string.Empty).Trim().TrimEnd('/');
            Uri uri;
            if (Uri.TryCreate(overrideUrl, UriKind.Absolute, out uri) && uri.Scheme == Uri.UriSchemeHttp && uri.IsLoopback) return overrideUrl;
            return ProductionBaseUrl;
        }

        public static HttpClient CreateHttpClient()
        {
            var client = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
            client.DefaultRequestHeaders.UserAgent.ParseAdd("IneoRbeDesktop/1.0");
            return client;
        }
    }
}
