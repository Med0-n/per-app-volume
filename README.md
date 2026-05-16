<div align="center">

# 🎚️ Per App Volume

**A modern GNOME Shell extension to control each app's volume directly from the panel.**

![GNOME Shell](https://img.shields.io/badge/GNOME_Shell-45%2B-blue?style=flat-square&logo=gnome)
![License](https://img.shields.io/github/license/TON_USERNAME/per-app-volume?style=flat-square)
![Version](https://img.shields.io/badge/version-1.0-green?style=flat-square)

</div>

---

## ✨ Features

- 🎚️ **Per-app volume sliders** — control each application independently
- 🔇 **Mute per app** — one click to mute/unmute any app
- 🔇 **Mute all** — silence everything at once from the header
- 🔊 **Master volume** — system output control at the top
- 💥 **Volume boost** — push apps up to **150%**
- 🖱️ **Scroll on icon** — scroll up/down on the panel icon to adjust master volume
- 🖱️ **Middle click** — middle-click the panel icon to mute/unmute master
- 🎨 **Liquid glass UI** — translucent, modern design that adapts to your GTK theme
- 🎉 **Easter egg** — try clicking the header 7 times...

---

## 📦 Installation

### Manual

```bash
# Clone the repo
git clone https://github.com/TON_USERNAME/per-app-volume.git

# Copy to GNOME extensions folder
cp -r "per-app-volume/per-app-volume@gcampax.github.com" \
  ~/.local/share/gnome-shell/extensions/

# Log out and log back in, then enable
gnome-extensions enable per-app-volume@gcampax.github.com
```

### From GNOME Extensions website
> Coming soon on [extensions.gnome.org](https://extensions.gnome.org)

---

## 🖱️ Controls

| Action | Result |
|--------|--------|
| Click panel icon | Open/close menu |
| Scroll ↑/↓ on icon | Master volume ±5% |
| Middle click icon | Mute/unmute master |
| Click 🔇 in header | Mute/unmute all apps |
| Click 🔇 next to app | Mute/unmute that app |
| Drag slider | Set volume (0–150% for apps) |
| 7× click on "APPLICATIONS VOLUME" | 🎉 |

---

## 🔧 Requirements

- GNOME Shell **45 or later**
- PipeWire or PulseAudio

---

## 🗺️ Roadmap

- [ ] Per-app volume memory (restore on relaunch)
- [ ] Keyboard shortcuts
- [ ] GNOME Extensions website release
- [ ] Settings panel (configurable boost limit, scroll step)

---

## 🤝 Contributing

Pull requests are welcome!

```bash
git clone https://github.com/Med0-n/per-app-volume.git
cd per-app-volume
# make your changes, test with:
gnome-extensions prefs per-app-volume@gcampax.github.com
```

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

<div align="center">
Made with ❤️ for the GNOME community
</div>
