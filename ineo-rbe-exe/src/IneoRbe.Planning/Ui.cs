using System;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;

namespace IneoRbe.Planning
{
    public static class Ui
    {
        public static readonly Brush Carbon = Brush("#0F172A");
        public static readonly Brush Red = Brush("#9F063A");
        public static readonly Brush Panel = Brush("#F1F5F9");
        public static readonly Brush Line = Brush("#CBD5E1");
        public static readonly Brush Muted = Brush("#64748B");

        public static Brush Brush(string hex)
        {
            var brush = (SolidColorBrush)new BrushConverter().ConvertFromString(hex);
            brush.Freeze();
            return brush;
        }

        // Exécute `work` hors du fil d'interface puis `done` (ou l'erreur) sur le fil d'interface.
        public static void Run<T>(Dispatcher dispatcher, Func<T> work, Action<T> done, Action<string> fail)
        {
            ThreadPool.QueueUserWorkItem(delegate
            {
                T result = default(T);
                string error = null;
                try { result = work(); }
                catch (Exception exception) { error = exception.Message; }
                dispatcher.BeginInvoke(new Action(() =>
                {
                    if (error != null) { if (fail != null) fail(error); else Error(error); }
                    else if (done != null) done(result);
                }));
            });
        }

        public static void Error(string message)
        {
            MessageBox.Show(message, "Inéo RétroBus Gestionnaire", MessageBoxButton.OK, MessageBoxImage.Warning);
        }

        public static bool Confirm(string message)
        {
            return MessageBox.Show(message, "Inéo RétroBus Gestionnaire", MessageBoxButton.OKCancel, MessageBoxImage.Question) == MessageBoxResult.OK;
        }

        public static Button Button(string text, RoutedEventHandler click, bool primary = false)
        {
            var button = new Button
            {
                Content = text,
                Padding = new Thickness(12, 4, 12, 4),
                Margin = new Thickness(0, 0, 6, 0),
                MinWidth = 70,
            };
            if (primary)
            {
                button.Background = Red;
                button.Foreground = Brushes.White;
                button.FontWeight = FontWeights.Bold;
            }
            if (click != null) button.Click += click;
            return button;
        }

        public static TextBlock Text(string text, double size = 12, bool bold = false, Brush foreground = null)
        {
            return new TextBlock
            {
                Text = text,
                FontSize = size,
                FontWeight = bold ? FontWeights.Bold : FontWeights.Normal,
                Foreground = foreground ?? Brushes.Black,
                TextWrapping = TextWrapping.Wrap,
            };
        }

        public static TextBlock Title(string text)
        {
            return Text(text, 18, true, Carbon);
        }

        public static WrapPanel Toolbar(params UIElement[] children)
        {
            var panel = new WrapPanel { Margin = new Thickness(0, 0, 0, 8) };
            foreach (var child in children) panel.Children.Add(child);
            return panel;
        }
    }
}
