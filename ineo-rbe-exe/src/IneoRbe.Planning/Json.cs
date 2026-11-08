using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace IneoRbe.Planning
{
    // JSON minimal : objets = Dictionary<string, object>, tableaux = List<object>, nombres = double.
    public static class Json
    {
        public static object Parse(string text)
        {
            if (string.IsNullOrEmpty(text)) return null;
            var position = 0;
            return ReadValue(text, ref position);
        }

        public static string Write(object value)
        {
            var builder = new StringBuilder();
            WriteValue(builder, value);
            return builder.ToString();
        }

        public static Dictionary<string, object> Obj(object value) { return value as Dictionary<string, object>; }

        public static List<object> Arr(object value) { return value as List<object> ?? new List<object>(); }

        public static object Get(object source, string path)
        {
            var current = source;
            foreach (var part in path.Split('.'))
            {
                var dictionary = current as Dictionary<string, object>;
                if (dictionary == null || !dictionary.TryGetValue(part, out current)) return null;
            }
            return current;
        }

        public static string Str(object source, string path)
        {
            var value = Get(source, path);
            if (value == null) return string.Empty;
            if (value is bool) return (bool)value ? "true" : "false";
            if (value is double) return ((double)value).ToString("0.######", CultureInfo.InvariantCulture);
            return value.ToString();
        }

        public static bool Bool(object source, string path)
        {
            var value = Get(source, path);
            return value is bool && (bool)value;
        }

        public static double? Num(object source, string path)
        {
            var value = Get(source, path);
            if (value is double) return (double)value;
            double parsed;
            if (value is string && double.TryParse((string)value, NumberStyles.Float, CultureInfo.InvariantCulture, out parsed)) return parsed;
            return null;
        }

        public static List<object> List(object source, string path) { return Arr(Get(source, path)); }

        private static void SkipSpace(string text, ref int position)
        {
            while (position < text.Length && char.IsWhiteSpace(text[position])) position++;
        }

        private static object ReadValue(string text, ref int position)
        {
            SkipSpace(text, ref position);
            if (position >= text.Length) throw new FormatException("JSON incomplet");
            var c = text[position];
            if (c == '{')
            {
                position++;
                var map = new Dictionary<string, object>();
                SkipSpace(text, ref position);
                if (text[position] == '}') { position++; return map; }
                while (true)
                {
                    SkipSpace(text, ref position);
                    var key = ReadString(text, ref position);
                    SkipSpace(text, ref position);
                    if (text[position] != ':') throw new FormatException("JSON : ':' attendu");
                    position++;
                    map[key] = ReadValue(text, ref position);
                    SkipSpace(text, ref position);
                    if (text[position] == ',') { position++; continue; }
                    if (text[position] == '}') { position++; return map; }
                    throw new FormatException("JSON : ',' ou '}' attendu");
                }
            }
            if (c == '[')
            {
                position++;
                var list = new List<object>();
                SkipSpace(text, ref position);
                if (text[position] == ']') { position++; return list; }
                while (true)
                {
                    list.Add(ReadValue(text, ref position));
                    SkipSpace(text, ref position);
                    if (text[position] == ',') { position++; continue; }
                    if (text[position] == ']') { position++; return list; }
                    throw new FormatException("JSON : ',' ou ']' attendu");
                }
            }
            if (c == '"') return ReadString(text, ref position);
            if (string.CompareOrdinal(text, position, "true", 0, 4) == 0) { position += 4; return true; }
            if (string.CompareOrdinal(text, position, "false", 0, 5) == 0) { position += 5; return false; }
            if (string.CompareOrdinal(text, position, "null", 0, 4) == 0) { position += 4; return null; }
            var start = position;
            while (position < text.Length && "+-0123456789.eE".IndexOf(text[position]) >= 0) position++;
            if (start == position) throw new FormatException("JSON : valeur inattendue");
            return double.Parse(text.Substring(start, position - start), NumberStyles.Float, CultureInfo.InvariantCulture);
        }

        private static string ReadString(string text, ref int position)
        {
            if (text[position] != '"') throw new FormatException("JSON : chaîne attendue");
            position++;
            var builder = new StringBuilder();
            while (position < text.Length)
            {
                var c = text[position++];
                if (c == '"') return builder.ToString();
                if (c != '\\') { builder.Append(c); continue; }
                var e = text[position++];
                switch (e)
                {
                    case 'n': builder.Append('\n'); break;
                    case 'r': builder.Append('\r'); break;
                    case 't': builder.Append('\t'); break;
                    case 'b': builder.Append('\b'); break;
                    case 'f': builder.Append('\f'); break;
                    case 'u':
                        builder.Append((char)int.Parse(text.Substring(position, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture));
                        position += 4;
                        break;
                    default: builder.Append(e); break;
                }
            }
            throw new FormatException("JSON : chaîne non terminée");
        }

        private static void WriteValue(StringBuilder builder, object value)
        {
            if (value == null) { builder.Append("null"); return; }
            if (value is string) { WriteString(builder, (string)value); return; }
            if (value is bool) { builder.Append((bool)value ? "true" : "false"); return; }
            if (value is double) { builder.Append(((double)value).ToString("R", CultureInfo.InvariantCulture)); return; }
            if (value is int || value is long) { builder.Append(Convert.ToString(value, CultureInfo.InvariantCulture)); return; }
            var map = value as IDictionary;
            if (map != null)
            {
                builder.Append('{');
                var first = true;
                foreach (DictionaryEntry entry in map)
                {
                    if (!first) builder.Append(',');
                    first = false;
                    WriteString(builder, Convert.ToString(entry.Key, CultureInfo.InvariantCulture));
                    builder.Append(':');
                    WriteValue(builder, entry.Value);
                }
                builder.Append('}');
                return;
            }
            var sequence = value as IEnumerable;
            if (sequence != null)
            {
                builder.Append('[');
                var first = true;
                foreach (var item in sequence)
                {
                    if (!first) builder.Append(',');
                    first = false;
                    WriteValue(builder, item);
                }
                builder.Append(']');
                return;
            }
            WriteString(builder, Convert.ToString(value, CultureInfo.InvariantCulture));
        }

        private static void WriteString(StringBuilder builder, string text)
        {
            builder.Append('"');
            foreach (var c in text)
            {
                switch (c)
                {
                    case '"': builder.Append("\\\""); break;
                    case '\\': builder.Append("\\\\"); break;
                    case '\n': builder.Append("\\n"); break;
                    case '\r': builder.Append("\\r"); break;
                    case '\t': builder.Append("\\t"); break;
                    default:
                        if (c < 0x20) builder.Append("\\u").Append(((int)c).ToString("x4"));
                        else builder.Append(c);
                        break;
                }
            }
            builder.Append('"');
        }
    }
}
