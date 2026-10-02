'use strict';
'require dom';
'require rpc';
'require ui';
'require view';
'require zltp21';

var listMessages = rpc.declare({ object: 'luci.zltp21', method: 'sms_list', expect: {} });
var sendMessage = rpc.declare({ object: 'luci.zltp21', method: 'sms_send', params: [ 'number', 'message_hex' ], expect: {} });
var deleteMessage = rpc.declare({ object: 'luci.zltp21', method: 'sms_delete', params: [ 'id' ], expect: {} });

return view.extend({
	notifyError: function(message) {
		ui.addNotification(null, E('p', {}, [ message ]), 'error');
	},

	messageTable: function(data) {
		if (data.error)
			return E('div', { 'class': 'alert-message error' }, [ data.error ]);

		var messages = data.messages || data.sms_data || [];
		if (!messages.length)
			return E('em', {}, [ _('No messages.') ]);

		return E('table', { 'class': 'table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, [ _('From') ]),
				E('th', { 'class': 'th' }, [ _('Date') ]),
				E('th', { 'class': 'th' }, [ _('Message') ]),
				E('th', { 'class': 'th cbi-section-actions' })
			])
		].concat(messages.map(L.bind(function(message) {
			var id = String(message.id == null ? message.msg_id : message.id);
			return E('tr', { 'class': 'tr', 'style': message.tag == '1' ? 'font-weight:bold' : '' }, [
				E('td', { 'class': 'td' }, [ message.number || message.phone || '-' ]),
				E('td', { 'class': 'td' }, [ zltp21.formatDate(message.date || message.time) ]),
				E('td', { 'class': 'td' }, [ zltp21.decodeUcs2(message.content || message.message) ]),
				E('td', { 'class': 'td cbi-section-actions' }, [
					message.tag == '1' ? E('button', {
						'class': 'btn cbi-button-action',
						'type': 'button',
						'click': ui.createHandlerFn(this, 'handleRead', id)
					}, [ _('Mark read') ]) : '',
					' ',
					E('button', {
						'class': 'btn cbi-button-negative',
						'type': 'button',
						'click': ui.createHandlerFn(this, 'handleDelete', id)
					}, [ _('Delete') ])
				])
			]);
		}, this))));
	},

	refresh: function() {
		return listMessages().then(L.bind(function(data) {
			dom.content(document.getElementById('zltp21-messages'), this.messageTable(data));
		}, this));
	},

	handleRead: function(id) {
		return zltp21.run('SET_MSG_READ', { msg_id: id + ';', tag: '0' }).then(L.bind(this.refresh, this));
	},

	handleDelete: function(id) {
		if (!window.confirm(_('Delete this message?')))
			return;

		return deleteMessage(id).then(L.bind(function(result) {
			if (result.error)
				this.notifyError(result.error);
			else
				return this.refresh();
		}, this));
	},

	handleSend: function() {
		var number = document.getElementById('zltp21-number').value.trim();
		var message = document.getElementById('zltp21-message').value;

		if (!/^\+?[0-9]+$/.test(number) || !message) {
			this.notifyError(_('Enter a valid phone number and message.'));
			return;
		}

		return sendMessage(number, zltp21.encodeUcs2(message)).then(L.bind(function(result) {
			if (result.error) {
				this.notifyError(result.error);
				return;
			}
			document.getElementById('zltp21-message').value = '';
			ui.addNotification(null, E('p', {}, [ _('Message sent.') ]), 'info');
			return this.refresh();
		}, this));
	},

	load: listMessages,

	render: function(data) {
		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, [ _('SMS') ]),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('New message') ]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'zltp21-number' }, [ _('Phone number') ]),
					E('div', { 'class': 'cbi-value-field' }, [ E('input', { 'id': 'zltp21-number', 'type': 'tel' }) ])
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'zltp21-message' }, [ _('Message') ]),
					E('div', { 'class': 'cbi-value-field' }, [ E('textarea', { 'id': 'zltp21-message', 'maxlength': 70, 'rows': 4 }) ])
				]),
				E('div', { 'class': 'cbi-page-actions' }, [
					E('button', { 'class': 'btn cbi-button-positive', 'type': 'button', 'click': ui.createHandlerFn(this, 'handleSend') }, [ _('Send') ])
				])
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('Inbox') ]),
				E('div', { 'id': 'zltp21-messages' }, [ this.messageTable(data) ]),
				E('div', { 'class': 'cbi-page-actions' }, [
					E('button', { 'class': 'btn cbi-button-action', 'type': 'button', 'click': ui.createHandlerFn(this, 'refresh') }, [ _('Refresh') ])
				])
			])
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
