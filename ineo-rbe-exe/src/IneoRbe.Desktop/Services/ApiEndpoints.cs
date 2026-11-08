using System;
using System.Linq;

namespace IneoRbe.Desktop.Services
{
    public static class ApiEndpoints
    {
        private const string ProductionBaseUrl = "https://attractive-kindness-rbe-serveurs.up.railway.app/api/ineo-rbe-desktop";
        private static readonly string BaseUrl = ResolveBaseUrl();
        private static readonly string[] Hosts = { new Uri(ProductionBaseUrl).Host };

        public const string UserAgent = "IneoRbeDesktop/1.0";

        // Racine de l'API RétroBus (…/api), utilisée par l'application Planification.
        public static string ApiRoot { get { return BaseUrl.Substring(0, BaseUrl.LastIndexOf("/ineo-rbe-desktop", StringComparison.Ordinal)); } }
        public static string UpdateUrl { get { return BaseUrl + "/update"; } }
        public static string IdentifyUrl { get { return BaseUrl + "/identify"; } }
        public static string SyncUrl { get { return BaseUrl + "/sync"; } }
        public static string MaintenanceCheckUrl { get { return BaseUrl + "/maintenance/check"; } }

        public static string MediaUrl(string mediaId)
        {
            return BaseUrl + "/media/" + Uri.EscapeDataString(mediaId);
        }

        // Serveurs joignables par le client TLS embarqué (anciens Windows) : uniquement l'API RétroBus.
        public static bool IsTrustedHost(string host)
        {
            return Hosts.Any(item => string.Equals(item, host, StringComparison.OrdinalIgnoreCase));
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
    }
}
