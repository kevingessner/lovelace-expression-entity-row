# expression-entity-row

[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)

Display energy entities in an entity card row, and evaluate expressions with that data. This integrate with the builtin
[Energy Date Picker][energy-date-picker] (energy-date-selection)

For installation instructions [see this guide](https://github.com/thomasloven/hass-config/wiki/Lovelace-Plugins).

Install `expression-entity-row.js` as a `module`.

```yaml
resources:
  - url: /local/expression-entity-row.js
    type: module
```

## Usage example

**Note:** This is _not_ a card. It's a row for an [entities](https://www.home-assistant.io/lovelace/entities/).

**Note 2:** To work properly, an `energy-date-selection` card must be included
in the view

![Example GIF](img/energy-entity-row-demo.gif)

```yaml
- type: energy-date-selection
- type: entities
  entities:
    - type: section
      label: Basic energy sensor
    - entity: sensor.all_plug_energy
    - entity: sensor.all_heating_energy
    - type: section
      label: With Energy Entity Row
    - type: custom:expression-entity-row
      entity: sensor.all_plug_energy
    - type: custom:expression-entity-row
      entity: sensor.all_heating_energy
```


## Options

The following options can be added to the element:
- `round`: number of decimal to round number (default to 2). To display all decimal digits, explicitly set this option to `null`

In addition, all basic options can be used:
- `entity` (**required**)
- `name`
- `icon`
- `image`
- `type` (must be set to `custom:expression-entity-row`)

## Acknowlegements

Thanks to:
- Custom Card for the [boilerplate template][template]
- [thomasloven][thomasloven] for all its work and numerous example of lovelace elements
- MindFreeze for [ha-sankey-chart][sankey] which showed how to work with energy stats
- zeronounours for [lovelace-energy-entity-row][zeronounours], which this started as a fork of

[releases-shield]: https://img.shields.io/github/release/kevingessner/lovelace-expression-entity-row.svg?style=for-the-badge
[releases]: https://github.com/kevingessner/lovelace-expression-entity-row/releases
[license-shield]: https://img.shields.io/github/license/kevingessner/lovelace-expression-entity-row.svg?style=for-the-badge
[energy-date-picker]: https://www.home-assistant.io/dashboards/energy/#energy-date-picker
[template]: https://github.com/custom-cards/boilerplate-card
[thomasloven]: https://github.com/thomasloven
[sankey]: https://github.com/MindFreeze/ha-sankey-chart
[zeronounours]: https://github.com/zeronounours/lovelace-energy-entity-row