const Lang = imports.lang;
const Applet = imports.ui.applet;
const Cvc = imports.gi.Cvc;
const Clutter = imports.gi.Clutter;

const VOLUME_ADJUSTMENT_STEP = 0.05; /* Volume adjustment step in % */

function MyApplet(orientation, panel_height, instance_id) {
  this._init(orientation, panel_height, instance_id);
}

MyApplet.prototype = {
  __proto__: Applet.TextIconApplet.prototype,

  _init: function (orientation, panel_height, instance_id) {
    Applet.TextIconApplet.prototype._init.call(
      this,
      orientation,
      panel_height,
      instance_id
    );

    this.set_applet_icon_symbolic_name('microphone-sensitivity-muted-symbolic');
    this.set_applet_label('initializing...');
    this.set_applet_tooltip(
      'Click to toggle mic mute or scroll to adjust mic volume'
    );

    this._input = null;
    this._inputMutedId = 0;
    this._inputVolumeId = 0;

    this._control = new Cvc.MixerControl({ name: 'Cinnamon Volume Control' });
    this._control.connect(
      'state-changed',
      Lang.bind(this, this._onControlStateChanged)
    );
    this._control.connect(
      'default-source-changed',
      Lang.bind(this, this._onControlStateChanged)
    );
    this._control.connect(
      'default-sink-changed',
      Lang.bind(this, this._onControlStateChanged)
    );
    this._volumeMax = 1 * this._control.get_vol_max_norm();
    this._control.open();

    this.actor.connect('scroll-event', Lang.bind(this, this._onScrollEvent));
  },

  _onControlStateChanged: function () {
    if (this._control.get_state() !== Cvc.MixerControlState.READY) {
      return;
    }

    if (this._inputMutedId) {
      this._input.disconnect(this._inputMutedId);
      this._input.disconnect(this._inputVolumeId);
      this._inputMutedId = 0;
      this._inputVolumeId = 0;
    }

    this._input = this._control.get_default_source();
    if (this._input) {
      this._inputMutedId = this._input.connect(
        'notify::is-muted',
        Lang.bind(this, this._update)
      );
      this._inputVolumeId = this._input.connect(
        'notify::volume',
        Lang.bind(this, this._update)
      );
      this._update();
    }
  },

  _update: function () {
    if (this._input.is_muted) {
      this.set_applet_label('Muted');
      this.set_applet_icon_symbolic_name(
        'microphone-sensitivity-muted-symbolic'
      );
    } else {
      const value = Math.floor((this._input.volume * 100) / this._volumeMax);
      this.set_applet_label(value + '%');

      let icon;
      if (value < 33) {
        icon = 'low';
      } else if (value < 66) {
        icon = 'medium';
      } else {
        icon = 'high';
      }
      this.set_applet_icon_symbolic_name(
        'microphone-sensitivity-' + icon + '-symbolic'
      );
    }
  },

  _onScrollEvent: function (actor, event) {
    let direction = event.get_scroll_direction();
    let currentVolume = this._input.volume;
    let delta = this._volumeMax * VOLUME_ADJUSTMENT_STEP;

    if (direction == Clutter.ScrollDirection.DOWN) {
      this._input.volume = Math.max(0, currentVolume - delta);
      if (this._input.volume < 1) {
        this._input.volume = 0;
        this._input.change_is_muted(true);
      }
      this._input.push_volume();
    } else if (direction == Clutter.ScrollDirection.UP) {
      this._input.volume = Math.min(this._volumeMax, currentVolume + delta);
      this._input.change_is_muted(false);
      this._input.push_volume();
    }
  },

  on_applet_clicked: function (event) {
    this._input.change_is_muted(!this._input.is_muted);
  },
};

function main(metadata, orientation, panel_height, instance_id) {
  return new MyApplet(orientation, panel_height, instance_id);
}
