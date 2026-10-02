'use strict';
'require form';
'require uci';
'require ui';
'require view';
'require zltp21';

var CMDS = 'hardware_version,cr_version,wa_inner_version,imei,sim_imsi,msisdn,mac_address,lan_ipaddr,lan_netmask,' +
	'dhcpEnabled,dhcpStart,dhcpEnd,realtime_time,pin_status';

function duration(s) {
	s = +s || 0;
	return '%dh %02dm'.format(Math.floor(s / 3600), Math.floor(s % 3600 / 60));
}

return view.extend({
	load: function() {
		return Promise.all([ zltp21.get(CMDS), uci.load('zltp21') ]);
	},

	render: function(data) {
		var info = data[0];
		if (info.error)
			return E('div', { 'class': 'alert-message error' }, [ info.error ]);

		var m = new form.JSONMap({ m: info }, _('ZLT P21 system'), _('Device information and maintenance.'));
		var s, o;

		s = m.section(form.NamedSection, 'm', 'm', _('Device'));
		[ [ 'hardware_version', _('Hardware') ], [ 'cr_version', _('Firmware') ], [ 'imei', 'IMEI' ],
		  [ 'sim_imsi', 'IMSI' ], [ 'msisdn', _('Phone number') ], [ 'pin_status', _('SIM PIN status') ],
		  [ 'lan_ipaddr', _('LAN address') ], [ 'lan_netmask', _('LAN netmask') ] ].forEach(function(f) {
			s.option(form.DummyValue, f[0], f[1]);
		});
		o = s.option(form.DummyValue, '_dhcp', _('DHCP'));
		o.cfgvalue = function() { return info.dhcpEnabled == '1' ? '%s – %s'.format(info.dhcpStart, info.dhcpEnd) : _('Off'); };
		o = s.option(form.DummyValue, '_uptime', _('Data session time'));
		o.cfgvalue = function() { return duration(info.realtime_time); };

		s = m.section(form.NamedSection, 'm', 'm', _('Maintenance'));

		o = s.option(form.Button, '_reboot', _('Reboot modem'));
		o.inputstyle = 'action';
		o.onclick = function() {
			if (!confirm(_('Reboot the modem? Mobile data drops for about a minute.')))
				return;
			return zltp21.run('REBOOT_DEVICE').then(function() {
				ui.addNotification(null, E('p', {}, [ _('The modem is rebooting.') ]), 'info');
			});
		};

		o = s.option(form.Button, '_password', _('Admin password'),
			_('Changes the modem web password and stores it here so this app keeps working.'));
		o.inputtitle = _('Change…');
		o.inputstyle = 'action';
		o.onclick = function() {
			var input = E('input', { 'type': 'password', 'class': 'cbi-input-password' });
			ui.showModal(_('New modem password'), [
				input,
				E('div', { 'class': 'right' }, [
					E('button', { 'class': 'btn', 'click': ui.hideModal }, [ _('Cancel') ]), ' ',
					E('button', { 'class': 'btn cbi-button-positive', 'click': function() {
						var pw = input.value;
						if (pw.length < 4)
							return;
						var user = uci.get('zltp21', 'main', 'username') || 'admin';
						return zltp21.run('CHANGE_PASSWORD', {
							oldPassword: zltp21.b64encode(uci.get('zltp21', 'main', 'password')),
							newPassword: zltp21.b64encode(pw),
							newUsername: zltp21.b64encode(user)
						}).then(function(r) {
							ui.hideModal();
							if (r && r.result == 'success') {
								uci.set('zltp21', 'main', 'password', pw);
								return uci.save().then(function() { return uci.apply(); });
							}
						});
					} }, [ _('Save') ])
				])
			]);
		};

		o = s.option(form.Button, '_factory', _('Factory reset'),
			_('Erases all modem settings, including Wi-Fi and the admin password.'));
		o.inputstyle = 'negative';
		o.onclick = function() {
			if (prompt(_('Type FACTORY to reset the modem to factory settings.')) !== 'FACTORY')
				return;
			return zltp21.run('RESTORE_FACTORY_SETTINGS');
		};

		return m.render();
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
