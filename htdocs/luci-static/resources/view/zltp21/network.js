'use strict';
'require form';
'require ui';
'require view';
'require zltp21';

var CMDS = 'network_type,network_provider,ppp_status,net_select,apn_mode,wan_apn,m_profile_name,pdp_type,' +
	'mcc,mnc,tz_lock_band_state,tz_lock_plmn_state,tz_lock_plmn_list,use_lock_net';

return view.extend({
	load: function() {
		return Promise.all([ zltp21.get(CMDS), zltp21.set('TZ_GET_LOCK_BAND') ]);
	},

	render: function(data) {
		var info = data[0], lock = data[1] || {};
		if (info.error)
			return E('div', { 'class': 'alert-message error' }, [ info.error ]);

		var bands = Object.keys(lock).filter(function(k) { return /^band\d+$/.test(k); })
			.map(function(k) { return k.slice(4); }).sort(function(a, b) { return a - b; });

		info.band_lock = lock.band_state == 'yes' ? '1' : '0';
		info.bands = bands.filter(function(b) { return lock.band_state == 'yes' && lock['band' + b] == '1'; });
		this.orig = Object.assign({}, info);

		var m = new form.JSONMap({ m: info }, _('ZLT P21 network'), _('Mobile connection, network mode and band lock.'));
		var s, o;
		this.map = m;

		s = m.section(form.NamedSection, 'm', 'm', _('Connection'));
		[ [ 'network_provider', _('Operator') ], [ 'network_type', _('Network') ], [ 'ppp_status', _('Data session') ],
		  [ 'wan_apn', _('APN') ], [ 'apn_mode', _('APN mode') ], [ 'm_profile_name', _('APN profile') ],
		  [ 'pdp_type', _('PDP type') ] ].forEach(function(f) { s.option(form.DummyValue, f[0], f[1]); });
		o = s.option(form.DummyValue, '_plmn', _('MCC / MNC'));
		o.cfgvalue = function() { return '%s / %s'.format(info.mcc || '-', info.mnc || '-'); };

		o = s.option(form.Button, '_connect', _('Data connection'));
		o.inputtitle = info.ppp_status == 'ppp_connected' ? _('Disconnect') : _('Connect');
		o.inputstyle = info.ppp_status == 'ppp_connected' ? 'negative' : 'positive';
		o.onclick = function() {
			var id = info.ppp_status == 'ppp_connected' ? 'DISCONNECT_NETWORK' : 'CONNECT_NETWORK';
			return zltp21.run(id, id == 'CONNECT_NETWORK' ? { notCallback: 'true', disconnect_internet: '0' } : { notCallback: 'true' })
				.then(function() { window.setTimeout(function() { location.reload(); }, 3000); });
		};

		s = m.section(form.NamedSection, 'm', 'm', _('Network mode'));
		o = s.option(form.ListValue, 'net_select', _('Preferred network'));
		o.value('NETWORK_auto', _('Automatic'));
		o.value('Only_LTE', _('LTE only'));
		o.value('TD_W_LTE', _('LTE / 3G'));
		o.value('TD_W', _('3G only'));
		o.value('Only_GSM', _('2G only'));

		s = m.section(form.NamedSection, 'm', 'm', _('Band lock'),
			_('Restricts the modem to the selected LTE bands. A wrong choice can leave it without service.'));
		o = s.option(form.Flag, 'band_lock', _('Lock bands'));
		o.rmempty = false;
		o = s.option(form.MultiValue, 'bands', _('Allowed bands'));
		bands.forEach(function(b) { o.value(b, 'B' + b); });
		o.depends('band_lock', '1');

		s = m.section(form.NamedSection, 'm', 'm', _('Operator lock'));
		s.option(form.DummyValue, 'use_lock_net', _('Network lock'));
		s.option(form.DummyValue, 'tz_lock_plmn_state', _('PLMN lock'));
		s.option(form.DummyValue, 'tz_lock_plmn_list', _('Allowed PLMNs'));

		return m.render();
	},

	handleSave: function() {
		var lock = this.map.lookupOption('band_lock', 'm')[0].formvalue('m');
		var bands = this.map.lookupOption('bands', 'm')[0].formvalue('m');
		if (lock == '1' && !L.toArray(bands).length) {
			ui.addNotification(null, E('p', {}, [ _('Select at least one band to lock.') ]), 'error');
			return Promise.resolve();
		}

		return zltp21.saveGroups(this.map, this.orig, [
			{ goform: 'SET_BEARER_PREFERENCE', keys: [ 'net_select' ],
			  fields: function(v) { return { BearerPreference: v.net_select }; } },
			{ goform: 'TZ_SET_LOCK_BAND', keys: [ 'band_lock', 'bands' ],
			  fields: function(v) { return zltp21.lockBandFields(L.toArray(v.bands), v.band_lock == '1'); } }
		]);
	},

	handleSaveApply: null,
	handleReset: null
});
