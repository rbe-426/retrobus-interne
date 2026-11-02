namespace IneoRbe.Desktop.Services
{
    public sealed class UpdateDescriptor
    {
        public string Version { get; set; }
        public string InstallerUrl { get; set; }
        public string Sha256 { get; set; }
        public string ReleaseNotes { get; set; }
    }

    public sealed class UpdateCheckResult
    {
        public bool UpdateAvailable { get; set; }
        public UpdateDescriptor Update { get; set; }
    }
}
