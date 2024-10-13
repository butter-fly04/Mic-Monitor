import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const MicMonitor = GObject.registerClass(
  class MicMonitor extends PanelMenu.Button {
    _init() {
      super._init(0.0, 'Mic Monitor');
      this._loopbackLoaded = false;
      this._loopbackId = null;

      this._icon = new St.Icon({
        icon_name: 'audio-input-microphone-symbolic',
        style_class: 'system-status-icon'
      });
      this.add_child(this._icon);

      this.connect('button-press-event', () => {
        this._toggleMicMonitor();
      });
    }

    async _toggleMicMonitor() {
      try {
        if (!this._loopbackLoaded) {
          const [, stdout] = await this._spawnCommandLine("pactl load-module module-loopback");
          this._loopbackId = stdout.toString().trim();
          this._loopbackLoaded = true;
          this._icon.icon_name = 'audio-input-microphone-high-symbolic';
        } else {
          await this._spawnCommandLine(`pactl unload-module ${this._loopbackId}`);
          this._loopbackLoaded = false;
          this._icon.icon_name = 'audio-input-microphone-symbolic';
        }
      } catch (error) {
        logError(error);
        Main.notify('Error toggling mic monitor', error.message);
      }
    }

    _spawnCommandLine(command) {
      return new Promise((resolve, reject) => {
        try {
          let [, pid, stdin, stdout, stderr] = GLib.spawn_async_with_pipes(
            null, // working directory
            ['bash', '-c', command], // command
            null, // environment
            GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
            null // child setup function
          );

          let stdoutStream = new Gio.DataInputStream({
            base_stream: new Gio.UnixInputStream({ fd: stdout })
          });

          let [out, size] = stdoutStream.read_line(null);

          GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, () => {
            GLib.spawn_close_pid(pid);
          });

          resolve([true, out]);
        } catch (e) {
          reject(e);
        }
      });
    }

    destroy() {
      if (this._loopbackLoaded) {
        this._spawnCommandLine(`pactl unload-module ${this._loopbackId}`).catch(logError);
      }
      super.destroy();
    }
  }
);

export default class MicMonitorExtension extends Extension {
  enable() {
    this._micMonitor = new MicMonitor();
    Main.panel.addToStatusArea('mic-monitor', this._micMonitor);
  }

  disable() {
    this._micMonitor.destroy();
    this._micMonitor = null;
  }
}
