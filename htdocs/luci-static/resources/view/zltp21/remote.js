'use strict';
'require form';
'require view';
'require zltp21';

var CMDS = 'DDNS_Enable,DDNS_Mode,DDNSProvider,DDNSAccount,DDNSPassword,DDNS,DDNS_Hash_Value,' +
	'allow_login_from_wan,web_used_port,RemoteManagement,WANPingFilter,' +
	'tr069_use_test_config,tr069_app_enable,tr069_ServerURL,tr069_PeriodicInformEnable,tr069_PeriodicInformInterval,' +
	'tr069_ACS_auth,tr069_ServerUsername,tr069_ServerPassword,tr069_CPE_auth,tr069_ConnectionRequestUname,' +
	'tr069_ConnectionRequestPassword,tr069_apn_enable,tr069_apn';

function flag(s, key, title, descr) {
	var o = s.option(form.Flag, key, title, descr);
	o.rmempty = false;
	return o;
}

return view.extend({
	load: function() {
		return zltp21.get(CMDS);
	},

	render: function(info) {
		if (info.error)
			return E('div', { 'class': 'alert-message error' }, [ info.error ]);

		this.orig = Object.assign({}, info);

		var m = new form.JSONMap({ m: info }, _('ZLT P21 remote access'), _('Dynamic DNS, management from the WAN side and the operator TR-069 client.'));
		var s, o;
		this.map = m;

		s = m.section(form.NamedSection, 'm', 'm', _('Dynamic DNS'));
		flag(s, 'DDNS_Enable', _('Enable'));
		o = s.option(form.ListValue, 'DDNSProvider', _('Provider'));
		o.value('dyndns', 'dyndns.org');
		o.value('no-ip', 'no-ip.com');
		o.depends('DDNS_Enable', '1');
		o = s.option(form.ListValue, 'DDNS_Mode', _('Mode'));
		o.value('auto', _('Automatic'));
		o.value('manual', _('Manual'));
		o.depends('DDNS_Enable', '1');
		o = s.option(form.Value, 'DDNS', _('Hostname'));
		o.datatype = 'hostname';
		o.depends('DDNS_Enable', '1');
		o = s.option(form.Value, 'DDNSAccount', _('Account'));
		o.depends('DDNS_Enable', '1');
		o = s.option(form.Value, 'DDNSPassword', _('Password'));
		o.password = true;
		o.depends('DDNS_Enable', '1');

		s = m.section(form.NamedSection, 'm', 'm', _('WAN access'));
		o = s.option(form.Flag, 'allow_login_from_wan', _('Web login from WAN'));
		o.enabled = 'yes';
		o.disabled = 'no';
		o.rmempty = false;
		o = s.option(form.Value, 'web_used_port', _('WAN web port'));
		o.datatype = 'port';
		o.depends('allow_login_from_wan', 'yes');
		flag(s, 'RemoteManagement', _('Remote management'));
		flag(s, 'WANPingFilter', _('Block ping from WAN'));

		s = m.section(form.NamedSection, 'm', 'm', _('TR-069 (operator ACS)'),
			_('Lets the operator manage the modem remotely, including pushing locks and firmware.'));
		flag(s, 'tr069_app_enable', _('Enable'));
		flag(s, 'tr069_PeriodicInformEnable', _('Periodic inform'));
		o = s.option(form.Value, 'tr069_PeriodicInformInterval', _('Inform interval (s)'));
		o.datatype = 'uinteger';
		o = s.option(form.Value, 'tr069_ServerURL', _('ACS URL'));
		o = s.option(form.Value, 'tr069_ServerUsername', _('ACS username'));
		o = s.option(form.Value, 'tr069_ServerPassword', _('ACS password'));
		o.password = true;

		return m.render();
	},

	handleSave: function() {
		return zltp21.saveGroups(this.map, this.orig, [
			{ goform: 'DDNS', keys: [ 'DDNS_Enable', 'DDNSProvider', 'DDNS_Mode', 'DDNS', 'DDNSAccount', 'DDNSPassword' ],
			  fields: function(v) {
				if (v.DDNS_Enable != '1')
					return { DDNS_Enable: '0' };
				return { DDNS_Enable: '1', DDNS_Mode: v.DDNS_Mode, DDNSProvider: v.DDNSProvider, DDNS: v.DDNS,
					DDNSAccount: v.DDNSAccount, DDNSPassword: v.DDNSPassword, DDNS_Hash_Value: v.DDNS_Hash_Value || '' };
			  } },
			{ goform: 'PORT_SETTINGS', keys: [ 'allow_login_from_wan', 'web_used_port' ],
			  fields: function(v) { return { allow_login_from_wan: v.allow_login_from_wan, web_used_port: v.web_used_port || '80' }; } },
			{ goform: 'FW_SYS', keys: [ 'RemoteManagement', 'WANPingFilter' ],
			  fields: function(v) { return { RemoteManagement: v.RemoteManagement, WANPingFilter: v.WANPingFilter }; } },
			{ goform: 'setTR069Config',
			  keys: [ 'tr069_app_enable', 'tr069_PeriodicInformEnable', 'tr069_PeriodicInformInterval', 'tr069_ServerURL',
			          'tr069_ServerUsername', 'tr069_ServerPassword' ],
			  // The modem rewrites the whole TR-069 profile; untouched fields go back as read.
			  fields: function(v) {
				return {
					configurationMode: v.tr069_use_test_config || '0',
					acsUrl: v.tr069_ServerURL || '',
					periodicInformInterval: v.tr069_PeriodicInformInterval || '28800',
					acsUsername: v.tr069_ServerUsername || '',
					acsPassword: v.tr069_ServerPassword || '',
					cpeUsername: v.tr069_ConnectionRequestUname || '',
					cpePassword: v.tr069_ConnectionRequestPassword || '',
					tr069_apn_enable: v.tr069_apn_enable || '0',
					tr069_apn: v.tr069_apn || '',
					tr069Enable: v.tr069_app_enable,
					periodicInform: v.tr069_PeriodicInformEnable,
					acsAuth: v.tr069_ACS_auth || '0',
					cpeAuth: v.tr069_CPE_auth || '0',
					restartTr069: '1'
				};
			  } }
		]);
	},

	handleSaveApply: null,
	handleReset: null
});
