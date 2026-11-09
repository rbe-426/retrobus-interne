using System;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace IneoRbe.Desktop.Services
{
    // Icône de l'application et cadre de fenêtre carbone RétroBus appliqués à toutes les fenêtres.
    public static class AppIcon
    {
        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

        // COLORREF = 0x00BBGGRR : #0F172A (carbone) et blanc.
        private const int Carbon = 0x2A170F;
        private const int White = 0xFFFFFF;

        public static void Install()
        {
            ImageSource icon = null;
            try { icon = BitmapFrame.Create(new Uri("pack://application:,,,/Assets/app.ico", UriKind.Absolute)); }
            catch (Exception) { }
            EventManager.RegisterClassHandler(typeof(Window), FrameworkElement.LoadedEvent, new RoutedEventHandler(delegate (object sender, RoutedEventArgs args)
            {
                var window = sender as Window;
                if (window == null) return;
                if (icon != null && window.Icon == null) window.Icon = icon;
                ApplyFrame(window);
            }));
        }

        // Windows 11 : barre de titre et bordure carbone. Windows 10 : barre sombre. Systèmes plus anciens : cadre inchangé (l'appel est ignoré).
        public static void ApplyFrame(Window window)
        {
            try
            {
                var handle = new WindowInteropHelper(window).Handle;
                if (handle == IntPtr.Zero) return;
                int on = 1;
                DwmSetWindowAttribute(handle, 20, ref on, 4);
                int caption = Carbon, border = Carbon, text = White;
                DwmSetWindowAttribute(handle, 35, ref caption, 4);
                DwmSetWindowAttribute(handle, 34, ref border, 4);
                DwmSetWindowAttribute(handle, 36, ref text, 4);
            }
            catch (Exception) { }
        }
    }
}
