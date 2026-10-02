include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for ZLT P21 LTE CPEs
LUCI_DEPENDS:=+curl +ucode
LUCI_PKGARCH:=all

PKG_LICENSE:=MIT
PKG_MAINTAINER:=Juan M. Reyes <juanmreyesa@users.noreply.github.com>

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
