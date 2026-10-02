'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.join(__dirname, '..', 'htdocs/luci-static/resources/zltp21.js'), 'utf8');
// ponytail: minimal stand-in for LuCI's String.prototype.format (only %s)
String.prototype.format = function() { let i = 0; const a = arguments; return this.replace(/%s/g, () => a[i++]); };
global.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
global.atob = (s) => Buffer.from(s, 'base64').toString('binary');
const helper = new Function('baseclass', 'rpc', 'ui', source)({ extend: (o) => o }, { declare: () => () => {} }, {});

assert.strictEqual(helper.encodeUcs2('Hola ñ'), '0048006f006c0061002000f1');
assert.strictEqual(helper.decodeUcs2('0048006f006c0061002000f1'), 'Hola ñ');
assert.strictEqual(helper.decodeUcs2('plain text'), 'plain text');
assert.strictEqual(helper.encodeUcs2('📶'), 'd83ddcf6');
assert.strictEqual(helper.formatDate('26,10,02,01,02,38,-12'), '2026-10-02 01:02');
assert.strictEqual(helper.formatDate(''), '-');
assert.strictEqual(helper.b64decode(helper.b64encode('clave ñ')), 'clave ñ');
assert.strictEqual(helper.b64encode('admin'), 'YWRtaW4=');
// B3 + B7 + B28 → bits 2,6 of byte 0 and bit 3 of byte 3; B28 alone is not FDD for the stock UI.
assert.deepStrictEqual(helper.lockBandFields([ '3', '7', '28' ], true),
	{ band_state: 'yes', band_list: '68,0,0,8,0,0,0,0', wcdma_list: '0,0,0', tds_list: '0,0', zeact: '1' });
assert.strictEqual(helper.lockBandFields([ '28' ], true).zeact, '0');
assert.strictEqual(helper.lockBandFields([ '3', '40' ], false).zeact, '2');
assert.strictEqual(helper.lockBandFields([], false).band_state, 'no');

console.log('helper checks passed');
