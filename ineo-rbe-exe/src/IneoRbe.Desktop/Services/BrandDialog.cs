using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace IneoRbe.Desktop.Services
{
    // Messages et confirmations : fenêtre simple dont le cadre est aux couleurs RétroBus (voir AppIcon).
    public static class BrandDialog
    {
        private static readonly Brush Carbon = Freeze("#0F172A");
        private static readonly Brush Red = Freeze("#9F063A");

        private static Brush Freeze(string hex)
        {
            var brush = (SolidColorBrush)new BrushConverter().ConvertFromString(hex);
            brush.Freeze();
            return brush;
        }

        public static bool Show(Window owner, string title, string message, bool confirm)
        {
            var window = new Window
            {
                Title = title, SizeToContent = SizeToContent.WidthAndHeight, MinWidth = 380, MaxWidth = 560,
                ResizeMode = ResizeMode.NoResize, ShowInTaskbar = false,
                WindowStartupLocation = owner != null ? WindowStartupLocation.CenterOwner : WindowStartupLocation.CenterScreen,
                FontFamily = new FontFamily("Tahoma"),
            };
            if (owner != null && owner.IsVisible) window.Owner = owner;
            var result = false;
            var ok = MakeButton("OK", true);
            ok.IsDefault = true;
            ok.Click += (s, e) => { result = true; window.Close(); };
            var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 16, 0, 0) };
            buttons.Children.Add(ok);
            if (confirm)
            {
                var cancel = MakeButton("Annuler", false);
                cancel.IsCancel = true;
                cancel.Click += (s, e) => { window.Close(); };
                buttons.Children.Add(cancel);
            }
            else ok.IsCancel = true;
            var body = new StackPanel { Margin = new Thickness(20) };
            body.Children.Add(new TextBlock { Text = message, TextWrapping = TextWrapping.Wrap });
            body.Children.Add(buttons);
            window.Content = body;
            window.ShowDialog();
            return result;
        }

        private static Button MakeButton(string text, bool primary)
        {
            var button = new Button { Content = text, Padding = new Thickness(14, 4, 14, 4), MinWidth = 80, Margin = new Thickness(6, 0, 0, 0) };
            if (primary) { button.Background = Red; button.Foreground = Brushes.White; }
            return button;
        }

        public static Window ActiveWindow()
        {
            if (Application.Current == null) return null;
            foreach (Window window in Application.Current.Windows) if (window.IsActive) return window;
            return Application.Current.MainWindow;
        }
    }
}
