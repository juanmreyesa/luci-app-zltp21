'use strict';
'require form';
'require view';

return view.extend({
	render: function() {
		var map = new form.Map('zltp21', _('ZLT P21 settings'),
			_('Connection settings for the modem web interface.'));
		var section = map.section(form.TypedSection, 'zltp21');
		var option;

		section.anonymous = true;
		section.addremove = false;

		option = section.option(form.ListValue, 'scheme', _('Protocol'));
		option.value('http', 'HTTP');
		option.value('https', 'HTTPS');
		option.default = 'http';
		option.rmempty = false;

		option = section.option(form.Value, 'host', _('Modem host'));
		option.datatype = 'host';
		option.placeholder = '192.168.1.1';
		option.rmempty = false;

		option = section.option(form.Value, 'username', _('Username'));
		option.placeholder = 'admin';
		option.rmempty = false;

		option = section.option(form.Value, 'password', _('Password'));
		option.password = true;
		option.rmempty = false;

		option = section.option(form.Value, 'timeout', _('Request timeout'));
		option.datatype = 'range(1,60)';
		option.default = '15';
		option.rmempty = false;

		return map.render();
	}
});
