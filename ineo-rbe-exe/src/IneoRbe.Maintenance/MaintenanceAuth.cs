using System;
using System.Runtime.Serialization;
using System.Text;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Maintenance
{
    public enum AuthState
    {
        Allowed,
        Denied,
        // Serveur injoignable : le poste démarre quand même (liaison UC locale), sans fonctions serveur.
        Offline,
    }

    public sealed class AuthResult
    {
        public AuthState State { get; set; }
        public string Message { get; set; }
        public string PcName { get; set; }
    }

    [DataContract]
    internal sealed class AuthRequest
    {
        [DataMember(Name = "serial")] public string Serial { get; set; }
        [DataMember(Name = "hostname")] public string Hostname { get; set; }
        [DataMember(Name = "version")] public string Version { get; set; }
    }

    [DataContract]
    internal sealed class AuthResponse
    {
        [DataMember(Name = "allowed")] public bool Allowed { get; set; }
        [DataMember(Name = "name")] public string Name { get; set; }
        [DataMember(Name = "error")] public string Error { get; set; }
    }

    // Vérifie auprès du serveur que ce PC (numéro de série) est enregistré dans l'URBEX > Ordinateurs Maintenance.
    public static class MaintenanceAuth
    {
        public static AuthResult Check(string serial, string version)
        {
            if (string.IsNullOrEmpty(serial))
            {
                return new AuthResult { State = AuthState.Denied, Message = "Le numéro de série de ce PC est illisible ou générique (valeur par défaut du constructeur) : il ne peut pas être enregistré." };
            }

            HttpResult response;
            try
            {
                var body = Encoding.UTF8.GetBytes(MaintenanceProtocol.ToJson(new AuthRequest { Serial = serial, Hostname = Environment.MachineName, Version = version }));
                response = HttpTransport.Send("POST", ApiEndpoints.MaintenanceCheckUrl, "application/json", body, 10000);
            }
            catch (Exception exception)
            {
                return new AuthResult { State = AuthState.Offline, Message = "Serveur RétroBus injoignable : " + exception.Message };
            }

            AuthResponse payload = null;
            try { payload = MaintenanceProtocol.FromJson<AuthResponse>(response.BodyText); } catch (Exception) { }

            if (response.IsSuccess && payload != null && payload.Allowed)
            {
                return new AuthResult { State = AuthState.Allowed, PcName = payload.Name };
            }
            if (response.StatusCode == 400 || response.StatusCode == 403)
            {
                return new AuthResult { State = AuthState.Denied, Message = payload != null && !string.IsNullOrEmpty(payload.Error) ? payload.Error : "Ce PC n'est pas autorisé." };
            }
            return new AuthResult { State = AuthState.Offline, Message = "Le serveur a répondu " + response.StatusCode + "." };
        }
    }
}
