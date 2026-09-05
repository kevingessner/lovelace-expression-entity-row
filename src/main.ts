/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, nothing, TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import pjson from "../package.json";
import { EntityConfig } from "custom-card-helpers";
import { HassEntities } from 'home-assistant-js-websocket';

import { Conversions, EnergyCollection,
  getEnergyDataCollection,
  getStatistics,
} from './energy';
import { SubscribeMixin } from './subscribe-mixin';
import { computeStateDisplay, createEntityNotFoundWarning, createEntityErrorWarning } from './utils';
import { ExpressionConfig, parseExpression } from './expression';


export interface EnergyEntityConfig extends EntityConfig {
  round?: number;
  expression?: ExpressionConfig;
}

declare global {
  interface HTMLElementEventMap {
    "ll-custom": CustomEvent;
  }
}

const ENERGY_DATA_TIMEOUT = 10000;

class EnergyEntityRow extends SubscribeMixin(LitElement) {


  @state() private states: HassEntities = {};
  @state() private error?: Error;
  @state() private config!: EnergyEntityConfig;
  @state() private _openDialog: boolean = false;
  @state() private _loading: boolean = true;

  constructor() {
      super();
      document.body.addEventListener("ll-custom", this._handleCustomEvent);
  }

  /** Used by HA's custom element machinery. */
  setConfig(config?: EnergyEntityConfig) {
      if (!config) {
          throw new Error("Invalid configuration");
      }
      this.config = config;
  }

  shouldUpdate() {
    return true;
  }

  public hassSubscribe() {
    /*
     * This methode is imported from ha-sankey-chart and is licensed under
     * MIT licence
     * It was slighly modified to fit needs
     */
    const start = Date.now();
    const getEnergyDataCollectionPoll = (
      resolve: (value: EnergyCollection | PromiseLike<EnergyCollection>) => void,
      reject: (reason?: any) => void,
    ) => {
      if (!this.hass) {
          reject(new Error('no hass'));
          return;
      }
      const energyCollection = getEnergyDataCollection(this.hass);
      if (energyCollection) {
        resolve(energyCollection);
      } else if (Date.now() - start > ENERGY_DATA_TIMEOUT) {
        console.debug(getEnergyDataCollection(this.hass));
        reject(
          new Error('No energy data received. Make sure to add a `type: energy-date-selection` card to this screen.'),
        );
      } else {
        setTimeout(() => getEnergyDataCollectionPoll(resolve, reject), 100);
      }
    };
    const energyPromise = new Promise<EnergyCollection>(getEnergyDataCollectionPoll);
    setTimeout(() => {
      if (!this.error && !Object.keys(this.states).length) {
        this.error = new Error('Something went wrong. No energy data received.');
        console.debug(this.error, getEnergyDataCollection(this.hass));
      }
    }, ENERGY_DATA_TIMEOUT * 2);
    energyPromise.catch(err => {
      this.error = err;
      this._loading = false;
    });
    return [
      energyPromise.then(async collection => {
        return collection.subscribe(async data => {
          this.error = undefined; // reset to clean state
          // dummy conversions to stay compatible with getStatistics expected args
          // TODO implement conversion
          const conversions: Conversions = {
            convert_units_to: "",
            co2_intensity_entity: "",
            gas_co2_intensity: 0,
            electricity_price: null,
            gas_price: null,
          };
          let entities = [this.config.entity];
          if (this.config.expression) {
            const parsed = parseExpression(this.config.expression);
            if (parsed instanceof Error) {
              this.error = parsed;
            } else {
              entities = entities.concat(parsed.entities());
            }
          }
          const stats = await getStatistics(this.hass!, data, entities, conversions);
          const states: HassEntities = {};
          Object.keys(stats).forEach(id => {
            if (this.hass!.states[id] && stats[id] !== null) {
              states[id] = {
                ...this.hass!.states[id],
                state: stats[id]!.toString(),
              };
            }
          });
          this.states = states;
          this._loading = false;
          this.requestUpdate();
        });
      }),
    ];
  }

  private _handleCustomEvent = (e: CustomEvent) => {
      if (e.detail.expression_entity_row && e.detail.expression_entity_row.self === this) {
          this._openDialog = true;
          this.requestUpdate();
      }
  }
  private _closeDialog = () => {
      this._openDialog = false;
      this.requestUpdate();
  }

  render() {
    const stateObj = this.states[this.config.entity];
    let state: string | undefined = undefined;
    let title: string = '';
    let dialog: TemplateResult = html``;
    if (this.config.expression && !this._loading) {
      const parsed = parseExpression(this.config.expression);
      if (parsed instanceof Error) {
          this.error = parsed;
      } else {
        const res = parsed.evaluate(this.states);
        if (res instanceof Error) {
            this.error = res;
        } else {
            state = res.toString();
            title = parsed.toString();
            dialog = html`
                <ha-adaptive-dialog
                  .hass=${this.hass}
                  .open=${this._openDialog}
                  header-title="Expression for ${this.config.name || stateObj.attributes.friendly_name || stateObj.entity_id}"
                  @closed=${this._closeDialog}
                >
                  <div>${title}</div>
                </ha-adaptive-dialog>
            `;
        }
      }
    }
    const options: Intl.NumberFormatOptions = {};
    if (this.config.round !== null) {
      options.maximumFractionDigits = this.config.round ?? 2;
    }
    const rowConfig = { ...this.config, tap_action: { action: "fire-dom-event", expression_entity_row: { self: this } } };

    return html`
      <div>
        ${(!this.config || !this.hass)
          ? nothing
          : (!!this.error)
            ? html`<hui-warning>${createEntityErrorWarning(this.error, this.config.entity)}</hui-warning>`
            : (!stateObj)
              ? ((this._loading)
                ? html`<ha-spinner size="tiny"></ha-spinner>`
                : html`<hui-warning>${createEntityNotFoundWarning(this.hass, this.config.entity)}</hui-warning>`)
              : html`
                <hui-generic-entity-row .hass=${this.hass} .config=${rowConfig}>
                  <div
                    class="text-content value"
                    title="${title}"
                  >
                    ${computeStateDisplay(
                      this.hass!.localize,
                      stateObj,
                      this.hass.locale,
                      state,
                      options,
                    )}
                  </div>
                </hui-generic-entity-row>
                ${dialog}
              `
        }
      </div>
    `;
  }
}

if (!customElements.get("expression-entity-row")) {
  customElements.define("expression-entity-row", EnergyEntityRow);
  console.info(
    `%c expression-entity-row %c Version ${pjson.version} `,
    'color: orange; font-weight: bold; background: black',
    'color: white; font-weight: bold; background: dimgray',
  );
}

