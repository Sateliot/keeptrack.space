/* eslint-disable no-undefined */
/*globals
  test
*/

import { hex2RgbA, parseRgba, rgbCss, saveCsv, saveVariable, stringPad } from '@app/js/lib/helpers.js';

test('helpers Unit Tests', () => {
  stringPad.pad(5, 3);
  stringPad.pad(5);

  stringPad.padEmpty(5, 3);

  let test = stringPad.pad0('2500', 10);

  saveVariable(test, './test.txt');
  saveVariable(test);

  saveCsv(test, './test.csv');
  saveCsv(test);

  parseRgba('[255,255,255,1]');
  rgbCss(parseRgba('[255,255,255]'));

  hex2RgbA('#FFF');
  hex2RgbA('#FFFFFF');
  hex2RgbA('FFF');
});
