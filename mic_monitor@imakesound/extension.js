import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

let micMonitor;
let loopbackLoaded = false;
let loopbackId = null;

const MicMonitor = GObject.registerClass(
  class MicMonitor extends PanelMenu.Button {
    _init() {
      super._init(0.0, 'Mic Monitor');
      
      this.buttonContainer = new St.Bin({
        style_class: 'panel-button',
        reactive: true,
        can_focus: true,
        track_hover: true
      });

      this._icon = new St.Icon({
        icon_name: 'audio-input-microphone-symbolic',
        style_class: 'system-status-icon'
      });

      this.buttonContainer.set_child(this._icon);
      this.add_child(this.buttonContainer);

      this.connect('button-press-event', () => {
        this._toggleMicMonitor();
      });

      this.buttonContainer.connect('notify::hover', () => {
        if (loopbackLoaded) {
          this.buttonContainer.set_style('background-color: rgba(255, 255, 255, 0.25); border-radius: 16px; padding: 0 0px;');
        }
      });
    }

    _toggleMicMonitor() {
      if (!loopbackLoaded) {
        let [result, stdout] = GLib.spawn_command_line_sync("pactl load-module module-loopback");
        if (result) {
          loopbackId = stdout.toString().trim();
          loopbackLoaded = true;
          this.buttonContainer.set_style('background-color: rgba(255, 255, 255, 0.25); border-radius: 16px; padding: 0 0px;');
        }
      } else {
        let [result] = GLib.spawn_command_line_sync("pactl unload-module " + loopbackId);
        if (result) {
          loopbackLoaded = false;
          this.buttonContainer.set_style('');
        }
      }
    }
  }
);

export default class MicMonitorExtension extends Extension {
  enable() {
    micMonitor = new MicMonitor();
    Main.panel.addToStatusArea('mic-monitor', micMonitor);
  }

  disable() {
    if (loopbackLoaded) {
      GLib.spawn_command_line_sync("pactl unload-module " + loopbackId);
    }
    micMonitor.destroy();
  }
}
