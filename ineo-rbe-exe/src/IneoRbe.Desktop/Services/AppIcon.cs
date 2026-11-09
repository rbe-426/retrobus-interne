using System;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace IneoRbe.Desktop.Services
{
    // Icône de l'application et cadre de fenêtre carbone RétroBus appliqués à toutes les fenêtres.
    // Windows 11 : barre de titre et bordure natives colorées. Autres Windows : barre de titre carbone dessinée par le logiciel.
    public static class AppIcon
    {
        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct OsVersionInfo
        {
            public int Size, Major, Minor, Build, Platform;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string Csd;
        }

        [DllImport("ntdll.dll")]
        private static extern int RtlGetVersion(ref OsVersionInfo info);

        [StructLayout(LayoutKind.Sequential)]
        private struct Point { public int X, Y; }

        [StructLayout(LayoutKind.Sequential)]
        private struct MinMaxInfo { public Point Reserved, MaxSize, MaxPosition, MinTrackSize, MaxTrackSize; }

        [StructLayout(LayoutKind.Sequential)]
        private struct Rect { public int Left, Top, Right, Bottom; }

        [StructLayout(LayoutKind.Sequential)]
        private struct MonitorInfo { public int Size; public Rect Monitor, Work; public int Flags; }

        [DllImport("user32.dll")]
        private static extern IntPtr MonitorFromWindow(IntPtr hwnd, int flags);

        [DllImport("user32.dll")]
        private static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);

        // COLORREF = 0x00BBGGRR : #0F172A (carbone) et blanc.
        private const int CarbonRef = 0x2A170F;
        private const int WhiteRef = 0xFFFFFF;
        private static readonly Brush Carbon = Freeze(new SolidColorBrush(Color.FromRgb(0x0F, 0x17, 0x2A)));
        private static readonly Brush Hover = Freeze(new SolidColorBrush(Color.FromRgb(0x1E, 0x29, 0x3B)));
        private static readonly Brush CloseHover = Freeze(new SolidColorBrush(Color.FromRgb(0xC4, 0x2B, 0x1C)));
        private static readonly System.Collections.Generic.HashSet<Window> Styled = new System.Collections.Generic.HashSet<Window>();

        private static Brush Freeze(SolidColorBrush brush) { brush.Freeze(); return brush; }

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

        private static bool IsWindows11()
        {
            if (Environment.GetEnvironmentVariable("IRBE_CUSTOM_FRAME") == "1") return false; // test du cadre dessiné sous Windows 11
            try
            {
                var info = new OsVersionInfo { Size = Marshal.SizeOf(typeof(OsVersionInfo)) };
                return RtlGetVersion(ref info) == 0 && info.Major >= 10 && info.Build >= 22000;
            }
            catch (Exception) { return false; }
        }

        public static void ApplyFrame(Window window)
        {
            try
            {
                if (IsWindows11())
                {
                    var handle = new WindowInteropHelper(window).Handle;
                    if (handle == IntPtr.Zero) return;
                    int caption = CarbonRef, border = CarbonRef, text = WhiteRef;
                    DwmSetWindowAttribute(handle, 35, ref caption, 4);
                    DwmSetWindowAttribute(handle, 34, ref border, 4);
                    DwmSetWindowAttribute(handle, 36, ref text, 4);
                }
                else CustomFrame(window);
            }
            catch (Exception) { }
        }

        private static void CustomFrame(Window window)
        {
            if (Styled.Contains(window) || window.WindowStyle == WindowStyle.None || window.AllowsTransparency) return;
            Styled.Add(window);
            window.Closed += delegate { Styled.Remove(window); };

            var body = window.Content;
            window.Content = null;
            var dock = new DockPanel { LastChildFill = true };
            var bar = BuildBar(window);
            DockPanel.SetDock(bar, Dock.Top);
            dock.Children.Add(bar);
            var element = body as UIElement;
            dock.Children.Add(element ?? new ContentPresenter { Content = body });
            window.Content = new Border { BorderBrush = Carbon, BorderThickness = new Thickness(1), Background = window.Background ?? SystemColors.WindowBrush, Child = dock };
            window.WindowStyle = WindowStyle.None;

            var source = PresentationSource.FromVisual(window) as HwndSource;
            if (source != null) source.AddHook(MaximizeHook);
        }

        private static UIElement BuildBar(Window window)
        {
            var grid = new Grid { Background = Carbon, Height = 32 };
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            grid.ColumnDefinitions.Add(new ColumnDefinition());
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var icon = new Image { Width = 16, Height = 16, Margin = new Thickness(8, 0, 8, 0), VerticalAlignment = VerticalAlignment.Center };
            icon.SetBinding(Image.SourceProperty, new Binding("Icon") { Source = window });
            Grid.SetColumn(icon, 0);
            var title = new TextBlock { Foreground = Brushes.White, FontFamily = new FontFamily("Segoe UI, Tahoma"), FontSize = 12, VerticalAlignment = VerticalAlignment.Center, TextTrimming = TextTrimming.CharacterEllipsis };
            title.SetBinding(TextBlock.TextProperty, new Binding("Title") { Source = window });
            Grid.SetColumn(title, 1);
            grid.Children.Add(icon);
            grid.Children.Add(title);

            var buttons = new StackPanel { Orientation = Orientation.Horizontal };
            Grid.SetColumn(buttons, 2);
            if (window.ResizeMode != ResizeMode.NoResize)
                buttons.Children.Add(CaptionButton("0", Hover, delegate { window.WindowState = WindowState.Minimized; }));
            TextBlock maximizeGlyph = null;
            if (window.ResizeMode == ResizeMode.CanResize || window.ResizeMode == ResizeMode.CanResizeWithGrip)
            {
                var maximize = CaptionButton("1", Hover, delegate { window.WindowState = window.WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized; });
                maximizeGlyph = (TextBlock)((Border)maximize).Child;
                buttons.Children.Add(maximize);
                window.StateChanged += delegate { maximizeGlyph.Text = window.WindowState == WindowState.Maximized ? "2" : "1"; };
            }
            buttons.Children.Add(CaptionButton("r", CloseHover, delegate { window.Close(); }));
            grid.Children.Add(buttons);

            grid.MouseLeftButtonDown += (s, e) =>
            {
                if (e.ClickCount == 2 && maximizeGlyph != null)
                    window.WindowState = window.WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
                else if (e.ButtonState == MouseButtonState.Pressed)
                {
                    try { window.DragMove(); } catch (InvalidOperationException) { }
                }
            };
            return grid;
        }

        private static UIElement CaptionButton(string glyph, Brush hover, Action click)
        {
            var text = new TextBlock { Text = glyph, FontFamily = new FontFamily("Marlett"), FontSize = 12, Foreground = Brushes.White, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
            var border = new Border { Width = 46, Background = Brushes.Transparent, Child = text };
            border.MouseEnter += delegate { border.Background = hover; };
            border.MouseLeave += delegate { border.Background = Brushes.Transparent; };
            border.MouseLeftButtonDown += (s, e) => e.Handled = true;
            border.MouseLeftButtonUp += (s, e) => { e.Handled = true; click(); };
            return border;
        }

        // Sans barre système, une fenêtre agrandie couvrirait la barre des tâches : on la limite à la zone de travail.
        private static IntPtr MaximizeHook(IntPtr hwnd, int message, IntPtr wParam, IntPtr lParam, ref bool handled)
        {
            if (message != 0x24) return IntPtr.Zero;
            var monitor = MonitorFromWindow(hwnd, 2);
            if (monitor == IntPtr.Zero) return IntPtr.Zero;
            var info = new MonitorInfo { Size = Marshal.SizeOf(typeof(MonitorInfo)) };
            if (!GetMonitorInfo(monitor, ref info)) return IntPtr.Zero;
            var mmi = (MinMaxInfo)Marshal.PtrToStructure(lParam, typeof(MinMaxInfo));
            mmi.MaxPosition.X = info.Work.Left - info.Monitor.Left;
            mmi.MaxPosition.Y = info.Work.Top - info.Monitor.Top;
            mmi.MaxSize.X = info.Work.Right - info.Work.Left;
            mmi.MaxSize.Y = info.Work.Bottom - info.Work.Top;
            Marshal.StructureToPtr(mmi, lParam, true);
            return IntPtr.Zero;
        }
    }
}
