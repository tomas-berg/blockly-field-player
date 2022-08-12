/* eslint-disable max-len */
/**
 * @license
 * Copyright 2022 robot
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audio player field.
 */

import Blockly from 'blockly/core';
import WaveSurfer from 'wavesurfer.js';

const WIDTH = 330;
const HEIGHT = 58;

/**
 * EventEmitter
 */
class EventEmitter {
  /**
   * Constructs EventEmitter
   */
  constructor() {
    this.events = {};
  }

  /**
   * Subscribe to event
   * @param {String} eventName Name of event.
   * @param {Object} fn Callback
   * @return {Function} Unsubscribe
   */
  on(eventName, fn) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(fn);
    return () => {
      this.events[eventName] =
        this.events[eventName].filter((eventFn) => eventFn !== fn);
    };
  }

  /**
   * Emit
   * @param {String} eventName Name of event
   * @param {Object} data Data.
   */
  emit(eventName, data) {
    const event = this.events[eventName];
    if (event) {
      event.forEach((fn) => fn.call(null, data));
    }
  }
}

/**
 * Field description.
 */
export class FieldPlayer extends Blockly.Field {
  /**
   * Constructs a FieldTemplate from a JSON arg object.
   * @param {String} src File SRC/URL
   * @param {!Object} options A JSON object with options.
   * @return {!FieldPlayer} The new field instance.
   * @package
   * @nocollapse
   */
  constructor(src, options) {
    super(Blockly.Field.SKIP_SETUP);

    /**
     * Options object
     * @type {Object}
     * @private
     */
    this.OPTIONS_ = {...options};

    /**
     * Auto file load if SRC is provided. Default: false.
     * @type {Boolean}
     * @public
     */
    this.AUTOLOAD = this.OPTIONS_.autoLoad !== undefined ?
      this.OPTIONS_.autoLoad : false;

    /**
     * Editable fields usually show some sort of UI indicating they are
     * editable. This field should not.
     * @type {Boolean}
     */
    this.EDITABLE = false;

    /**
     * Player states.
     * @type {Object}
     * @private
     */
    this.STATES_ = Object.freeze({
      NOTLOADED: 'notloaded',
      READYTOLOAD: 'readytoload',
      UNLOADED: 'unloaded',
      LOADING: 'loading',
      LOADED: 'loaded',
      PLAYING: 'playing',
      PAUSED: 'paused',
      STOPPED: 'stopped',
      ERROR: 'error',
    });

    /**
     * Player state
     * @type {String}
     * @private
     */
    this.STATE_ = this.STATES_.NOTLOADED;

    /**
     * Wrapper click event data.
     * @type {?Blockly.browserEvents.Data}
     * @private
     */
    this.clickWrapper_ = null;

    /**
     * WaveSurfer instance
     * @type {WaveSurfer}
     * @private
     */
    this.surfer_ = null;

    /**
     * EventEmitter instance
     * @type {EventEmitter}
     * @private
     */
    this.emitter_ = new EventEmitter();

    this.primaryColor = this.OPTIONS_.primaryColor || '#DEA922';
    this.secondaryColor = this.OPTIONS_.secondaryColor || '#E2D0A7';
    this.backgroundColor = this.OPTIONS_.backgroundColor || '#FCF3D8';

    this.setValue(src);
  }

  /**
   * Create block UI for this label.
   * @package
   */
  initView() {
    super.initView();

    this.foreignObject_ = Blockly.utils.dom.createSvgElement('foreignObject', {
      x: 0,
      y: 0,
      width: WIDTH,
      height: HEIGHT,
    });

    this.wrapperElement_ = document.createElement('div');
    this.wrapperElement_.setAttribute('id', 'wrapper');
    this.wrapperElement_.style.backgroundColor = this.backgroundColor;
    this.wrapperElement_.style.color = this.secondaryColor;

    this.controlsElement_ = document.createElement('div');
    this.controlsElement_.setAttribute('id', 'controls');
    this.wrapperElement_.appendChild(this.controlsElement_);

    this.playButtonElement_ = Blockly.utils.dom.createSvgElement(Blockly.utils.Svg.SVG, {
      'xmlns:svg': 'http://www.w3.org/2000/svg',
      'xmlns': 'http://www.w3.org/2000/svg',
      'version': '1.1',
      'id': 'play-btn',
      'x': 0,
      'y': 0,
      'height': 40,
      'width': 40,
      'viewBox': '0 0 100 100',
    });

    if (this.getValue()) {
      this.playButtonElement_.classList.add('loaded');
    }

    const strokeD = 'M49.9,2.5C23.6,2.8,2.1,24.4,2.5,50.4C2.9,76.5,24.7,98,50.3,97.5c26.4-0.6,47.4-21.8,47.2-47.7 C97.3,23.7,75.7,2.3,49.9,2.5';

    Blockly.utils.dom.createSvgElement(Blockly.utils.Svg.PATH, {
      'id': 'play-stroke',
      'fill': this.primaryColor,
      'stroke': this.primaryColor,
      'd': strokeD,
    }, this.playButtonElement_);

    Blockly.utils.dom.createSvgElement(Blockly.utils.Svg.PATH, {
      'id': 'play-stroke-disabled',
      'fill': this.secondaryColor,
      'stroke': this.secondaryColor,
      'd': strokeD,
    }, this.playButtonElement_);

    Blockly.utils.dom.createSvgElement(Blockly.utils.Svg.PATH, {
      'id': 'play-icon',
      'fill': this.backgroundColor,
      'd': 'm 71.192019,56.009948 -25.43919,14.699054 c -2.146071,1.240056 -4.792253,1.242233 -6.941908,0.0018 -2.148157,-1.23967 -3.471352,-3.53138 -3.471352,-6.011497 V 35.301104 c 0,-2.480194 1.323413,-4.771667 3.471352,-6.011337 1.073457,-0.619482 2.271469,-0.929852 3.469468,-0.929852 1.199074,0 2.398331,0.310132 3.47244,0.930938 l 25.43941,14.699054 c 2.146254,1.240062 3.468192,3.530757 3.468192,6.009783 0,2.478949 -1.322139,4.769567 -3.468412,6.009783 z',
    }, this.playButtonElement_);

    Blockly.utils.dom.createSvgElement(Blockly.utils.Svg.PATH, {
      'id': 'pause-icon',
      'fill': this.backgroundColor,
      'd': 'm 45.038508,62.897039 c 0,2.750311 -2.534314,4.97998 -5.660404,4.97998 -3.126091,0 -5.660403,-2.229669 -5.660403,-4.97998 V 37.10296 c 0,-2.750311 2.534312,-4.97998 5.660403,-4.97998 3.12609,0 5.660404,2.229669 5.660404,4.97998 z m 21.243791,0 c 0,2.750311 -2.534642,4.97998 -5.660405,4.97998 -3.12609,0 -5.660402,-2.229669 -5.660402,-4.97998 V 37.10296 c 0,-2.750311 2.534312,-4.97998 5.660402,-4.97998 3.126092,0 5.660405,2.229669 5.660405,4.97998 z',
    }, this.playButtonElement_);

    this.controlsElement_.appendChild(this.playButtonElement_);

    this.waveElement_ = document.createElement('div');
    this.waveElement_.setAttribute('id', 'wave');
    this.wrapperElement_.appendChild(this.waveElement_);

    this.counterElement_ = document.createElement('div');
    this.counterElement_.setAttribute('id', 'counter');
    this.wrapperElement_.appendChild(this.counterElement_);

    this.foreignObject_.appendChild(this.wrapperElement_);
    this.fieldGroup_.appendChild(this.foreignObject_);

    this.clickWrapper_ =
      Blockly.browserEvents.conditionalBind(this.playButtonElement_, 'click', this, this.play);

    this.size_.width = WIDTH;
    this.size_.height = HEIGHT;
  }

  /**
   * setPlayerState
   * @method setPlayerState_
   * @param {String} state State to set
   * @private
   */
  setPlayerState_(state) {
    const states = Object.values(this.states);
    this.STATE_ = states.includes(state) ? state : this.states.ERROR;
    states
        .filter((i) => i !== state)
        .forEach((i) => Blockly.utils.dom.removeClass(this.playButtonElement_, i));
    Blockly.utils.dom.addClass(this.playButtonElement_, this.state);
    this.emitter_.emit('state', this.state);
  }

  /**
   * Play
   * @method play
   * @public
   */
  play() {
    if (!this.surfer_ || !this.getValue() || this.state === this.states.LOADING) {
      return;
    }
    if (!this.surfer_.loaded) {
      this.surfer_.queued = true;
      this.load();
    } else {
      this.surfer_.playPause();
    }
  }

  /**
   * Load
   * @method load
   * @param {String} src File SRC/URL
   * @public
   */
  load(src) {
    if (this.state === this.states.LOADING) {
      return;
    }
    this.setPlayerState_(this.states.LOADING);
    this.setValue(src);
    this.createSurfer_();
    const _src = this.getValue() || '';
    if (_src) {
      this.surfer_.load(_src);
    }
  }

  /**
   * Unload
   * @method Unload
   * @param {Boolean} [reload] - reload surfer instance.
   * @public
   */
  unload(reload = true) {
    if ([
      this.states.NOTLOADED,
      this.states.UNLOADED,
    ].includes(this.state)) {
      return;
    }
    this.setValue('');
    this.setPlayerState_(this.states.UNLOADED);
    if (this.surfer_) {
      this.surfer_.reload = reload;
      this.surfer_.destroy();
    }
  }

  /**
   * Stop
   * @method Stop
   * @public
   */
  stop() {
    if (this.surfer_) {
      this.surfer_.stop();
    }
  }

  /**
   * Pause
   * @method Pause
   * @public
   */
  pause() {
    if (this.surfer_) {
      this.surfer_.pause();
    }
  }

  /**
   * Create surfer instance
   * @method createSurfer_
   * @private
   * @return {Object} Surfer object
   */
  createSurfer_() {
    if (this.surfer_) {
      return this.surfer_;
    }

    this.surfer_ = WaveSurfer.create({
      container: this.waveElement_,
      barWidth: 2,
      barMinHeight: 1,
      height: this.size_.height - 4,
      hideScrollbar: true,
      cursorWidth: 0,
      backgroundColor: this.backgroundColor,
      waveColor: this.secondaryColor,
      progressColor: this.primaryColor,
      xhr: {
        cache: 'force-cache',
        credentials: 'include',
      }});

    this.surfer_.on('ready', () => {
      this.surfer_.loaded = true;
      this.setCounter_(0, this.surfer_.getDuration());
      this.setPlayerState_(this.states.LOADED);
      this.surfer_.queued && this.surfer_.play();
    });

    this.surfer_.on('audioprocess', (pos) => {
      if (this.sourceBlock_.disposed) {
        this.stop();
        this.unload();
      }
      this.setCounter_(pos, this.surfer_.getDuration());
    });

    this.surfer_.on('error', (error) => {
      console.error(error);
      this.setPlayerState_(this.STATES_.ERROR);
    });

    this.surfer_.on('play', () => {
      this.setPlayerState_(this.STATES_.PLAYING);
    });

    this.surfer_.on('pause', (error) => {
      this.setPlayerState_(this.STATES_.PAUSED);
    });

    this.surfer_.on('seek', (progress) => {
      this.setCounter_(this.surfer_.getDuration() * progress, this.surfer_.getDuration());
    });

    this.surfer_.on('destroy', () => {
      const {reload} = this.surfer_;
      this.surfer_ = null;
      if (reload) {
        this.createSurfer_().drawBuffer();
      }
    });

    this.setCounter_(0, 0);
    return this.surfer_;
  }

  /**
   * Render
   * @protected
   */
  render_() {
    this.createSurfer_().drawBuffer();
    if (this.getValue()) {
      if (this.AUTOLOAD) {
        this.load();
      } else {
        this.setPlayerState_(this.states.READYTOLOAD);
      }
    } else {
      this.setPlayerState_(this.states.NOTLOADED);
    }
  }

  /**
   * formatCounter_
   * @protected
   * @param {Number} [pos=0] Current position
   * @return {String} Counter string
   */
  formatCounter_(pos = 0) {
    const minute = Math.floor(pos / 60);
    const seconds = Math.ceil(pos % 60);
    return `${minute}:${(seconds < 10 ? '0' + seconds : seconds)}`;
  }

  /**
   * setCounter_
   * @protected
   * @param {Number} [current] Current position
   * @param {Number} [duration] Track duration
   * @return {String} Counter string
   */
  setCounter_(current, duration) {
    return this.counterElement_.innerHTML =
      `${this.formatCounter_(current)} / ${this.formatCounter_(duration)}`;
  }

  /**
   * On event
   * @param {String} eventName Name of event
   * @param {Function} fn Callback
   * @return {Function} Unsubscribe
   */
  on(eventName, fn) {
    return this.emitter_.on(eventName, fn);
  }

  /**
   * Current player state.
   * @public
   * @return {String} state
   */
  get state() {
    return this.STATE_;
  }

  /**
   * Get all available player states.
   * @public
   * @method states
   * @return {Array} states array
   */
  get states() {
    return this.STATES_;
  }

  /**
   * Construct a FieldPlayer from a JSON arg object,
   * dereferencing any string table references.
   * @param {!Object} options A JSON object with options (text, and class).
   * @return {!FieldPlayer} The new field instance.
   * @package
   * @nocollapse
   */
  static fromJson(options) {
    return new FieldPlayer(options['src'], options['options']);
  }
}

/**
 * CSS for multiline field.  See css.js for use.
 */
Blockly.Css.register(`
@keyframes spin {
  0% {
      stroke-dashoffset: -210;
  }

  100% {
      stroke-dashoffset: 210;
  }
}

#wrapper {
  font-family: sans-serif;
  font-size: 14px;
  display: flex;
  align-items: center;
  padding-top: 3px;
  border-radius: 5px;
  box-shadow: rgba(149, 157, 165, 0.2) 0px 8px 24px;
}

#wrapper #counter {
  overflow: hidden;
}

#wave {
  width: 180px;
  margin: 0 10px 0 5px;
}

#play-btn {
  margin: 0 5px 0 10px;
}

#play-btn #pause-icon {
  display: none;
}

#play-btn {
  cursor: pointer;
}

#play-btn > #play-stroke-disabled {
  display: none;
}

#play-btn.notloaded,
#play-btn.unloaded,
#play-btn.error,
#play-btn.loading {
  cursor: default;
}

#play-btn.notloaded > #play-stroke,
#play-btn.unloaded > #play-stroke,
#play-btn.error > #play-stroke {
  display: none;
}

#play-btn.notloaded > #play-stroke-disabled,
#play-btn.unloaded > #play-stroke-disabled,
#play-btn.error > #play-stroke-disabled {
  display: block;
}

#play-btn.loading > #play-stroke {
  stroke-dashArray: 210;
  fill-opacity: 0 !important;
  animation: spin 1s infinite;
}

#play-btn.playing > #pause-icon {
  display: block;
}

#play-btn.playing > #play-icon {
  display: none;
}

#play-btn #play-stroke {
  stroke-dashoffset: 0;
  stroke-width: 5px;
}

#play-btn #play-icon {
  transform: scale(.8);
  transform-origin: 50% 50%;
}

 `);

/**
 * The default value for this field.
 * @type {*}
 * @protected
 */
FieldPlayer.prototype.DEFAULT_VALUE = '';

Blockly.fieldRegistry.register('field_player', FieldPlayer);

Blockly.FieldPlayer = FieldPlayer;
