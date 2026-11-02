using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using Org.BouncyCastle.Crypto.Tls;
using Org.BouncyCastle.Security;

namespace IneoRbe.Desktop.Services
{
    public sealed class HttpTransportException : Exception
    {
        public HttpTransportException(string message) : base(message) { }
        public HttpTransportException(string message, Exception inner) : base(message, inner) { }
    }

    public sealed class HttpResult
    {
        public int StatusCode { get; set; }
        public byte[] Body { get; set; }
        public string BodyText { get { return Body == null ? string.Empty : Encoding.UTF8.GetString(Body); } }
        public bool IsSuccess { get { return StatusCode >= 200 && StatusCode < 300; } }
    }

    // Client HTTP(S) sans HttpClient/async (absents de .NET 4.0).
    // - Windows 7+ avec .NET 4.5+ : HttpWebRequest natif en TLS 1.2.
    // - Windows XP/Vista, ou .NET 4.0 seul : le système ne sait pas faire de TLS 1.2, on utilise le client TLS embarqué (BouncyCastle),
    //   limité aux serveurs RétroBus (ApiEndpoints.TrustedHosts).
    public static class HttpTransport
    {
        private const int Tls12 = 3072;
        private const int MaxRedirects = 3;
        private const int MaxTextBytes = 5 * 1024 * 1024;
        private static readonly bool NativeTlsSupported = DetectNativeTls();
        private static volatile bool _forceEmbedded;

        public static bool UsesEmbeddedTls { get { return _forceEmbedded || !NativeTlsSupported; } }

        public static HttpResult Send(string method, string url, string contentType, byte[] body, int timeoutMs)
        {
            using (var sink = new MemoryStream())
            {
                var status = Execute(method, url, contentType, body, timeoutMs, sink, MaxTextBytes);
                return new HttpResult { StatusCode = status, Body = sink.ToArray() };
            }
        }

        // Télécharge dans un fichier (écriture atomique) ; retourne le code HTTP. Le fichier n'existe que si le code est 200.
        public static int DownloadToFile(string url, string destination, long maxBytes, int timeoutMs)
        {
            var temporary = destination + ".part";
            try
            {
                int status;
                using (var output = new FileStream(temporary, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    status = Execute("GET", url, null, null, timeoutMs, output, maxBytes);
                }
                if (status != 200)
                {
                    File.Delete(temporary);
                    return status;
                }
                if (File.Exists(destination)) File.Delete(destination);
                File.Move(temporary, destination);
                return status;
            }
            catch
            {
                try { if (File.Exists(temporary)) File.Delete(temporary); } catch (Exception) { }
                throw;
            }
        }

        private static int Execute(string method, string url, string contentType, byte[] body, int timeoutMs, Stream sink, long maxBytes)
        {
            var uri = new Uri(url);
            if (uri.Scheme == Uri.UriSchemeHttps && UsesEmbeddedTls) return ExecuteEmbedded(uri, method, contentType, body, timeoutMs, sink, maxBytes, 0);

            var mark = sink.CanSeek ? sink.Position : 0;
            try
            {
                return ExecuteNative(uri, method, contentType, body, timeoutMs, sink, maxBytes);
            }
            catch (WebException exception)
            {
                // Le système refuse la négociation TLS (ancien Windows) : on bascule définitivement sur le client embarqué.
                if (uri.Scheme != Uri.UriSchemeHttps || exception.Status != WebExceptionStatus.SecureChannelFailure || !ApiEndpoints.IsTrustedHost(uri.Host)) throw;
                _forceEmbedded = true;
                if (sink.CanSeek) { sink.SetLength(mark); sink.Position = mark; }
                return ExecuteEmbedded(uri, method, contentType, body, timeoutMs, sink, maxBytes, 0);
            }
        }

        private static bool DetectNativeTls()
        {
            // .NET 4.5+ (révision 17000 et plus) sait demander TLS 1.2 à Windows ; .NET 4.0 non.
            if (Environment.Version.Revision < 17000) return false;
            try
            {
                ServicePointManager.SecurityProtocol |= (SecurityProtocolType)Tls12;
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        private static int ExecuteNative(Uri uri, string method, string contentType, byte[] body, int timeoutMs, Stream sink, long maxBytes)
        {
            var request = (HttpWebRequest)WebRequest.Create(uri);
            request.Method = method;
            request.UserAgent = ApiEndpoints.UserAgent;
            request.Timeout = timeoutMs;
            request.ReadWriteTimeout = timeoutMs;
            request.AllowAutoRedirect = true;
            if (body != null)
            {
                request.ContentType = contentType;
                request.ContentLength = body.Length;
                using (var stream = request.GetRequestStream()) stream.Write(body, 0, body.Length);
            }

            HttpWebResponse response;
            try
            {
                response = (HttpWebResponse)request.GetResponse();
            }
            catch (WebException exception)
            {
                if (exception.Response == null) throw;
                response = (HttpWebResponse)exception.Response;
            }
            using (response)
            using (var input = response.GetResponseStream())
            {
                CopyLimited(input, sink, maxBytes);
                return (int)response.StatusCode;
            }
        }

        private static int ExecuteEmbedded(Uri uri, string method, string contentType, byte[] body, int timeoutMs, Stream sink, long maxBytes, int redirects)
        {
            if (!ApiEndpoints.IsTrustedHost(uri.Host))
            {
                throw new HttpTransportException("Ce système ne gère pas TLS 1.2 : seuls les serveurs RétroBus sont joignables (" + uri.Host + " refusé).");
            }

            using (var tcp = new TcpClient())
            {
                var connect = tcp.BeginConnect(uri.Host, uri.Port, null, null);
                if (!connect.AsyncWaitHandle.WaitOne(timeoutMs)) throw new HttpTransportException("Le serveur ne répond pas (délai dépassé).");
                tcp.EndConnect(connect);
                tcp.ReceiveTimeout = timeoutMs;
                tcp.SendTimeout = timeoutMs;

                var protocol = new TlsClientProtocol(tcp.GetStream(), new SecureRandom());
                var client = new PinnedTlsClient(uri.Host);
                try
                {
                    protocol.Connect(client);
                }
                catch (Exception exception)
                {
                    if (client.CertificateFailure != null) throw new HttpTransportException(client.CertificateFailure, exception);
                    throw new HttpTransportException("Connexion sécurisée impossible : " + exception.Message, exception);
                }

                try
                {
                    var stream = protocol.Stream;
                    WriteRequest(stream, uri, method, contentType, body);
                    return ReadResponse(stream, uri, method, contentType, body, timeoutMs, sink, maxBytes, redirects);
                }
                finally
                {
                    try { protocol.Close(); } catch (Exception) { }
                }
            }
        }

        private static void WriteRequest(Stream stream, Uri uri, string method, string contentType, byte[] body)
        {
            var header = new StringBuilder();
            header.Append(method).Append(' ').Append(uri.PathAndQuery).Append(" HTTP/1.1\r\n");
            header.Append("Host: ").Append(uri.IsDefaultPort ? uri.Host : uri.Host + ":" + uri.Port).Append("\r\n");
            header.Append("User-Agent: ").Append(ApiEndpoints.UserAgent).Append("\r\n");
            header.Append("Accept: */*\r\nConnection: close\r\n");
            if (body != null) header.Append("Content-Type: ").Append(contentType).Append("\r\nContent-Length: ").Append(body.Length).Append("\r\n");
            header.Append("\r\n");

            var head = Encoding.ASCII.GetBytes(header.ToString());
            var all = new byte[head.Length + (body == null ? 0 : body.Length)];
            Buffer.BlockCopy(head, 0, all, 0, head.Length);
            if (body != null) Buffer.BlockCopy(body, 0, all, head.Length, body.Length);
            stream.Write(all, 0, all.Length);
            stream.Flush();
        }

        private static int ReadResponse(Stream stream, Uri uri, string method, string contentType, byte[] body, int timeoutMs, Stream sink, long maxBytes, int redirects)
        {
            var statusLine = ReadLine(stream);
            var parts = (statusLine ?? string.Empty).Split(' ');
            int status;
            if (parts.Length < 2 || !int.TryParse(parts[1], out status)) throw new HttpTransportException("Réponse du serveur illisible.");

            var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            string line;
            while (!string.IsNullOrEmpty(line = ReadLine(stream)))
            {
                var separator = line.IndexOf(':');
                if (separator > 0) headers[line.Substring(0, separator).Trim()] = line.Substring(separator + 1).Trim();
            }

            string location;
            if ((status == 301 || status == 302 || status == 307 || status == 308) && method == "GET" && headers.TryGetValue("Location", out location))
            {
                Uri target;
                if (redirects >= MaxRedirects || !Uri.TryCreate(uri, location, out target) || target.Scheme != Uri.UriSchemeHttps)
                {
                    throw new HttpTransportException("Redirection refusée par le serveur.");
                }
                return ExecuteEmbedded(target, method, contentType, body, timeoutMs, sink, maxBytes, redirects + 1);
            }

            string value;
            if (method == "HEAD" || status == 204 || status == 304) return status;
            if (headers.TryGetValue("Transfer-Encoding", out value) && value.IndexOf("chunked", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                ReadChunked(stream, sink, maxBytes);
            }
            else if (headers.TryGetValue("Content-Length", out value))
            {
                long length;
                if (!long.TryParse(value, out length) || length < 0) throw new HttpTransportException("Réponse du serveur invalide.");
                if (length > maxBytes) throw new HttpTransportException("La réponse du serveur est trop volumineuse.");
                CopyExactly(stream, sink, length);
            }
            else
            {
                CopyToEnd(stream, sink, maxBytes);
            }
            return status;
        }

        private static string ReadLine(Stream stream)
        {
            var bytes = new List<byte>();
            while (true)
            {
                var value = stream.ReadByte();
                if (value < 0) break;
                if (value == '\n') break;
                if (value != '\r') bytes.Add((byte)value);
                if (bytes.Count > 16384) throw new HttpTransportException("En-tête de réponse trop long.");
            }
            return Encoding.ASCII.GetString(bytes.ToArray());
        }

        private static void ReadChunked(Stream stream, Stream sink, long maxBytes)
        {
            long total = 0;
            while (true)
            {
                var sizeLine = ReadLine(stream);
                var semicolon = sizeLine.IndexOf(';');
                if (semicolon >= 0) sizeLine = sizeLine.Substring(0, semicolon);
                long size;
                if (!long.TryParse(sizeLine.Trim(), System.Globalization.NumberStyles.HexNumber, null, out size) || size < 0)
                {
                    throw new HttpTransportException("Réponse du serveur invalide.");
                }
                if (size == 0) break;
                total += size;
                if (total > maxBytes) throw new HttpTransportException("La réponse du serveur est trop volumineuse.");
                CopyExactly(stream, sink, size);
                ReadLine(stream);
            }
            while (!string.IsNullOrEmpty(ReadLine(stream))) { }
        }

        private static void CopyExactly(Stream input, Stream output, long length)
        {
            var buffer = new byte[16384];
            while (length > 0)
            {
                var read = input.Read(buffer, 0, (int)Math.Min(buffer.Length, length));
                if (read <= 0) throw new HttpTransportException("Réponse du serveur tronquée.");
                output.Write(buffer, 0, read);
                length -= read;
            }
        }

        private static void CopyToEnd(Stream input, Stream output, long maxBytes)
        {
            var buffer = new byte[16384];
            long total = 0;
            while (true)
            {
                int read;
                try
                {
                    read = input.Read(buffer, 0, buffer.Length);
                }
                catch (TlsNoCloseNotifyException)
                {
                    break;
                }
                if (read <= 0) break;
                total += read;
                if (total > maxBytes) throw new HttpTransportException("La réponse du serveur est trop volumineuse.");
                output.Write(buffer, 0, read);
            }
        }

        private static void CopyLimited(Stream input, Stream output, long maxBytes)
        {
            var buffer = new byte[16384];
            long total = 0;
            int read;
            while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
            {
                total += read;
                if (total > maxBytes) throw new HttpTransportException("La réponse du serveur est trop volumineuse.");
                output.Write(buffer, 0, read);
            }
        }
    }
}
