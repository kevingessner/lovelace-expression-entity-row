//const { createDefaultPreset } = require("ts-jest");
import {createDefaultPreset} from "ts-jest";

const tsJestTransformCfg = createDefaultPreset({ diagnostics: { warnOnly: true } }).transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
};
