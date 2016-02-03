// Put everything into a namespace so that we dont pollute
var LinkySelect = function() {
	this.selectedIndex = false;
	this.urls = false;
	this.opentype = false;
	this.download = false;
	if ("arguments" in window && window.arguments.length > 0) {
		this.urls = window.arguments[0].urls;
		this.opentype = window.arguments[0].opentype;
		this.download = window.arguments[0].download;
	}
	// preserve the original lnks object for sorting reasons
	this.lnks_org = new Array(this.urls.length);
	for (var i = 0, len = this.lnks_org.length; i < len; i++) {
		this.lnks_org[i] = this.urls[i];
	}
}

LinkySelect.prototype.getChecked = function(aEle) {
	return aEle.getAttribute("checked") == "true";
}
LinkySelect.prototype.setChecked = function(aDo) {
	return aDo ? "true" : "false";
}

// select all already visisted links
LinkySelect.prototype.checkVisited = function() {
	var gGlobalHistory = opener.Components.classes["@mozilla.org/browser/global-history;1"].getService(Components.interfaces.nsIGlobalHistory);
	var cbox = this.getChecked(document.getElementById("cvbox"));
	var selectlinks = document.getElementById("selectlinks");
	var last = selectlinks.getRowCount();
	for (var i = 0; i < last; i++) {
		var tmp = selectlinks.getItemAtIndex(i);
		if (gGlobalHistory.isVisited(tmp.getAttribute("value"))) {
			tmp.setAttribute("checked", this.setChecked(cbox));
		}
	}
	this.updateInfo();
}

LinkySelect.prototype.updateInfo = function() {
	var msg = opener.document.getElementById("bundle_linky").getString("linky-select-info");
	var selectlinks = document.getElementById("selectlinks");
	var last = selectlinks.getRowCount();
	var checked = 0;
	for (var i = 0; i < last; i++) {
		if (this.getChecked(selectlinks.getItemAtIndex(i))) {
			checked++;
		}
	}
	msg = opener.linkyShared.replaceInsert(msg, 1, checked);
	msg = opener.linkyShared.replaceInsert(msg, 2, last);
	document.getElementById("linky-select-info").setAttribute("value", msg);
}

LinkySelect.prototype.doSelect = function(event) {
	var selectlinks = document.getElementById("selectlinks");
	if (event.shiftKey) {
		var checked = this.getChecked(selectlinks.getItemAtIndex(this.selectedIndex));
		var start = this.selectedIndex;
		var end = selectlinks.selectedIndex;
		if (start > end) {
			end = start;
			start = selectlinks.selectedIndex;
		}
		for (var i = start; i < end; i++) {
			selectlinks.getItemAtIndex(i).setAttribute("checked", this.setChecked(checked));
		}
	}
	this.selectedIndex = selectlinks.selectedIndex;
	this.updateInfo();
}

// mark selected links visisted
LinkySelect.prototype.markVisited = function() {
	var gGlobalHistory = opener.Components.classes["@mozilla.org/browser/global-history;1"].getService(Components.interfaces.nsIGlobalHistory);
	var selectlinks = document.getElementById("selectlinks");
	var last = selectlinks.getRowCount();
	var j = 0;
	for (var i = 0; i < last; i++) {
		var tmp = selectlinks.getItemAtIndex(i);
		if (this.getChecked(tmp)) {
			gGlobalHistory.addPage(tmp.getAttribute("value"));
			j++;
		}
	}
	if (j) {
		alert(j + " links marked as visited.");
	}
}

LinkySelect.prototype.invertSelected = function() {
	var selectlinks = document.getElementById("selectlinks");
	for (var i = 0, last = selectlinks.getRowCount(); i < last; i++) {
		selectlinks.getItemAtIndex(i).setAttribute("checked", this.setChecked(!this.getChecked(selectlinks.getItemAtIndex(i))));
	}
	this.updateInfo();
}

// select all links
LinkySelect.prototype.checkAll = function() {
	var cbox = this.getChecked(document.getElementById("cbox"));
	var selectlinks = document.getElementById("selectlinks");
	for (var i = 0, last = selectlinks.getRowCount(); i < last; i++) {
		selectlinks.getItemAtIndex(i).setAttribute("checked", this.setChecked(cbox));
	}
	this.updateInfo();
}

// Copy links to the clipboard
// t indicates the type
//  0 : only the selected links are copied
//  1 : all links are copied
LinkySelect.prototype.copyClipboard = function(t) {
	var selectlinks = document.getElementById("selectlinks");
	var txt = "";
	for (var i = 0, last = selectlinks.getRowCount(); i < last; i++) {
		var tmp = selectlinks.getItemAtIndex(i);
		if (t || (!t && this.getChecked(tmp))) {
			txt += tmp.getAttribute("value") + "\n"
		}
	}
	if (txt) {
		const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);
		gClipboardHelper.copyString(txt);
	}
}

// Bookmark selected links as group
LinkySelect.prototype.bookmarkLinks = function() {
	var selectlinks = document.getElementById("selectlinks");
	var last = selectlinks.getRowCount();
	var groups = new Array();
	for (var i = 0; i < last; i++) {
		var tmp = selectlinks.getItemAtIndex(i);
		if (this.getChecked(tmp)) {
			groups[groups.length] = tmp.getAttribute("value");
		}
	}
	if (groups.length) {
		var gname = prompt(opener.document.getElementById("bundle_linky").getString("linky-select-bookmarkgroupname"));
		if (gname) {
			var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Components.interfaces.nsINavBookmarksService);
			var menuFolder = bmsvc.bookmarksMenuFolder;
			var newFolderId = bmsvc.createFolder(menuFolder, gname, bmsvc.DEFAULT_INDEX);
			var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
			for (i = 0; i < groups.length; ++i) {
				var uri = ios.newURI(groups[i], null, null);
				var newBkmkId = bmsvc.insertBookmark(newFolderId, uri, bmsvc.DEFAULT_INDEX, "");
			}
		}
	}
}

// Sort the links
// t 1 : sort by link
// t 2 : not sorted
// t 3 : sort by hostname
LinkySelect.prototype.sortSelect = function(t) {
	// what sort order to use
	var slnks;
	if (t == 2) {
		// not sorted but by document.links object
		slnks = this.lnks_org;
	} else if (t == 3) {
		// sorted by hostname

		var uri = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
		// use own sort function
		var compareFunc = function compare(first, second) {
			uri.spec = first;
			try {
				var fu = uri.host;
			} catch(err) {
				opener.linkyShared.trace("Unable to get host from " + first,1,err)
			}
			uri.spec = second;
			try {
				var su = uri.host;
			} catch(err) {
				opener.linkyShared.trace("Unable to get host from " + second,1,err)
			}

			if (fu < su)
				return -1;
			else if (fu > su)
				return 1;
			else
				if (first < second)
					return -1;
				else if (first > second)
					return 1;
				else
					return 0;
		}
		slnks = this.urls.sort(compareFunc);
	} else {
		// sort by URL
		slnks = this.urls.sort();
	}

	// remove the links
	var selectlinks = document.getElementById("selectlinks");
	var last = selectlinks.getRowCount();
	for (var i = last - 1; i > -1; i--) {
		selectlinks.removeItemAt(i);
	}

	// add the sorted links
	for(i = 0; i < slnks.length; ++i) {
		var itemNode = document.createElement("listitem");
		itemNode.setAttribute("type", "checkbox");
		itemNode.setAttribute("value", slnks[i]);
		itemNode.setAttribute("label", slnks[i]);
		itemNode.setAttribute("checked", "true");
		selectlinks.appendChild(itemNode);
	}
}

// select links based on the hostname
LinkySelect.prototype.checkHost = function(h) {
	var uri = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
	// select the links
	var selectlinks = document.getElementById("selectlinks");
	var last = selectlinks.getRowCount();
	for (var i = 0; i < last; i++) {
		var tmp = selectlinks.getItemAtIndex(i);
		uri.spec = tmp.getAttribute("value");
		try {
			var tmphost = uri.host;
			tmp.setAttribute("checked", this.setChecked(h == tmphost));
		} catch(err) {
			opener.linkyShared.trace("Unable to get host from " + uri.spec, 1, err)
		}
	}
	this.updateInfo();
}

// select/deselect links based on text input
LinkySelect.prototype.checkPartial = function(pat, f) {
	if (pat) {
		var selectlinks = document.getElementById("selectlinks");
		var last = selectlinks.getRowCount();
		for (var i = 0; i < last; i++) {
			var tmp = selectlinks.getItemAtIndex(i);
			if (tmp.getAttribute("value").indexOf(pat) != -1) {
				tmp.setAttribute("checked", this.setChecked(f));
			} else {
				tmp.setAttribute("checked", this.setChecked(!f));
			}
		}
		this.updateInfo();
	}
}

// remove part of selected links based on text input
LinkySelect.prototype.removePartial = function(pat) {
	if (!pat || pat == "")
		return;

	var selectlinks = document.getElementById("selectlinks");
	var last = selectlinks.getRowCount();
	var re = new RegExp(pat, "g");
	for (var i = 0; i < last; i++) {
		var tmp = selectlinks.getItemAtIndex(i);
		if (this.getChecked(tmp)) {
			var str = tmp.getAttribute("value");
			var strnew = str.replace(re, "");
			if (str != strnew) {
				tmp.setAttribute("label", strnew);
				tmp.setAttribute("value", strnew);
			}
		}
	}
}

// unescaepe links
// http://gemal.dk/?url=http://gemal.dk?p=1 becomes http://gemal.dk?p=1
// http://gemal.dk/?url=http://gemal.dk?p=1&p=2 becomes http://gemal.dk?p=1
LinkySelect.prototype.unescLinks = function() {
	var selectlinks = document.getElementById("selectlinks");
	var last = selectlinks.getRowCount();
	var URL=/.*\W(\w+:\/\/.*?)(&|$)/i;
	for (var i = 0; i < last; i++) {
		var tmp = selectlinks.getItemAtIndex(i);
		var val = tmp.getAttribute("value");
		var lnk = URL.exec(val);
		if (lnk && lnk[1]) {
			tmp.setAttribute("value", lnk[1]);
			tmp.setAttribute("label", lnk[1]);
		}
	}
}

// open the selected links
LinkySelect.prototype.openLinks = function() {
	var selectlinks = document.getElementById("selectlinks");
	var urlhash = new Object();
	var sel = 0;
	for (var i = 0, last = selectlinks.getRowCount(); i < last; i++) {
		var tmp = selectlinks.getItemAtIndex(i);
		if (this.getChecked(tmp)) {
			sel++;
			urlhash[tmp.getAttribute("value")] = true;
		}
	}
	if (sel) {
		// get referer and directory but only if we are doing download
		var ref;
		var dir;
		if (this.download) {
			dir = document.getElementById("linky-select-download-dir").label;
			if (!dir) {
				opener.linkyShared.trace("Please specify a Download Folder!", 1);
				return;
			} else {
				if (dir != this.pref_dir) {
					if (this.pref.getBoolPref("extensions.linky.download.directory.remember")) {
						var lf = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
						lf.initWithPath(dir);
						this.pref.setComplexValue("extensions.linky.download.directory", Components.interfaces.nsILocalFile, lf);
					}
				}
			}
			ref = opener.linkyContext.getReferer(opener.document.commandDispatcher.focusedWindow.document);
		}
		var doc;
		for (i in urlhash) {
			if (this.opentype > 2) {
				if (!doc) {
					if (this.opentype == 3) {
						try {
							doc = opener.linkyContext.generateDocument("", true);
						} catch(err) {
							opener.linkyShared.trace("Unable to add new tab", 1, err);
						}
					} else if (this.opentype == 4) {
						try {
							doc = opener.linkyContext.generateDocument("", true);
						} catch(err) {
							opener.linkyShared.trace("Unable to add new window", 1, err);
						}
					} else {
						opener.linkyShared.trace("Error 1: Unknown opentype: " + this.opentype);
					}
				}
				opener.linkyContext.openLink(i, 3, doc);
			} else if (this.download) {
				opener.linkyContext.downloadLink(i, ref, dir);
			} else {
				opener.linkyContext.openLink(i, this.opentype);
			}
		}
	}
	self.close();
}

LinkySelect.prototype.startup = function() {
	// if we're doing download change the text and add Download Folder
	if (this.download) {
		document.getElementById("linky-select-intro").label = opener.document.getElementById("bundle_linky").getString("linky-select-intro");
		document.getElementById("linky-select-openlinks").label = opener.document.getElementById("bundle_linky").getString("linky-select-openlinks");
		document.getElementById("linky-select-openlinks").setAttribute("tooltiptext", opener.document.getElementById("bundle_linky").getString("linky-select-openlinks-tooltip"));
		var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		this.pref = prefService.getBranch(null);
		this.pref_dir = false;
		try {
			this.pref_dir = this.pref.getComplexValue("extensions.linky.download.directory", Components.interfaces.nsILocalFile);
			opener.linkyShared.trace("linky pref read ok:" + this.pref_dir.path)
		} catch(e) {
			opener.linkyShared.trace("argh:" + e)
		}
		if (!this.pref_dir) {
			try {
				this.pref_dir = this.pref.getComplexValue("browser.download.dir", Components.interfaces.nsILocalFile);
				opener.linkyShared.trace("org pref read ok:" + this.pref_dir.path)
			} catch(e) {
				opener.linkyShared.trace("argh:" + e)
			}
		}
		if (this.pref_dir) {
			document.getElementById("linky-select-download-dir").label = this.pref_dir.path;
		}
		document.getElementById("linky-select-download").setAttribute("hidden", false);
	}
	var selectlinks = document.getElementById("selectlinks");
	for (var i = 0, len = this.urls.length; i < len; ++i) {
		var itemNode = document.createElement("listitem");
		itemNode.setAttribute("type", "checkbox");
		itemNode.setAttribute("value", this.urls[i]);
		itemNode.setAttribute("label", this.urls[i]);
		itemNode.setAttribute("tooltiptext", this.urls[i]);
		itemNode.setAttribute("checked", this.setChecked(true));
		selectlinks.appendChild(itemNode);
	}
	document.getElementById("linky-select-info").setAttribute("hidden", false);
	this.updateInfo();
}

LinkySelect.prototype.doDir = function() {
	var dir = opener.linkyContext.getDirectory();
	if (dir) {
		document.getElementById("linky-select-download-dir").label = dir;
	}
}

const linkySelect = new LinkySelect;