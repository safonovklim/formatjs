/*
 * Copyright 2015, Yahoo Inc.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
import extractRelativeFields, {
  getAllLocales as getAllDateFieldsLocales,
} from './extract-relative';
import extractUnits, {
  getAllLocales as getAllUnitsLocales,
} from './extract-units';
export interface Opts {
  locales?: string[];
}

export function extractAllRelativeFields(options: Opts = {}) {
  // Default to all CLDR locales if none have been provided.
  const locales = options.locales || getAllDateFieldsLocales();
  return extractRelativeFields(locales);
}

export function extractAllUnits(options: Opts = {}) {
  // Default to all CLDR locales if none have been provided.
  const locales = options.locales || getAllUnitsLocales();
  return extractUnits(locales);
}

export {getAllLanguages} from './locales';

export const processAliases = process;
