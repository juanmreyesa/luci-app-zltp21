'use strict';
'require dom';
'require form';
'require ui';
'require view';
'require zltp21';

var RULES = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ];
var CMDS = 'PortForwardEnable,PortMapEnable,DMZEnable,DMZIPAddress,upnpEnabled,main_nat,main_nat_1,main_nat_2,' +
	RULES.map(function(i) { return 'PortForwardRules_' + i + ',PortMapRules_' + i; }).join(',');

// Rule strings are "ip,port,port,protocol,comment" for both lists.
function parseRules(info, prefix) {
	return RULES.map(function(i) {
		var raw = info[prefix + i];
		return raw ? [ i ].concat(raw.split(',')) : null;
	}).filter(Boolean);
}

function protocolSelect(id) {
	return E('select', { 'id': id, 'class': 'cbi-input-select' },
		[ 'TCP&UDP', 'TCP', 'UDP' ].map(function(p) { return E('option', { 'value': p }, [ p ]); }));
}

function badInput() {
	ui.addNotification(null, E('p', {}, [ _('Enter a valid IP and ports.') ]), 'error');
	return Promise.resolve();
}

function val(id) {
	return document.getElementById(id).value.trim();
}

return view.extend({
	load: function() {
		return zltp21.get(CMDS);
	},

	ruleTable: function(title, heads, rules, delGoform, addRow, addFn) {
		var self = this;
		return E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, [ title ]),
			E('table', { 'class': 'table' }, [
				E('tr', { 'class': 'tr table-titles' }, heads.map(function(h) { return E('th', { 'class': 'th' }, [ h ]); })
					.concat(E('th', { 'class': 'th cbi-section-actions' })))
			].concat(rules.map(function(r) {
				return E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, [ r[1] ]),
					E('td', { 'class': 'td' }, [ r[2] ]),
					E('td', { 'class': 'td' }, [ r[3] ]),
					E('td', { 'class': 'td' }, [ r[4] ]),
					E('td', { 'class': 'td' }, [ r[5] || '' ]),
					E('td', { 'class': 'td cbi-section-actions' }, [
						E('button', { 'class': 'btn cbi-button-negative', 'click': ui.createHandlerFn(self, function() {
							return zltp21.run(delGoform, { delete_id: r[0] + ';' }).then(function() { location.reload(); });
						}) }, [ _('Delete') ])
					])
				]);
			})).concat([
				E('tr', { 'class': 'tr' }, addRow.map(function(c) { return E('td', { 'class': 'td' }, [ c ]); }).concat(
					E('td', { 'class': 'td cbi-section-actions' }, [
						E('button', { 'class': 'btn cbi-button-add', 'click': ui.createHandlerFn(self, function() {
							return addFn().then(function(r) { if (r) location.reload(); });
						}) }, [ _('Add') ])
					])))
			]))
		]);
	},

	render: function(info) {
		if (info.error)
			return E('div', { 'class': 'alert-message error' }, [ info.error ]);

		this.orig = Object.assign({}, info);

		var m = new form.JSONMap({ m: info }, _('ZLT P21 firewall'), _('Port forwarding, port mapping, DMZ, UPnP and NAT on the modem.'));
		var s = m.section(form.NamedSection, 'm', 'm');
		var o;
		this.map = m;

		[ [ 'PortForwardEnable', _('Port forwarding') ], [ 'PortMapEnable', _('Port mapping') ],
		  [ 'upnpEnabled', _('UPnP') ], [ 'DMZEnable', _('DMZ') ] ].forEach(function(f) {
			o = s.option(form.Flag, f[0], f[1]);
			o.rmempty = false;
		});
		o = s.option(form.Value, 'DMZIPAddress', _('DMZ host'));
		o.datatype = 'ip4addr';
		o.depends('DMZEnable', '1');

		[ [ 'main_nat', _('NAT') ], [ 'main_nat_1', _('NAT 1') ], [ 'main_nat_2', _('NAT 2') ] ].forEach(function(f) {
			o = s.option(form.Flag, f[0], f[1]);
			o.rmempty = false;
		});

		var portRe = /^\d{1,5}$/;
		var fwd = this.ruleTable(_('Port forwarding rules'), [ _('LAN IP'), _('First port'), _('Last port'), _('Protocol'), _('Comment') ],
			parseRules(info, 'PortForwardRules_'), 'FW_FORWARD_DEL',
			[ E('input', { 'id': 'pf-ip', 'placeholder': '192.168.1.10' }), E('input', { 'id': 'pf-start', 'size': 6 }),
			  E('input', { 'id': 'pf-end', 'size': 6 }), protocolSelect('pf-proto'), E('input', { 'id': 'pf-comment' }) ],
			function() {
				if (!/^\d+\.\d+\.\d+\.\d+$/.test(val('pf-ip')) || !portRe.test(val('pf-start')) || !portRe.test(val('pf-end') || val('pf-start')))
					return badInput();
				return zltp21.run('FW_FORWARD_ADD', { ipAddress: val('pf-ip'), portStart: val('pf-start'),
					portEnd: val('pf-end') || val('pf-start'), protocol: val('pf-proto'), comment: val('pf-comment') });
			});

		var map = this.ruleTable(_('Port mapping rules'), [ _('LAN IP'), _('WAN port'), _('LAN port'), _('Protocol'), _('Comment') ],
			parseRules(info, 'PortMapRules_'), 'DEL_PORT_MAP',
			[ E('input', { 'id': 'pm-ip', 'placeholder': '192.168.1.10' }), E('input', { 'id': 'pm-from', 'size': 6 }),
			  E('input', { 'id': 'pm-to', 'size': 6 }), protocolSelect('pm-proto'), E('input', { 'id': 'pm-comment' }) ],
			function() {
				if (!/^\d+\.\d+\.\d+\.\d+$/.test(val('pm-ip')) || !portRe.test(val('pm-from')) || !portRe.test(val('pm-to')))
					return badInput();
				return zltp21.run('ADD_PORT_MAP', { portMapEnabled: info.PortMapEnable || '1', ip_address: val('pm-ip'),
					fromPort: val('pm-from'), toPort: val('pm-to'), protocol: val('pm-proto'), comment: val('pm-comment') });
			});

		return m.render().then(function(node) {
			node.appendChild(fwd);
			node.appendChild(map);
			return node;
		});
	},

	handleSave: function() {
		return zltp21.saveGroups(this.map, this.orig, [
			{ goform: 'VIRTUAL_SERVER', keys: [ 'PortForwardEnable' ],
			  fields: function(v) { return { PortForwardEnable: v.PortForwardEnable }; } },
			{ goform: 'ADD_PORT_MAP', keys: [ 'PortMapEnable' ],
			  fields: function(v) { return { portMapEnabled: v.PortMapEnable }; } },
			{ goform: 'UPNP_SETTING', keys: [ 'upnpEnabled' ],
			  fields: function(v) { return { upnp_setting_option: v.upnpEnabled }; } },
			{ goform: 'DMZ_SETTING', keys: [ 'DMZEnable', 'DMZIPAddress' ],
			  fields: function(v) { return v.DMZEnable == '1' ? { DMZEnabled: '1', DMZIPAddress: v.DMZIPAddress } : { DMZEnabled: '0' }; } },
			{ goform: 'NAT_SETTING', keys: [ 'main_nat', 'main_nat_1', 'main_nat_2' ],
			  fields: function(v) { return { main_nat: v.main_nat, main_nat_1: v.main_nat_1, main_nat_2: v.main_nat_2 }; } }
		]);
	},

	handleSaveApply: null,
	handleReset: null
});
