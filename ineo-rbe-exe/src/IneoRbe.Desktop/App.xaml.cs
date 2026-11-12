using System;
using System.Windows;

namespace IneoRbe.Desktop
{
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);
            Services.AppIcon.Install();

            // Mode « relanceur » : processus sans fenêtre lancé avant une mise à jour (voir UpdateInstaller).
            if (e.Args.Length > 0 && string.Equals(e.Args[0], "/watch", StringComparison.OrdinalIgnoreCase))
            {
                Services.UpdateInstaller.RunRelaunchWatcher(e.Args);
                Shutdown();
                return;
            }

            var splash = new SplashWindow();
            splash.Completed += (s, a) =>
            {
                var main = new MainWindow();
                MainWindow = main;
                main.Show();
                splash.Close();
            };
            splash.Show();
        }
    }
}
