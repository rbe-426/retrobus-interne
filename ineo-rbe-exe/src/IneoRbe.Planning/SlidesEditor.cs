using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Win32;
using IneoRbe.Desktop.Services;

namespace IneoRbe.Planning
{
    // Diapositives du profil TFT : chacune est liée à une action (page de garde, prochains arrêts, délai d'arrivée…)
    // et possède son gabarit (image de fond) et sa disposition.
    public sealed class SlidesEditor : StackPanel
    {
        private static readonly KeyValuePair<string, string>[] SlideTypes =
        {
            new KeyValuePair<string, string>(SlideType.Cover, "Page de garde"),
            new KeyValuePair<string, string>(SlideType.NextStop, "Prochain arrêt"),
            new KeyValuePair<string, string>(SlideType.NextStops, "Prochains arrêts (liste)"),
            new KeyValuePair<string, string>(SlideType.MainStops, "Arrêts principaux et délai d'arrivée"),
            new KeyValuePair<string, string>(SlideType.Correspondences, "Correspondances"),
            new KeyValuePair<string, string>(SlideType.Destination, "Destination"),
            new KeyValuePair<string, string>(SlideType.Clock, "Heure"),
            new KeyValuePair<string, string>(SlideType.Message, "Message libre"),
        };

        private readonly Func<ScreenNorm> _norm;
        private List<SlideNorm> _slides = new List<SlideNorm>();
        private bool _loading;

        private readonly ListBox _list = new ListBox { MinHeight = 90 };
        private readonly ComboBox _type = new ComboBox { DisplayMemberPath = "Value", SelectedValuePath = "Key", ItemsSource = SlideTypes };
        private readonly TextBox _name = new TextBox();
        private readonly TextBox _seconds = new TextBox();
        private readonly TextBox _text = new TextBox();
        private readonly TextBlock _base = Ui.Text(string.Empty, 11, false, Ui.Muted);
        private readonly StackPanel _form = new StackPanel();

        public SlidesEditor(Func<ScreenNorm> norm, string title)
        {
            _norm = norm;
            Children.Add(Ui.Text(title, 12, true));
            Children.Add(_list);
            Children.Add(Ui.Toolbar(
                Ui.Button("Ajouter", (s, e) => Add()),
                Ui.Button("Supprimer", (s, e) => Remove()),
                Ui.Button("▲", (s, e) => Move(-1)),
                Ui.Button("▼", (s, e) => Move(1))));
            _form.Children.Add(Field("Nom de la diapositive", _name));
            _form.Children.Add(Field("Action / type", _type));
            _form.Children.Add(Field("Durée (s)", _seconds));
            _form.Children.Add(Field("Texte (message libre)", _text));
            _form.Children.Add(Ui.Toolbar(Ui.Button("Gabarit de la diapositive…", (s, e) => ChooseBase()), Ui.Button("Retirer", (s, e) => ClearBase())));
            _form.Children.Add(_base);
            _form.Children.Add(Ui.Toolbar(Ui.Button("Éditer la disposition de cette diapositive…", (s, e) => EditLayout(), true)));
            Children.Add(_form);

            _list.SelectionChanged += (s, e) => LoadSlide();
            foreach (var box in new[] { _name, _seconds, _text }) box.TextChanged += (s, e) => ApplySlide();
            _type.SelectionChanged += (s, e) => ApplySlide();
            Load(null);
        }

        private static StackPanel Field(string label, UIElement control)
        {
            var panel = new StackPanel { Margin = new Thickness(0, 0, 8, 8) };
            panel.Children.Add(Ui.Text(label, 11, true, Ui.Muted));
            panel.Children.Add(control);
            return panel;
        }

        private static string Int(int value) { return value.ToString(CultureInfo.InvariantCulture); }

        private static int ParseInt(string text, int fallback)
        {
            int value;
            return int.TryParse((text ?? string.Empty).Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out value) ? value : fallback;
        }

        // slides : liste de l'écran sélectionné (null : aucun écran).
        public void Load(List<SlideNorm> slides)
        {
            _slides = slides ?? new List<SlideNorm>();
            IsEnabled = slides != null;
            Refresh(_slides.Count > 0 ? 0 : -1);
        }

        private SlideNorm Current
        {
            get { var i = _list.SelectedIndex; return i >= 0 && i < _slides.Count ? _slides[i] : null; }
        }

        private static string Label(SlideNorm slide)
        {
            var found = SlideTypes.FirstOrDefault(t => t.Key == slide.Type);
            var name = string.IsNullOrEmpty(slide.Name) ? (found.Value ?? slide.Type) : slide.Name;
            return name + " — " + slide.Seconds + " s" + (slide.Type == SlideType.Message && !string.IsNullOrEmpty(slide.Text) ? " : " + slide.Text : string.Empty);
        }

        private static string BaseText(SlideNorm slide)
        {
            return string.IsNullOrEmpty(slide.BaseImage) ? "Gabarit : par défaut de la norme" : "Gabarit : " + slide.BaseName;
        }

        private void Refresh(int select)
        {
            _loading = true;
            _list.Items.Clear();
            foreach (var slide in _slides) _list.Items.Add(Label(slide));
            _loading = false;
            _list.SelectedIndex = select;
            LoadSlide();
        }

        private void LoadSlide()
        {
            if (_loading) return;
            var slide = Current;
            _loading = true;
            _form.IsEnabled = slide != null;
            _type.SelectedValue = slide == null ? null : slide.Type;
            _name.Text = slide == null ? string.Empty : slide.Name;
            _seconds.Text = slide == null ? string.Empty : Int(slide.Seconds);
            _text.Text = slide == null ? string.Empty : slide.Text;
            _base.Text = slide == null ? string.Empty : BaseText(slide);
            _loading = false;
        }

        private void ApplySlide()
        {
            if (_loading) return;
            var slide = Current;
            if (slide == null) return;
            var type = _type.SelectedValue as string ?? SlideType.NextStop;
            if (type != slide.Type)
            {
                slide.Type = type;
                if (!slide.Customized) slide.Elements = ScreenNorm.DefaultElements(type);
            }
            slide.Name = _name.Text.Trim();
            slide.Seconds = Math.Max(1, Math.Min(120, ParseInt(_seconds.Text, 6)));
            slide.Text = _text.Text;
            var index = _list.SelectedIndex;
            _loading = true;
            _list.Items[index] = Label(slide);
            _list.SelectedIndex = index;
            _loading = false;
        }

        private void Add()
        {
            if (_slides.Count >= 20) { Ui.Error("20 diapositives au maximum."); return; }
            _slides.Add(new SlideNorm { Type = SlideType.Cover, Seconds = 5, Elements = ScreenNorm.DefaultElements(SlideType.Cover) });
            Refresh(_slides.Count - 1);
        }

        private void Remove()
        {
            var slide = Current;
            if (slide == null) return;
            _slides.Remove(slide);
            Refresh(Math.Min(_list.SelectedIndex, _slides.Count - 1));
        }

        private void Move(int delta)
        {
            var index = _list.SelectedIndex;
            var target = index + delta;
            if (index < 0 || target < 0 || target >= _slides.Count) return;
            var slide = _slides[index];
            _slides.RemoveAt(index);
            _slides.Insert(target, slide);
            Refresh(target);
        }

        private void ChooseBase()
        {
            var slide = Current;
            if (slide == null) return;
            var dialog = new OpenFileDialog { Filter = "Images (*.png;*.jpg;*.jpeg;*.bmp;*.gif)|*.png;*.jpg;*.jpeg;*.bmp;*.gif" };
            if (dialog.ShowDialog() != true) return;
            try
            {
                slide.BaseImage = SaeivStore.Import(dialog.FileName, SaeivStore.ScreensFolder, SaeivStore.ImageExtensions, SaeivStore.MaxImageBytes);
                slide.BaseName = Path.GetFileName(dialog.FileName);
                _base.Text = BaseText(slide);
            }
            catch (Exception exception) { Ui.Error(exception.Message); }
        }

        private void ClearBase()
        {
            var slide = Current;
            if (slide == null) return;
            slide.BaseImage = string.Empty;
            slide.BaseName = string.Empty;
            _base.Text = BaseText(slide);
        }

        private void EditLayout()
        {
            var slide = Current;
            if (slide == null) { Ui.Error("Sélectionnez d'abord une diapositive."); return; }
            new ScreenDesigner(_norm(), slide) { Owner = Window.GetWindow(this) }.ShowDialog();
        }
    }
}
