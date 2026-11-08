using System;

namespace IneoRbe.Desktop.Services
{
    // Numéro de version publié : ANNEE.MOIS.REVISION (ex. 26.11.001). L'assembly porte 26.11.1.0 (les composants sont numériques).
    public static class ReleaseVersion
    {
        public static string Format(Version version)
        {
            return string.Format("{0}.{1:00}.{2:000}", version.Major, version.Minor, Math.Max(0, version.Build));
        }
    }
}
