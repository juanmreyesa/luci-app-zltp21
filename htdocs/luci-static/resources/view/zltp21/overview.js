'use strict';
'require dom';
'require poll';
'require rpc';
'require view';
'require zltp21';

var callStatus = rpc.declare({
	object: 'luci.zltp21',
	method: 'status',
	expect: {}
});

function table(rows) {
	return E('table', { 'class': 'table' }, rows.map(function(row) {
		return E('tr', { 'class': 'tr' }, [
			E('td', { 'class': 'td left', 'width': '40%' }, [ row[0] ]),
			E('td', { 'class': 'td left' }, [ row[1] == null || row[1] === '' ? '-' : String(row[1]) ])
		]);
	}));
}

return view.extend({
	statusView: function(data) {
		if (data.error)
			return E('div', { 'class': 'alert-message error' }, [ data.error ]);

		return E('div', {}, [
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('Connection') ]),
				table([
					[ _('Operator'), data.network_provider ],
					[ _('Network'), data.network_type ],
					[ _('State'), data.modem_main_state ],
					[ _('Data session'), data.ppp_status ],
					[ _('WAN address'), data.wan_ipaddr ],
					[ _('LTE band'), zltp21.bandLabel(data.lte_band) ],
					[ _('Cell ID'), data.cell_id ],
					[ _('PCI'), data.pci ],
					[ _('LAC / TAC'), data.lac_code ]
				])
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('Signal') ]),
				table([
					[ _('Signal bars'), data.signalbar ],
					[ _('RSSI'), data.rssi ? '%s dBm'.format(data.rssi) : '-' ],
					[ _('RSRP'), data.lte_rsrp ? '%s dBm'.format(data.lte_rsrp) : '-' ],
					[ _('RSRQ'), data.lte_rsrq ? '%s dB'.format(data.lte_rsrq) : '-' ],
					[ _('SINR / SNR'), data.sinr || data.lte_snr ]
				])
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('Usage') ]),
				table([
					[ _('Current download'), zltp21.formatBytes(data.realtime_rx_bytes) ],
					[ _('Current upload'), zltp21.formatBytes(data.realtime_tx_bytes) ],
					[ _('Monthly download'), zltp21.formatBytes(data.monthly_rx_bytes) ],
					[ _('Monthly upload'), zltp21.formatBytes(data.monthly_tx_bytes) ],
					[ _('Unread SMS'), data.sms_unread_num ]
				])
			])
		]);
	},

	load: callStatus,

	render: function(data) {
		poll.add(L.bind(function() {
			return callStatus().then(L.bind(function(update) {
				dom.content(document.getElementById('zltp21-status'), this.statusView(update));
			}, this));
		}, this), 5);

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, [ _('ZLT P21') ]),
			E('div', { 'class': 'cbi-map-descr' }, [ _('Live LTE modem status. Updated every five seconds.') ]),
			E('div', { 'id': 'zltp21-status' }, [ this.statusView(data) ])
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
