# luci-app-zltp21

LuCI integration for ZLT/Tozed P21-style LTE routers using the stock `goform` web API.

## Features

- Live operator, connection, cell, LTE band and signal status
- Current and monthly traffic counters
- SMS inbox, send and delete
- Modem address and credentials stored locally in UCI

The browser never connects to the modem directly; the modem password lives in UCI and is only readable by LuCI users with the `luci-app-zltp21` ACL. A small rpcd backend performs the four allowed operations from the OpenWrt router.

## Install from source

Copy the package into an OpenWrt buildroot under `package/luci-app-zltp21`, select it in `make menuconfig`, then build it:

```sh
make package/luci-app-zltp21/compile V=s
```

Install the resulting package and configure the modem password under **Status → ZLT P21 → Settings**. The default modem address is `http://192.168.1.1` and the default username is `admin`.

For a manual development install:

```sh
scp -r root/* root@openwrt:/
scp -r htdocs/* root@openwrt:/www/
ssh root@openwrt 'chmod +x /usr/libexec/rpcd/luci.zltp21; service rpcd restart'
```

## Compatibility

Built for ZLT/Tozed firmware exposing:

- `GET /goform/goform_get_cmd_process`
- `POST /goform/goform_set_cmd_process`
- `LOGIN`, `SEND_SMS`, and `DELETE_SMS` goform actions

Firmware variants may use different field names. Status is read without a modem login where supported; SMS requires the password configured in UCI.

## Check

```sh
sh -n root/usr/libexec/rpcd/luci.zltp21
node tests/test_helpers.js
```

## License

MIT
