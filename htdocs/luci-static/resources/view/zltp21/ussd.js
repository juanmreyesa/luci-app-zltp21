'use strict';
'require dom';
'require ui';
'require view';
'require zltp21';

function sleep(ms) {
	return new Promise(function(resolve) { window.setTimeout(resolve, ms); });
}

return view.extend({
	// The answer shows up asynchronously in ussd_data; the stock UI waits up to 30 s.
	poll: function(tries) {
		return zltp21.get('ussd_write_flag,ussd_data,ussd_action,ussd_dcs').then(L.bind(function(r) {
			if (r.ussd_data || tries <= 0)
				return r;
			return sleep(1000).then(L.bind(this.poll, this, tries - 1));
		}, this));
	},

	show: function(r) {
		var text = r.ussd_data ? zltp21.decodeUcs2(r.ussd_data) : _('No answer from the network.');
		dom.content(document.getElementById('ussd-answer'), E('pre', { 'style': 'white-space:pre-wrap' }, [ text ]));
		// ussd_action 1 = the network expects a reply.
		document.getElementById('ussd-reply-box').style.display = r.ussd_action == '1' ? '' : 'none';
	},

	handleUssd: function(op, inputId) {
		var input = inputId ? document.getElementById(inputId).value.trim() : '';
		var fields = { USSD_operator: op, notCallback: 'true' };

		if (inputId && !/^[0-9*#+]+$/.test(input)) {
			ui.addNotification(null, E('p', {}, [ _('Enter a valid USSD code.') ]), 'error');
			return;
		}
		if (op == 'ussd_send') fields.USSD_send_number = input;
		if (op == 'ussd_reply') fields.USSD_reply_number = input;

		dom.content(document.getElementById('ussd-answer'), E('em', { 'class': 'spinning' }, [ _('Waiting for the network…') ]));
		return zltp21.run('USSD_PROCESS', fields).then(L.bind(function() {
			if (op == 'ussd_cancel') {
				dom.content(document.getElementById('ussd-answer'), '');
				document.getElementById('ussd-reply-box').style.display = 'none';
				return;
			}
			return this.poll(30).then(L.bind(this.show, this));
		}, this));
	},

	render: function() {
		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, [ _('USSD') ]),
			E('div', { 'class': 'cbi-map-descr' }, [ _('Send USSD codes such as balance queries through the modem.') ]),
			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'ussd-code' }, [ _('Code') ]),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', { 'id': 'ussd-code', 'type': 'text', 'placeholder': '*222#' }), ' ',
						E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleUssd', 'ussd_send', 'ussd-code') }, [ _('Send') ])
					])
				]),
				E('div', { 'id': 'ussd-answer' }),
				E('div', { 'id': 'ussd-reply-box', 'class': 'cbi-value', 'style': 'display:none' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'ussd-reply' }, [ _('Reply') ]),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', { 'id': 'ussd-reply', 'type': 'text' }), ' ',
						E('button', { 'class': 'btn cbi-button-action', 'click': ui.createHandlerFn(this, 'handleUssd', 'ussd_reply', 'ussd-reply') }, [ _('Reply') ]), ' ',
						E('button', { 'class': 'btn cbi-button-negative', 'click': ui.createHandlerFn(this, 'handleUssd', 'ussd_cancel', null) }, [ _('End session') ])
					])
				])
			])
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
