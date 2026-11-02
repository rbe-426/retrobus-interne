using System;
using System.Globalization;

namespace IneoRbe.Desktop.Services
{
    // Lecture des phrases NMEA 0183 envoyées par un récepteur GPS (USB/série) : position issue de GGA ou RMC.
    public static class NmeaParser
    {
        // Retourne true si la phrase est une position valide (fix) ; latitude/longitude en degrés décimaux.
        public static bool TryParsePosition(string sentence, out double latitude, out double longitude)
        {
            latitude = 0;
            longitude = 0;
            if (!IsValid(sentence)) return false;

            var body = sentence.Trim().Substring(1);
            var star = body.IndexOf('*');
            if (star >= 0) body = body.Substring(0, star);
            var fields = body.Split(',');
            if (fields[0].Length < 5) return false;

            var type = fields[0].Substring(fields[0].Length - 3);
            if (type == "RMC")
            {
                // $GPRMC,hhmmss,A,ddmm.mmmm,N,dddmm.mmmm,E,...  (A = position valide, V = invalide)
                if (fields.Length < 7 || fields[2] != "A") return false;
                return ParseCoordinates(fields[3], fields[4], fields[5], fields[6], out latitude, out longitude);
            }
            if (type == "GGA")
            {
                // $GPGGA,hhmmss,ddmm.mmmm,N,dddmm.mmmm,E,qualité,...  (qualité 0 = pas de fix)
                int quality;
                if (fields.Length < 7 || !int.TryParse(fields[6], out quality) || quality <= 0) return false;
                return ParseCoordinates(fields[2], fields[3], fields[4], fields[5], out latitude, out longitude);
            }
            return false;
        }

        // Vrai pour toute phrase NMEA bien formée (début « $ » et somme de contrôle correcte si elle est présente).
        public static bool IsValid(string sentence)
        {
            if (string.IsNullOrEmpty(sentence)) return false;
            sentence = sentence.Trim();
            if (sentence.Length < 6 || sentence[0] != '$') return false;

            var star = sentence.IndexOf('*');
            if (star < 0) return true;
            if (star + 3 > sentence.Length) return false;

            var checksum = 0;
            for (var index = 1; index < star; index++) checksum ^= sentence[index];
            int expected;
            return int.TryParse(sentence.Substring(star + 1, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out expected) && expected == checksum;
        }

        private static bool ParseCoordinates(string latText, string latHemisphere, string lonText, string lonHemisphere, out double latitude, out double longitude)
        {
            latitude = 0;
            longitude = 0;
            double parsedLatitude, parsedLongitude;
            if (!ParseDegrees(latText, 2, out parsedLatitude) || !ParseDegrees(lonText, 3, out parsedLongitude)) return false;
            if (latHemisphere == "S") parsedLatitude = -parsedLatitude;
            else if (latHemisphere != "N") return false;
            if (lonHemisphere == "W") parsedLongitude = -parsedLongitude;
            else if (lonHemisphere != "E") return false;
            if (Math.Abs(parsedLatitude) > 90 || Math.Abs(parsedLongitude) > 180) return false;

            latitude = parsedLatitude;
            longitude = parsedLongitude;
            return true;
        }

        // « ddmm.mmmm » (ou « dddmm.mmmm ») -> degrés décimaux.
        private static bool ParseDegrees(string text, int degreeDigits, out double degrees)
        {
            degrees = 0;
            double minutes;
            int whole;
            if (string.IsNullOrEmpty(text) || text.Length <= degreeDigits + 1) return false;
            if (!int.TryParse(text.Substring(0, degreeDigits), NumberStyles.None, CultureInfo.InvariantCulture, out whole)) return false;
            if (!double.TryParse(text.Substring(degreeDigits), NumberStyles.Float, CultureInfo.InvariantCulture, out minutes) || minutes < 0 || minutes >= 60) return false;
            degrees = whole + minutes / 60.0;
            return true;
        }
    }
}
