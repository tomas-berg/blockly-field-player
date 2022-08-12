# blockly-field-player [![Built on Blockly](https://tinyurl.com/built-on-blockly)](https://github.com/google/blockly)

A [Blockly](https://www.npmjs.com/package/blockly) audio player field.

## About

Audio player capabilities right from the Google Blockly Field.

- Interactive audio visualization using Web Audio and Canvas based on [wavesurfer.js](https://wavesurfer-js.org/)
- Public API: `load()`, `unload()`, `play()`, `pause()`, `stop()`
- Player state change events
- Audio source cache
- Audio source [autoload](#autoload)
- XHR fetch with credentials
- Color scheme [configuration](#configuration)

![blockly-field-player](https://raw.githubusercontent.com/tomas-berg/blockly-field-player/main/docs/demo.png)

## Installation

### npm

```bash
npm install --save blockly-field-player
```

### yarn

```bash
yarn add blockly-field-player
```

## Build

```bash
npm run build
```

or

```bash
yarn build
```

## Usage

### JavaScript

```js
import * as Blockly from 'blockly'
import {FieldPlayer} from 'blockly-field-player'

Blockly.Blocks['test_field'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new FieldPlayer('http://localhost/test.mp3'), 'FIELDNAME')
  }
};
```

### JSON

```js
import * as Blockly from 'blockly'
import 'blockly-field-text-box'

Blockly.defineBlocksWithJsonArray([
    {
        "type": "test_field",
        "message0": "%1",
        "args0": [
            {
                "type": "field_player",
                "name": "FIELDNAME",
                "src": "http://localhost/test.mp3"
            }
        ]
    }])
```

### Run in browser

```js
<script src="./dist/index.js"></script>
```

*note: you need to build the package first.*

### Configuration

You can provide options object:

```js
Blockly.defineBlocksWithJsonArray([
    {
        "type": "test_field",
        "message0": "%1",
        "args0": [
            {
                "type": "field_player",
                "name": "FIELDNAME",
                "src": "http://localhost/test.mp3",
                "options": {
                    primaryColor: '#DEA922',
                    secondaryColor: '#E2D0A7',
                    backgroundColor: '#FCF3D8'
                }
            }
        ]
    }])
```

### Options list

- primaryColor
- secondaryColor
- backgroundColor
- autoLoad (see notes about Autoload option)

### Events

You can listen for various of player state events, such as:

- `notloaded`
- `readytoload`
- `unloaded`
- `loading`
- `loaded`
- `playing`
- `paused`
- `error`

Just subscribe to **state** events from the player instance:

```js
Blockly.Blocks['test_field'] = {
  init: function () {
      const player = new FieldPlayer('http://localhost/test.mp3')
      player.on('state', state => console.debug(state))
      this.appendDummyInput().appendField(player, 'FIELDNAME')
  }
};
```

### Autoload

By default, even if media source is provided, player will not load it automatically.
If you want to change this behaviour and load media to cache during field render, set **autoLoad** option to **true**.

```js
const player = new FieldPlayer('http://localhost/test.mp3', { autoLoad: true })
```

## License

Apache 2.0
