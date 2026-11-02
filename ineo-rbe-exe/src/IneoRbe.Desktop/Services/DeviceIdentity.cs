using System;
using System.Management;
using System.Text.RegularExpressions;

namespace IneoRbe.Desktop.Services
{
    // Extrait le numéro de série (SN) de l'ordinateur via WMI (disponible depuis Windows XP).
    public static class DeviceIdentity
    {
        private static readonly string[] Placeholders =
        {
            "TOBEFILLEDBYO.E.M.", "DEFAULTSTRING", "SYSTEMSERIALNUMBER", "NOTAVAILABLE", "NOTAPPLICABLE",
            "NONE", "UNKNOWN", "N/A", "NA", "123456789", "0123456789",
        };

        private static readonly string[][] Sources =
        {
            new[] { "Win32_BIOS", "SerialNumber" },
            new[] { "Win32_BaseBoard", "SerialNumber" },
            new[] { "Win32_ComputerSystemProduct", "IdentifyingNumber" },
        };

        public static string Normalize(string value)
        {
            return Regex.Replace(value ?? string.Empty, "\\s+", string.Empty).ToUpperInvariant();
        }

        // Mêmes règles que l'API : les numéros génériques des constructeurs ne distinguent pas deux ordinateurs.
        public static bool IsUsable(string serial)
        {
            return serial != null
                && Regex.IsMatch(serial, "^[A-Z0-9._\\-/]{4,64}$")
                && Array.IndexOf(Placeholders, serial) < 0
                && !Regex.IsMatch(serial, "^(.)\\1+$");
        }

        public static string ReadSerial()
        {
            foreach (var source in Sources)
            {
                var serial = Normalize(Query(source[0], source[1]));
                if (IsUsable(serial)) return serial;
            }
            return null;
        }

        private static string Query(string wmiClass, string property)
        {
            try
            {
                using (var searcher = new ManagementObjectSearcher("SELECT " + property + " FROM " + wmiClass))
                {
                    foreach (ManagementBaseObject item in searcher.Get())
                    {
                        var value = item[property];
                        if (value != null) return value.ToString();
                    }
                }
            }
            catch (Exception)
            {
                // Classe WMI indisponible sur ce poste : on essaie la source suivante.
            }
            return null;
        }
    }
}
