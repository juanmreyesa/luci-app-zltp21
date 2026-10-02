'use strict';

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

function bandLabel(value) {
	return value ? 'B%s'.format(value) : '-';
}

return {
	encodeUcs2: encodeUcs2,
	decodeUcs2: decodeUcs2,
	formatBytes: formatBytes,
	formatDate: formatDate,
	bandLabel: bandLabel
};
