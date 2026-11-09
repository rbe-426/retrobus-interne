using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace IneoRbe.Desktop.Services
{
    // Fenêtres contextuelles aux couleurs RétroBus : bandeau carbone avec logo et titre.
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

        public static UIElement Header(string title)
        {
            var row = new StackPanel { Orientation = Orientation.Horizontal };
            try
            {
                row.Children.Add(new Image { Source = BitmapFrame.Create(new Uri("pack://application:,,,/Assets/logo.png", UriKind.Absolute)), Height = 28, Margin = new Thickness(0, 0, 12, 0) });
            }
            catch (Exception) { }
            row.Children.Add(new TextBlock { Text = title, Foreground = Brushes.White, FontWeight = FontWeights.SemiBold, FontSize = 14, VerticalAlignment = VerticalAlignment.Center });
            return new Border { Background = Carbon, Padding = new Thickness(14, 10, 14, 10), Child = row };
        }

        // Habille le contenu d'une fenêtre contextuelle avec le bandeau carbone.
        public static UIElement Wrap(UIElement body, string title)
        {
            var stack = new StackPanel();
            stack.Children.Add(Header(title));
            stack.Children.Add(body);
            return stack;
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
            window.Content = Wrap(body, title);
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
