'use strict';
'require baseclass';
'require rpc';
'require ui';

var callGet = rpc.declare({ object: 'luci.zltp21', method: 'get', params: [ 'cmd' ], expect: {} });
var callSet = rpc.declare({ object: 'luci.zltp21', method: 'set', params: [ 'goformId', 'fields' ], expect: {} });

function encodeUcs2(value) {
	var output = '';

	for (var i = 0; i < value.length; i++)
		output += value.charCodeAt(i).toString(16).padStart(4, '0');

	return output;
}

function decodeUcs2(value) {
	if (!value || !/^(?:[0-9a-fA-F]{4})+$/.test(value))
		return value || '';

	var output = '';
	for (var i = 0; i < value.length; i += 4)
		output += String.fromCharCode(parseInt(value.slice(i, i + 4), 16));

	return output;
}

function formatBytes(value) {
	var bytes = Number(value);
	var units = [ 'B', 'KiB', 'MiB', 'GiB', 'TiB' ];
	var unit = 0;

	if (!isFinite(bytes))
		return value || '-';

	while (Math.abs(bytes) >= 1024 && unit < units.length - 1) {
		bytes /= 1024;
		unit++;
	}

	return '%s %s'.format(unit ? bytes.toFixed(1) : bytes, units[unit]);
}

// Modem dates look like "26,10,02,01,02,38,-12" (yy,mm,dd,hh,mm,ss,tz).
function formatDate(value) {
	var p = String(value || '').split(',');

	if (p.length < 6)
		return value || '-';

	return '20%s-%s-%s %s:%s'.format(p[0], p[1], p[2], p[3], p[4]);
}

function b64encode(value) {
	return btoa(unescape(encodeURIComponent(value || '')));
}

function b64decode(value) {
	try { return decodeURIComponent(escape(atob(value || ''))); }
	catch (e) { return ''; }
}

// TZ_SET_LOCK_BAND wants one byte per 8 bands, least significant first:
// band N is bit (N-1) % 8 of byte floor((N-1) / 8), over 8 bytes.
// zeact mirrors the stock UI: 1 if any of B1-B25 is set, 2 if also B33-B43.
function lockBandFields(bands, enabled) {
	var bytes = [ 0, 0, 0, 0, 0, 0, 0, 0 ];
	var fdd = false, tdd = false;

	(bands || []).forEach(function(band) {
		var n = +band;
		bytes[(n - 1) >> 3] |= 1 << ((n - 1) & 7);
		if (n <= 25) fdd = true;
		if (n >= 33 && n <= 43) tdd = true;
	});

	return {
		band_state: enabled ? 'yes' : 'no',
		band_list: bytes.join(','),
		wcdma_list: '0,0,0',
		tds_list: '0,0',
		zeact: String(fdd ? (tdd ? 2 : 1) : 0)
	};
}

function failed(result) {
	return !result || result.error || result.result == 'failure' || result.result == 'fail';
}

// Run one goform; resolves to the reply, notifies on failure.
function run(goformId, fields) {
	return callSet(goformId, fields || {}).then(function(result) {
		if (failed(result))
			ui.addNotification(null, E('p', {}, [ '%s: %s'.format(goformId, (result && (result.error || result.result)) || _('no response')) ]), 'error');
		return result;
	});
}

// Save a JSONMap whose single section 'm' mirrors modem keys, then send only
// the goform groups whose keys changed: [{ goform, keys: [...], fields: fn(values) }].
function saveGroups(map, orig, groups) {
	return map.save(null, true).then(function() {
		var v = map.data.get('json', 'm') || {};
		var todo = groups.filter(function(g) {
			return g.keys.some(function(k) {
				return String(v[k] == null ? '' : v[k]) !== String(orig[k] == null ? '' : orig[k]);
			});
		});

		return todo.reduce(function(chain, g) {
			return chain.then(function() { return run(g.goform, g.fields(v)); });
		}, Promise.resolve()).then(function() {
			if (todo.length)
				ui.addNotification(null, E('p', {}, [ _('Settings sent to the modem.') ]), 'info');
			todo.forEach(function(g) { g.keys.forEach(function(k) { orig[k] = v[k]; }); });
		});
	});
}

function bandLabel(value) {
	return value ? 'B%s'.format(value) : '-';
}

return baseclass.extend({
	encodeUcs2: encodeUcs2,
	decodeUcs2: decodeUcs2,
	formatBytes: formatBytes,
	formatDate: formatDate,
	bandLabel: bandLabel,
	b64encode: b64encode,
	b64decode: b64decode,
	lockBandFields: lockBandFields,
	get: callGet,
	set: callSet,
	run: run,
	saveGroups: saveGroups
});
