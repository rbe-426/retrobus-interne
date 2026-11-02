using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Org.BouncyCastle.Asn1.X509;
using Org.BouncyCastle.Crypto.Tls;
using Org.BouncyCastle.X509;

namespace IneoRbe.Desktop.Services
{
    // Racines de confiance embarquées (Windows XP n'a pas les autorités récentes, ni la prise en charge des certificats ECDSA).
    internal static class TrustedRoots
    {
        private static IList<X509Certificate> _roots;

        public static IList<X509Certificate> Load()
        {
            if (_roots != null) return _roots;
            var roots = new List<X509Certificate>();
            var assembly = Assembly.GetExecutingAssembly();
            foreach (var name in assembly.GetManifestResourceNames().Where(item => item.StartsWith("certs.", StringComparison.Ordinal)))
            {
                using (var stream = assembly.GetManifestResourceStream(name))
                {
                    roots.Add(new X509CertificateParser().ReadCertificate(stream));
                }
            }
            _roots = roots;
            return roots;
        }
    }

    // Validation de la chaîne de certificats du serveur avec BouncyCastle : nom d'hôte, dates, signatures, racine embarquée.
    // La révocation (CRL/OCSP) n'est pas vérifiée : l'ancien Windows ne sait pas la gérer avec ces certificats.
    internal static class CertificateValidator
    {
        private const string ServerAuthOid = "1.3.6.1.5.5.7.3.1";
        private const int MaxChainDepth = 8;

        // Retourne null si la chaîne est valide, sinon un message d'erreur destiné à l'utilisateur.
        public static string Validate(string host, X509CertificateStructure[] chain, DateTime nowUtc, IList<X509Certificate> roots)
        {
            if (chain == null || chain.Length == 0) return "Le serveur n'a présenté aucun certificat.";
            var certificates = chain.Select(item => new X509Certificate(item)).ToList();
            var leaf = certificates[0];

            if (!HostMatches(leaf, host)) return "Le certificat du serveur ne correspond pas à l'adresse " + host + ".";

            var usages = leaf.GetExtendedKeyUsage();
            if (usages != null && !usages.Cast<object>().Any(item => string.Equals(Convert.ToString(item), ServerAuthOid, StringComparison.Ordinal)))
            {
                return "Le certificat du serveur n'est pas destiné à l'authentification d'un serveur.";
            }

            foreach (var certificate in certificates)
            {
                if (!certificate.IsValid(nowUtc))
                {
                    return "Un certificat du serveur est expiré ou pas encore valide : vérifiez la date et l'heure de ce PC.";
                }
            }

            var current = leaf;
            for (var depth = 0; depth < MaxChainDepth; depth++)
            {
                if (roots.Any(root => root.Equals(current))) return null;

                foreach (var root in roots)
                {
                    if (root.IsValid(nowUtc) && root.SubjectDN.Equivalent(current.IssuerDN) && IsSignedBy(current, root)) return null;
                }

                var next = certificates.FirstOrDefault(candidate => !ReferenceEquals(candidate, current)
                    && candidate.GetBasicConstraints() >= 0
                    && candidate.SubjectDN.Equivalent(current.IssuerDN)
                    && IsSignedBy(current, candidate));
                if (next == null) break;
                current = next;
            }
            return "La chaîne de certificats du serveur n'est pas reconnue (autorité non embarquée dans ce logiciel).";
        }

        private static bool IsSignedBy(X509Certificate certificate, X509Certificate issuer)
        {
            try
            {
                certificate.Verify(issuer.GetPublicKey());
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public static bool HostMatches(X509Certificate leaf, string host)
        {
            var names = new List<string>();
            var alternatives = leaf.GetSubjectAlternativeNames();
            if (alternatives != null)
            {
                foreach (var entry in alternatives)
                {
                    var item = entry as IList;
                    // Type 2 = dNSName.
                    if (item != null && item.Count >= 2 && Convert.ToInt32(item[0]) == 2) names.Add(Convert.ToString(item[1]));
                }
            }
            return names.Any(name => MatchesName(name, host));
        }

        public static bool MatchesName(string pattern, string host)
        {
            if (string.IsNullOrEmpty(pattern) || string.IsNullOrEmpty(host)) return false;
            pattern = pattern.ToLowerInvariant();
            host = host.ToLowerInvariant();
            if (!pattern.StartsWith("*.", StringComparison.Ordinal)) return pattern == host;

            // Le joker ne remplace qu'une seule étiquette : *.up.railway.app couvre a.up.railway.app, pas a.b.up.railway.app.
            var suffix = pattern.Substring(1);
            if (!host.EndsWith(suffix, StringComparison.Ordinal)) return false;
            var label = host.Substring(0, host.Length - suffix.Length);
            return label.Length > 0 && label.IndexOf('.') < 0;
        }
    }

    internal sealed class PinnedTlsAuthentication : TlsAuthentication
    {
        private readonly PinnedTlsClient _client;

        public PinnedTlsAuthentication(PinnedTlsClient client)
        {
            _client = client;
        }

        public void NotifyServerCertificate(Certificate serverCertificate)
        {
            var failure = CertificateValidator.Validate(_client.Host, serverCertificate.GetCertificateList(), DateTime.UtcNow, TrustedRoots.Load());
            if (failure != null)
            {
                _client.CertificateFailure = failure;
                throw new TlsFatalAlert(AlertDescription.bad_certificate);
            }
        }

        public TlsCredentials GetClientCredentials(CertificateRequest certificateRequest)
        {
            return null;
        }
    }

    // Client TLS 1.2 minimal : ECDHE avec AES-GCM/CBC, SNI, certificat du serveur validé par CertificateValidator.
    internal sealed class PinnedTlsClient : DefaultTlsClient
    {
        public PinnedTlsClient(string host)
        {
            Host = host;
        }

        public string Host { get; private set; }
        public string CertificateFailure { get; set; }

        public override ProtocolVersion MinimumVersion { get { return ProtocolVersion.TLSv12; } }
        public override ProtocolVersion ClientVersion { get { return ProtocolVersion.TLSv12; } }

        public override int[] GetCipherSuites()
        {
            return new[]
            {
                CipherSuite.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
                CipherSuite.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
                CipherSuite.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
                CipherSuite.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
                CipherSuite.TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA384,
                CipherSuite.TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256,
                CipherSuite.TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384,
                CipherSuite.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256,
                CipherSuite.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA,
                CipherSuite.TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA,
                CipherSuite.TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA,
                CipherSuite.TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA,
            };
        }

        public override IDictionary GetClientExtensions()
        {
            var extensions = base.GetClientExtensions() ?? new Hashtable();
            var names = new ArrayList { new ServerName(NameType.host_name, Host) };
            TlsExtensionsUtilities.AddServerNameExtension(extensions, new ServerNameList(names));
            return extensions;
        }

        public override TlsAuthentication GetAuthentication()
        {
            return new PinnedTlsAuthentication(this);
        }
    }
}
