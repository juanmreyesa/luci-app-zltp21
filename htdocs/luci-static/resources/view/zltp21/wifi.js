'use strict';
'require form';
'require view';
'require zltp21';

var CMDS = 'wifi_cur_state,SSID1,AuthMode,EncrypType,HideSSID,MAX_Access_num,WPAPSK1_encode,NoForwarding,show_qrcode_flag,wifi_band';

return view.extend({
	load: function() {
		return zltp21.get(CMDS);
	},

	render: function(info) {
		if (info.error)
			return E('div', { 'class': 'alert-message error' }, [ info.error ]);

		info.passphrase = zltp21.b64decode(info.WPAPSK1_encode);
		this.orig = Object.assign({}, info);

		var m = new form.JSONMap({ m: info }, _('ZLT P21 Wi-Fi'), _('Main SSID of the modem. Saving restarts its Wi-Fi.'));
		var s = m.section(form.NamedSection, 'm', 'm');
		var o;
		this.map = m;

		o = s.option(form.DummyValue, 'wifi_cur_state', _('Radio'));
		o.cfgvalue = function() { return info.wifi_cur_state == '1' ? _('On') : _('Off'); };

		o = s.option(form.Value, 'SSID1', _('SSID'));
		o.rmempty = false;
		o.datatype = 'maxlength(32)';

		o = s.option(form.Flag, 'HideSSID', _('Hide SSID'));
		o.rmempty = false;

		o = s.option(form.ListValue, 'AuthMode', _('Security'));
		o.value('OPEN', _('None'));
		o.value('WPA2PSK', 'WPA2-PSK');
		o.value('WPAPSKWPA2PSK', 'WPA/WPA2-PSK');

		o = s.option(form.ListValue, 'EncrypType', _('Cipher'));
		o.value('AES', 'AES');
		o.value('TKIP', 'TKIP');
		o.value('TKIPCCMP', 'TKIP + AES');
		o.depends({ AuthMode: 'OPEN', '!reverse': true });

		o = s.option(form.Value, 'passphrase', _('Password'));
		o.password = true;
		o.datatype = 'rangelength(8,63)';
		o.depends({ AuthMode: 'OPEN', '!reverse': true });

		o = s.option(form.Value, 'MAX_Access_num', _('Max clients'));
		o.datatype = 'range(1,32)';

		o = s.option(form.Flag, 'NoForwarding', _('Client isolation'));
		o.rmempty = false;

		return m.render();
	},

	handleSave: function() {
		return zltp21.saveGroups(this.map, this.orig, [
			{ goform: 'SET_WIFI_SSID1_SETTINGS',
			  keys: [ 'SSID1', 'HideSSID', 'AuthMode', 'EncrypType', 'passphrase', 'MAX_Access_num', 'NoForwarding' ],
			  fields: function(v) {
				var open = v.AuthMode == 'OPEN';
				var f = {
					ssid: v.SSID1,
					// Stock UI sends HideSSID here despite the name: 1 = hidden.
					broadcastSsidEnabled: v.HideSSID || '0',
					MAX_Access_num: v.MAX_Access_num,
					security_mode: v.AuthMode,
					cipher: open ? 'NONE' : v.EncrypType,
					NoForwarding: v.NoForwarding || '0',
					show_qrcode_flag: v.show_qrcode_flag || '0',
					security_shared_mode: open ? 'NONE' : v.EncrypType
				};
				if (!open)
					f.passphrase = zltp21.b64encode(v.passphrase);
				return f;
			  } }
		]);
	},

	handleSaveApply: null,
	handleReset: null
});
