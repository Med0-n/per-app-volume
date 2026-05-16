import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gvc from 'gi://Gvc';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const EASTER_CLICKS = 7;
const VOL_MAX_BOOST = 1.5;
const SCROLL_STEP = 0.05;

export default class PerAppVolume extends Extension {
    enable() {
        this._button = new PanelMenu.Button(0.5, 'PerAppVolume', false);

        this._icon = new St.Icon({
            icon_name: 'audio-headphones-symbolic',
            style_class: 'system-status-icon',
        });
        this._button.add_child(this._icon);
        this._button.menu.box.add_style_class_name('perapp-panel');

        this._button.connect('scroll-event', (a, e) => this._onScroll(e));
        this._button.connect('button-press-event', (a, e) => {
            if (e.get_button() === 2) {
                this._toggleMasterMute();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this._header = new St.BoxLayout({
            style_class: 'perapp-header-box',
            reactive: true, track_hover: true, can_focus: true, x_expand: true,
        });
        this._headerLabel = new St.Label({
            text: _('Applications Volume'),
            style_class: 'perapp-header',
            y_align: Clutter.ActorAlign.CENTER, x_expand: true,
        });
        this._muteAllBtn = new St.Button({
            style_class: 'perapp-muteall-btn',
            child: new St.Icon({icon_name: 'audio-volume-muted-symbolic', icon_size: 14}),
            can_focus: true, track_hover: true,
        });
        this._muteAllBtn.connect('clicked', () => this._toggleMuteAll());
        this._header.add_child(this._headerLabel);
        this._header.add_child(this._muteAllBtn);
        this._header.connect('button-press-event', (a, e) => {
            if (e.get_source() === this._muteAllBtn) return Clutter.EVENT_PROPAGATE;
            this._onHeaderClick();
            return Clutter.EVENT_STOP;
        });
        this._button.menu.box.add_child(this._header);

        this._masterSection = new PopupMenu.PopupMenuSection();
        this._button.menu.addMenuItem(this._masterSection);
        this._button.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._section = new PopupMenu.PopupMenuSection();
        this._button.menu.addMenuItem(this._section);

        this._control = new Gvc.MixerControl({name: 'PerAppVolume'});
        this._control.open();

        this._sigAdded = this._control.connect('stream-added', () => this._sync());
        this._sigRemoved = this._control.connect('stream-removed', () => this._sync());
        this._sigDefault = this._control.connect('default-sink-changed', () => this._sync());

        this._menuOpen = this._button.menu.connect('open-state-changed', (_m, open) => {
            if (open) this._sync();
        });

        Main.panel.addToStatusArea('per-app-volume', this._button, 0, 'right');
        this._sync();
    }

    _onScroll(event) {
        const sink = this._control.get_default_sink();
        if (!sink) return Clutter.EVENT_PROPAGATE;
        const max = this._control.get_vol_max_norm();
        const dir = event.get_scroll_direction();
        let delta = 0;
        if (dir === Clutter.ScrollDirection.UP) delta = SCROLL_STEP;
        else if (dir === Clutter.ScrollDirection.DOWN) delta = -SCROLL_STEP;
        else return Clutter.EVENT_PROPAGATE;
        const cur = sink.volume / max;
        const next = Math.max(0, Math.min(1, cur + delta));
        sink.volume = Math.round(next * max);
        sink.push_volume();
        if (sink.is_muted && next > 0) sink.change_is_muted(false);
        return Clutter.EVENT_STOP;
    }

    _toggleMasterMute() {
        const sink = this._control.get_default_sink();
        if (sink) sink.change_is_muted(!sink.is_muted);
    }

    _toggleMuteAll() {
        const streams = this._control.get_streams().filter(s =>
            s instanceof Gvc.MixerSinkInput && !s.is_event_stream
        );
        const anyUnmuted = streams.some(s => !s.is_muted);
        for (const s of streams) s.change_is_muted(anyUnmuted);
    }

    _onHeaderClick() {
        this._clicks = (this._clicks || 0) + 1;
        if (this._clickTimer) GLib.source_remove(this._clickTimer);
        this._clickTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
            this._clicks = 0; this._clickTimer = 0;
            return GLib.SOURCE_REMOVE;
        });
        this._headerLabel.ease({
            opacity: 120, duration: 80,
            onComplete: () => this._headerLabel.ease({opacity: 255, duration: 150}),
        });
        if (this._clicks >= EASTER_CLICKS) {
            this._clicks = 0;
            this._triggerEaster();
        }
    }

    _triggerEaster() {
        this._icon.icon_name = 'face-cool-symbolic';
        const msg = new PopupMenu.PopupMenuItem('🎉  Party Mode activated!  🎉', {
            reactive: false, can_focus: false,
        });
        msg.label.add_style_class_name('perapp-easter');
        this._section.addMenuItem(msg);
        if (this._easterTimer) GLib.source_remove(this._easterTimer);
        this._easterTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
            this._icon.icon_name = 'audio-headphones-symbolic';
            msg.destroy();
            this._easterTimer = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    _sync() {
        this._masterSection.removeAll();
        this._section.removeAll();

        const sink = this._control.get_default_sink();
        if (sink) this._addStream(this._masterSection, sink, true);

        const streams = this._control.get_streams().filter(s =>
            s instanceof Gvc.MixerSinkInput && !s.is_event_stream
        );

        if (streams.length === 0) {
            const empty = new PopupMenu.PopupMenuItem(_('No application playing audio'), {
                reactive: false, can_focus: false,
            });
            empty.label.add_style_class_name('perapp-empty');
            this._section.addMenuItem(empty);
            return;
        }

        for (const stream of streams) this._addStream(this._section, stream, false);
    }

    _volIconName(stream, isMaster) {
        if (stream.is_muted) return 'audio-volume-muted-symbolic';
        const max = this._control.get_vol_max_norm();
        const ratio = stream.volume / max;
        if (ratio <= 0.01) return 'audio-volume-muted-symbolic';
        if (ratio < 0.34) return 'audio-volume-low-symbolic';
        if (ratio < 0.67) return 'audio-volume-medium-symbolic';
        return 'audio-volume-high-symbolic';
    }

    _addStream(section, stream, isMaster) {
        const item = new PopupMenu.PopupBaseMenuItem({activate: false});
        item.add_style_class_name(isMaster ? 'perapp-item perapp-master' : 'perapp-item');

        const row = new St.BoxLayout({style_class: 'perapp-row', x_expand: true, vertical: true});
        const top = new St.BoxLayout({style_class: 'perapp-top', x_expand: true});

        const iconName = isMaster
            ? this._volIconName(stream, true)
            : (stream.get_icon_name() || 'application-x-executable-symbolic');
        const icon = new St.Icon({
            icon_name: iconName,
            icon_size: isMaster ? 18 : 20,
            style_class: 'perapp-app-icon',
        });

        const labelText = isMaster
            ? _('System Output')
            : (stream.get_description() || stream.get_name() || _('Unknown'));
        const label = new St.Label({
            text: labelText,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            style_class: isMaster ? 'perapp-label perapp-label-master' : 'perapp-label',
        });

        const pctLabel = new St.Label({
            text: '0%',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'perapp-pct',
        });

        const muteBtn = new St.Button({
            style_class: 'perapp-mute-btn',
            child: new St.Icon({
                icon_name: stream.is_muted ? 'audio-volume-muted-symbolic' : 'audio-volume-high-symbolic',
                icon_size: 14,
            }),
            can_focus: true, track_hover: true,
        });
        muteBtn.connect('clicked', () => stream.change_is_muted(!stream.is_muted));

        top.add_child(icon);
        top.add_child(label);
        top.add_child(pctLabel);
        top.add_child(muteBtn);

        const max = this._control.get_vol_max_norm();
        const maxAllowed = isMaster ? max : max * VOL_MAX_BOOST;
        const slider = new Slider.Slider(Math.min(1, stream.volume / maxAllowed));
        slider.add_style_class_name('perapp-slider');
        slider.x_expand = true;

        const updatePct = () => {
            const pct = Math.round((stream.volume / max) * 100);
            pctLabel.text = `${pct}%`;
            if (pct > 100) pctLabel.add_style_class_name('perapp-pct-boost');
            else pctLabel.remove_style_class_name('perapp-pct-boost');
            if (stream.is_muted) {
                label.add_style_class_name('perapp-muted');
                slider.add_style_class_name('perapp-slider-muted');
            } else {
                label.remove_style_class_name('perapp-muted');
                slider.remove_style_class_name('perapp-slider-muted');
            }
            muteBtn.child.icon_name = stream.is_muted
                ? 'audio-volume-muted-symbolic'
                : 'audio-volume-high-symbolic';
            if (isMaster) icon.icon_name = this._volIconName(stream, true);
        };

        let updating = false;
        const sliderId = slider.connect('notify::value', () => {
            if (updating) return;
            stream.volume = Math.round(slider.value * maxAllowed);
            stream.push_volume();
            if (stream.is_muted && slider.value > 0) stream.change_is_muted(false);
            updatePct();
        });
        const streamVolId = stream.connect('notify::volume', () => {
            updating = true;
            slider.value = Math.min(1, stream.volume / maxAllowed);
            updating = false;
            updatePct();
        });
        const streamMuteId = stream.connect('notify::is-muted', updatePct);

        item.connect('destroy', () => {
            slider.disconnect(sliderId);
            stream.disconnect(streamVolId);
            stream.disconnect(streamMuteId);
        });

        row.add_child(top);
        row.add_child(slider);
        item.add_child(row);
        section.addMenuItem(item);

        item.opacity = 0;
        item.ease({opacity: 255, duration: 250});

        updatePct();
    }

    disable() {
        if (this._clickTimer) GLib.source_remove(this._clickTimer);
        if (this._easterTimer) GLib.source_remove(this._easterTimer);
        if (this._menuOpen) this._button.menu.disconnect(this._menuOpen);
        if (this._control) {
            if (this._sigAdded) this._control.disconnect(this._sigAdded);
            if (this._sigRemoved) this._control.disconnect(this._sigRemoved);
            if (this._sigDefault) this._control.disconnect(this._sigDefault);
            this._control.close();
            this._control = null;
        }
        this._button.destroy();
        this._button = null;
        this._icon = null;
    }
}
