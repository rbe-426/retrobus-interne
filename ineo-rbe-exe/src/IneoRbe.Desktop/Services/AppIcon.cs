using System;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace IneoRbe.Desktop.Services
{
    // Applique l'icône de l'application (Assets\app.ico, ressource WPF) à toutes les fenêtres sans icône.
    public static class AppIcon
    {
        public static void Install()
        {
            ImageSource icon;
            try { icon = BitmapFrame.Create(new Uri("pack://application:,,,/Assets/app.ico", UriKind.Absolute)); }
            catch (Exception) { return; }
            EventManager.RegisterClassHandler(typeof(Window), FrameworkElement.LoadedEvent, new RoutedEventHandler(delegate (object sender, RoutedEventArgs args)
            {
                var window = sender as Window;
                if (window != null && window.Icon == null) window.Icon = icon;
            }));
        }
    }
}
