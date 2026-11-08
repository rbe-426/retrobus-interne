namespace IneoRbe.Maintenance
{
    // Résultat du chargement initial, transmis du splashscreen à la fenêtre principale.
    public sealed class StartupContext
    {
        public string Serial { get; set; }
        public bool ServerReachable { get; set; }
        public int CertificateCount { get; set; }
        public AuthResult Authorization { get; set; }
        public string UpdateNotice { get; set; }
    }
}
