'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.join(__dirname, '..', 'htdocs/luci-static/resources/zltp21.js'), 'utf8');
// ponytail: minimal stand-in for LuCI's String.prototype.format (only %s)
String.prototype.format = function() { let i = 0; const a = arguments; return this.replace(/%s/g, () => a[i++]); };
const helper = new Function('baseclass', source)({ extend: (o) => o });

assert.strictEqual(helper.encodeUcs2('Hola ñ'), '0048006f006c0061002000f1');
assert.strictEqual(helper.decodeUcs2('0048006f006c0061002000f1'), 'Hola ñ');
assert.strictEqual(helper.decodeUcs2('plain text'), 'plain text');
assert.strictEqual(helper.encodeUcs2('📶'), 'd83ddcf6');
assert.strictEqual(helper.formatDate('26,10,02,01,02,38,-12'), '2026-10-02 01:02');
assert.strictEqual(helper.formatDate(''), '-');

console.log('helper checks passed');
