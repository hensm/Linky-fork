// Put everything into a namespace or that we dont pollute
var LinkyContext = function() {
	this.max_check = 300;
}

// get current selection as a string
LinkyContext.prototype.getSelectionString = function() {
	var focusedWindow = document.commandDispatcher.focusedWindow;
	var selection = focusedWindow.getSelection();;
	return String(selection);
}

// get current selection as a object
LinkyContext.prototype.getSelectionObject = function() {
	var focusedWindow = document.commandDispatcher.focusedWindow;
	return focusedWindow.getSelection();
}

// can the link be opened or should we ignore it?
LinkyContext.prototype.isLinkOpenable = function(aURL, aOnlyHTTP) {
	var ret = false;
	if (aURL) {
		if (this.isLinkType("javascript:", aURL)) {
		} else if (this.isLinkType("mailto:", aURL) || this.isLinkType("news:", aURL) || this.isLinkType("snews:", aURL)) {
			if (this.pref_open_mailnews) {
				ret = true;
			}
		} else {
			if (aOnlyHTTP && !(this.isLinkType("http:", aURL) || this.isLinkType("https:", aURL))) {
			} else {
				ret = true;
			}
		}
	}
	//linkyShared.trace("isLinkOpenable: " + aURL + (ret ? " OK" : " not OK"));
	return ret;
}

// can the link be saved or should we ignore it?
LinkyContext.prototype.isLinkSaveable = function(aURL) {
	var ret = false;
	if (aURL) {
		if (!this.isLinkType("mailto:", aURL) && !this.isLinkType("javascript:", aURL) && !this.isLinkType("news:", aURL) && !this.isLinkType("snews:", aURL)) {
			ret = true;
		}
	}
	//linkyShared.trace("isLinkSaveable: " + aURL + (ret ? " OK" : " not OK"));
	return ret;
}

// get the type from the link
LinkyContext.prototype.isLinkType = function(aType, aURL) {
	var ret = false;
	try {
		var protocol = aURL.substr(0, aType.length);
		ret = protocol.toLowerCase() == aType;
	} catch(e) {
		linkyShared.trace("Unable to get protocol from " + aURL, 0, err);
	}
	//linkyShared.trace("isLinkType: " + aURL + " - " + aType + (ret ? " OK" : " not OK"));
	return ret;
}

// is the URL a reference to a image?
LinkyContext.prototype.isLinkImage = function(aLink) {
	var ret = false;
	if (aLink) {
		var linky_imageurl = new RegExp("\." + this.pref_imgexts + "$", "i");
		if (linky_imageurl.test(aLink)) {
			ret = true;
		}
	}
	//linkyShared.trace("isLinkImage: " + aLink + (ret ? " OK" : " not OK"));
	return ret;
}

// get the referer from a document
LinkyContext.prototype.getReferer = function(d) {
	var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	var loc;
	// do we have a location?
	if ("location" in d) {
		loc = d.location;
	} else {
		linkyShared.trace("No location in " + d);
	}
	var ret = ioService.newURI(loc, null, null);
	//linkyShared.trace("getReferer: " + ret.spec);
	return ret;
}

// get a directory from a select a directory dialog
LinkyContext.prototype.getDirectory = function() {
	var dir;
	var filePicker = Components.classes["@mozilla.org/filepicker;1"].createInstance();
	if (filePicker != null) {
		filePicker = filePicker.QueryInterface(Components.interfaces.nsIFilePicker);
		if (filePicker != null) {
			try {
				var msg = document.getElementById("bundle_linky").getString("linky-download-select-directory");
				filePicker.init(window, msg, Components.interfaces.nsIFilePicker.modeGetFolder);
			} catch(err) {
				linkyShared.trace("Unable to get directory", 1, err);
			}
			filePicker.appendFilters(Components.interfaces.nsIFilePicker.filterAll);
			if (filePicker.show() == Components.interfaces.nsIFilePicker.returnOK) {
				dir = filePicker.file;
			} else {
				linkyShared.trace("User cancalled out of director picker", 0);
			}
		} else {
			linkyShared.trace("Unable to open directory picker", 1);
		}
	} else {
		linkyShared.trace("Unable to init directory picker", 1);
	}
	if (dir && dir.path) {
		linkyShared.trace("selected directory: " + dir.path, 0);
		return dir.path;
	} else {
		linkyShared.trace("returning false from getDirectory", 0);
		return false;
	}
}

LinkyContext.prototype.removeDupes = function(aURLS) {
	var ret = new Array();
	for (var i in aURLS) {
		ret[ret.length] = i;
	}
	return ret;
}

LinkyContext.prototype.setHidden = function(aState, aElements) {
	for (var i = 0; i < aElements.length; i++) {
		document.getElementById(aElements[i]).setAttribute("disabled", false);
		document.getElementById(aElements[i]).hidden = !aState;
		//linkyShared.trace("setHidden: " + aElements[i] + (!aState ? " hidden" : " NOT hidden"));
	}
}

LinkyContext.prototype.setDisabled = function(aElements, aIndexOf) {
	for (var i = 0, len = aElements.length; i < len; i++) {
		if (!aIndexOf || (aIndexOf && aElements[i].indexOf(aIndexOf) != -1)) {
			document.getElementById(aElements[i]).setAttribute("disabled", true);
			//linkyShared.trace("setDisabled: " + aElements[i] + " disabled");
		} else {
			//linkyShared.trace("setDisabled: " + aElements[i] + " NOT disabled");
		}
	}
}

// Open a link either in a tab or a window
LinkyContext.prototype.openLink = function(lnk, typ, doc) {
	if (!lnk) {
		linkyShared.trace("lnk in openLink is empty", 0);
		return;
	}
	// special case mail and news links
	if (this.isLinkType("mailto:", lnk) || this.isLinkType("news:", lnk) || this.isLinkType("snews:", lnk)) {
		try {
			window.loadURI(lnk);
		} catch(err) {
			linkyShared.trace("Unable to open mail or news link " + lnk, 1, err);
		}
	} else {
		if (typ == 1) {
			var browser;
			try {
				browser = getBrowser();
			} catch (ex if ex instanceof ReferenceError) {
				var windowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
				var browserWin = windowMediator.getMostRecentWindow("navigator:browser");
				if (!browserWin) {
					window.openDialog(getBrowserURL(), "_blank", "chrome,all,dialog=no", lnk, null, this.getReferer(document.commandDispatcher.focusedWindow.document));
					return;
				} else {
					browser = browserWin.getBrowser();
				}
			}
			try {
				browser.addTab(lnk, this.getReferer(document.commandDispatcher.focusedWindow.document));
			} catch(err) {
				linkyShared.trace("Unable to open " + lnk, 1, err);
			}
		} else if (typ == 2) {
			try {
				document.commandDispatcher.focusedWindow.open(lnk);
			} catch(err) {
				linkyShared.trace("Unable to open " + lnk, 1, err);
			}
		} else if (typ == 3) {
			if (!doc) {
				linkyShared.trace("Document is undefined", 1);
			} else {
				var body = doc.getElementsByTagName("body")[0];
				if (!body) {
					body = doc.createElement("body");
					doc.appendChild(body);
				}
				var img = doc.createElement("img");
				img.src = lnk;
				img.setAttribute("alt", lnk);
				img.setAttribute("title", lnk);
				body.appendChild(img);
				var br = doc.createElement("br");
				body.appendChild(br);
			}
		} else {
			linkyShared.trace("openLink called with unknown typ:" + typ, 1);
		}
	}
}

LinkyContext.prototype.generateDocument = function(url, openInTab) {
	var generatedPage = null;
	var request = new XMLHttpRequest();
	if (openInTab) {
		getBrowser().selectedTab = getBrowser().addTab(url);
		generatedPage = window;
	} else {
		generatedPage = window.open(url);
	}
	// This must be done to make generated content render
	request.open("get", "about:blank", false);
	request.send(null);
	return generatedPage.content.document;
}

// enables and disables the context menu items
// p indicates where where the context menu was called:
//   1 : From the Mozilla normal context menu
//   2 : From the Mozilla Mail context menu
LinkyContext.prototype.doContext = function(aContextType) {
	aContextType = aContextType ? aContextType : "";
	var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
	var pref = prefService.getBranch(null);

	// read the preferences
	this.pref_showselect = pref.getIntPref("extensions.linky.showselect");
	this.pref_showopen = pref.getIntPref("extensions.linky.showopen");
	this.pref_imgexts = pref.getCharPref("extensions.linky.imgexts");
	this.pref_validateURL = pref.getCharPref("extensions.linky.validateURL");
	this.pref_open_mailnews = pref.getBoolPref("extensions.linky.open_mailnews");
	this.pref_download_overwrite = pref.getIntPref("extensions.linky.download.overwrite");
	this.pref_context_selectedlinks = pref.getBoolPref("extensions.linky.context.selectedlinks");
	this.pref_context_selectedtextlinks = pref.getBoolPref("extensions.linky.context.selectedtextlinks");
	this.pref_context_alllinks = pref.getBoolPref("extensions.linky.context.alllinks");
	this.pref_context_piclinks = pref.getBoolPref("extensions.linky.context.piclinks");
	this.pref_context_piclinksshow = pref.getBoolPref("extensions.linky.context.piclinksshow");
	this.pref_context_picshow = pref.getBoolPref("extensions.linky.context.picshow");
	this.pref_context_validatelinks = pref.getBoolPref("extensions.linky.context.validatelinks");
	this.pref_context_downloadlinks = pref.getBoolPref("extensions.linky.context.downloadlinks");
	this.pref_context_clipboard = pref.getBoolPref("extensions.linky.context.clipboard");

	// all the ids
	var elementTagsSelected = new Array("linky-context-open-selected-tab" + aContextType, "linky-context-open-selected-win" + aContextType);
	var elementTagsSelectedTextLinks = new Array("linky-context-selected-text-tab" + aContextType, "linky-context-selected-text-win" + aContextType);
	var elementTagsAll = new Array("linky-context-open-all-tab" + aContextType, "linky-context-open-all-win" + aContextType);
	var elementTagsPictureAll = new Array("linky-context-pictures-tab" + aContextType, "linky-context-pictures-win" + aContextType);
	var elementTagsPictureLinks = new Array("linky-context-pictures-links-page-tab" + aContextType, "linky-context-pictures-links-page-win" + aContextType);
	var elementTagsPicturePage = new Array("linky-context-pictures-page-tab" + aContextType, "linky-context-pictures-page-win" + aContextType);
	var elementTagsValidateAll = new Array("linky-context-validate-all-tab" + aContextType, "linky-context-validate-all-win" + aContextType);
	var elementTagsValidateSelected = new Array("linky-context-validate-selected-tab" + aContextType, "linky-context-validate-selected-win" + aContextType);
	var elementTagsDownload = new Array("linky-context-download-all" + aContextType, "linky-context-download-selected" + aContextType);
	var elementTagsClipboard = new Array("linky-context-clipboard-all" + aContextType, "linky-context-clipboard-selected" + aContextType);
	var elementInfo = "linky-context-info" + aContextType;

	// meta ids
	var elementTagsFulls = elementTagsSelected.concat(elementTagsSelectedTextLinks, elementTagsAll, elementTagsPictureAll, elementTagsPictureLinks, elementTagsPicturePage, elementTagsValidateAll, elementTagsValidateSelected, elementTagsDownload, elementTagsClipboard);
	var elementTagsLinks = elementTagsAll.concat(elementTagsPictureAll, elementTagsPictureLinks, elementTagsValidateAll, elementTagsDownload, elementTagsClipboard);

	// hide disabled elements
	this.setHidden(this.pref_context_selectedlinks, elementTagsSelected);
	this.setHidden(this.pref_context_selectedtextlinks, elementTagsSelectedTextLinks);
	this.setHidden(this.pref_context_alllinks, elementTagsAll);
	this.setHidden(this.pref_context_piclinks, elementTagsPictureAll);
	this.setHidden(this.pref_context_piclinksshow, elementTagsPictureLinks);
	this.setHidden(this.pref_context_picshow, elementTagsPicturePage);
	this.setHidden(this.pref_context_validatelinks, elementTagsValidateAll);
	this.setHidden(this.pref_context_validatelinks, elementTagsValidateSelected);
	this.setHidden(this.pref_context_downloadlinks, elementTagsDownload);
	this.setHidden(this.pref_context_clipboard, elementTagsClipboard);

	var sel = this.getSelectionString();
	var lnks = document.commandDispatcher.focusedWindow.document.links;
	var imgs = document.commandDispatcher.focusedWindow.document.images;

	var msg;
	// we dont have lnks/imgs/sel on about: pages
	if (lnks && imgs) {
		var lnks_len = lnks.length;
		var urlhash = new Object();
		if (lnks.length < this.max_check) {
			for (var i = 0, len = lnks.length; i < len; ++i) {
				urlhash[lnks[i].href] = true;
			}
			urlhash = this.removeDupes(urlhash);
			lnks_len = urlhash.length;
		} else {
			lnks_len = this.max_check + "+";
		}
		var urlhash = new Object();
		var imgs_len = imgs.length;
		if (imgs.length < this.max_check) {
			for (var i = 0, len = imgs.length; i < len; ++i) {
				urlhash[imgs[i].src] = true;
			}
			urlhash = this.removeDupes(urlhash);
			imgs_len = urlhash.length;
		} else {
			imgs_len = this.max_check + "+";
		}
		linkyShared.trace("links:" + lnks_len + " (" + lnks.length + ") - images:" + imgs_len + " (" + imgs.length + ") - sel:" + sel.length);
		// update the info item with current numbers of links and images
		msg = document.getElementById("bundle_linky").getString("linky-info");
		msg = linkyShared.replaceInsert(msg, 1, lnks_len);
		msg = linkyShared.replaceInsert(msg, 2, imgs_len);
	} else {
		msg = document.getElementById("bundle_linky").getString("linky-info-na");
	}
	document.getElementById(elementInfo).label = msg;

	// hide tab or win options
	if (this.pref_showopen != 2) {
		for (var i = 0; i < elementTagsFulls.length; i++) {
			// only show elements that aren't already hidden
			if (!document.getElementById(elementTagsFulls[i]).hidden) {
				if (elementTagsFulls[i].indexOf("-tab") != -1) {
					document.getElementById(elementTagsFulls[i]).hidden = this.pref_showopen == 1;
				} else if (elementTagsFulls[i].indexOf("-win") != -1) {
					document.getElementById(elementTagsFulls[i]).hidden = this.pref_showopen == 0;
				}
			}
		}
	}

	// check for selection
	if (!sel.length) {
		linkyShared.trace("no selection");
		this.setDisabled(elementTagsFulls, "-selected");
	}

	// check for images
	if (!imgs || !imgs.length) {
		linkyShared.trace("no images");
		this.setDisabled(elementTagsPicturePage);
	}

	// check for links
	if (!lnks || !lnks.length) {
		linkyShared.trace("no links");
		this.setDisabled(elementTagsLinks);
		this.setDisabled(elementTagsSelected);
		this.setDisabled(elementTagsValidateSelected);
	}

	// check for text links in selection
	var disabled = true;
	if (this.pref_context_selectedtextlinks && sel) {
		var selection = this.getSelectionObject();
		var urlPattern = /(\w*:\/\/)?([^\s\/]+\.(ac|ad|aero|ae|af|ag|ai|al|am|an|ao|aq|arpa|ar|as|at|au|aw|az|ba|bb|bd|be|bf|bg|bh|biz|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|com|coop|co|cr|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|edu|ee|eg|er|es|et|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gov|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|info|int|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|mg|mh|mil|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|museum|mu|mv|mw|mx|my|mz|name|na|nc|net|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|org|pa|pe|pf|pg|ph|pk|pl|pm|pn|pro|pr|ps|pt|pw|py|qa|re|ro|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|um|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zw))((\/)(\S+)?|(\/)? |(\/)?$)/gmi;
		// RegExp parts:
		// 0 = complete result, may contain trailing space <-- Better not to evaluate this!
		// 1 = protocol, may be empty
		// 2 = domain
		// 3 = top level domain
		// 4 = complete path, may contain trailing space, or consist of a single space only, or be empty <-- Better not to evaluate this!
		// 5 = path root slash, may be empty
		// 6 = relative path, may be empty
		if (urlPattern.exec(selection)) {
			disabled = false;
		}
	}
	if (disabled) {
		linkyShared.trace("no text links");
		this.setDisabled(elementTagsSelectedTextLinks);
	}

	// check for picture links
	var disabled = true;
	if (this.pref_context_piclinks || this.pref_context_piclinksshow) {
		if (lnks && lnks.length) {
			// because of performance disable check if we have many links
			if (lnks.length > this.max_check) {
				disabled = false;
				linkyShared.trace("More than " + this.max_check + " links. There's " + lnks.length);
			} else {
				for (var i = 0, len = lnks.length; i < len; i++) {
					if (this.isLinkImage(lnks[i].href)) {
						disabled = false;
						break;
					}
				}
			}
		}
	}
	if (disabled) {
		linkyShared.trace("no picture links");
		this.setDisabled(elementTagsPictureAll);
		this.setDisabled(elementTagsPictureLinks);
	}
}

LinkyContext.prototype.openLinks = function(aURLs, aType, aShift) {
	var urls = this.removeDupes(aURLs);
	if (urls.length) {
		// holding down the SHIFT key while pressing the menuitem forces the select links dialog
		if (aShift || urls.length >= this.pref_showselect) {
			window.openDialog("chrome://linky/content/select-links.xul", "_blank", "chrome,modal,centerscreen,resizable=yes", {urls: urls, opentype: aType});
		} else {
			for (var i = 0; i < urls.length; i++) {
				this.openLink(urls[i], aType);
			}
		}
	} else {
		linkyShared.trace("No openable links found!", 1);
	}
}

// open links in new tab/window
// aType: 1: tab, 2: window
// aSelected: only do selected links
LinkyContext.prototype.doLinks = function(aType, aSelected, aEvent) {
	var urlhash = new Object();
	var lnks = document.commandDispatcher.focusedWindow.document.getElementsByTagNameNS("*", "a");
	if (lnks.length) {
		if (aSelected) {
			if (this.getSelectionString().length) {
				var selection = this.getSelectionObject();
				for (var i = 0, len = lnks.length; i < len; ++i) {
					var u = lnks[i].href
					if (selection.containsNode(lnks[i], true) && this.isLinkOpenable(u)) {
						urlhash[u] = true;
					}
				}
			} else {
				linkyShared.trace("Selection is empty!", 1);
			}
		} else {
			for (var i = 0, len = lnks.length; i < len; ++i) {
				var u = lnks[i].href
				if (this.isLinkOpenable(u)) {
					urlhash[u] = true;
				}
			}
		}
		this.openLinks(urlhash, aType, aEvent.shiftKey);
	} else {
		linkyShared.trace("No links found in page!", 1);
	}
}

// open selected text links
// opentype: 1 = in new tab, 2 = in new window
LinkyContext.prototype.doSelectedText = function(opentype, event) {
	linkyShared.trace("doSelectedText");
	if (this.getSelectionString().length < 1) {
		linkyShared.trace("Selection is empty!", 1);
	} else {
		// holding down the SHIFT key while pressing the menuitem forces the select links dialog
		var linky_forceselect = false;
		if (event.shiftKey) {
			linky_forceselect = true;
		}
		var selection = this.getSelectionObject();
		var urlhash = new Object();
		var urlPattern = /(\w*:\/\/)?([^\s\/]+\.(ac|ad|aero|ae|af|ag|ai|al|am|an|ao|aq|arpa|ar|as|at|au|aw|az|ba|bb|bd|be|bf|bg|bh|biz|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|com|coop|co|cr|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|edu|ee|eg|er|es|et|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gov|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|info|int|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|mg|mh|mil|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|museum|mu|mv|mw|mx|my|mz|name|na|nc|net|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|org|pa|pe|pf|pg|ph|pk|pl|pm|pn|pro|pr|ps|pt|pw|py|qa|re|ro|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|um|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zw))((\/)(\S+)?|(\/)? |(\/)?$)/gmi;
		// RegExp parts:
		// 0 = complete result, may contain trailing space <-- Better not to evaluate this!
		// 1 = protocol, may be empty
		// 2 = domain
		// 3 = top level domain
		// 4 = complete path, may contain trailing space, or consist of a single space only, or be empty <-- Better not to evaluate this!
		// 5 = path root slash, may be empty
		// 6 = relative path, may be empty
		var found = urlPattern.exec(selection);
		while (found) {
			if (!found[1]) {
				found[1] = "http://";
			}
			if (!found[5]) {
				found[5] = "/";
			}
			if (!found[6]) {
				found[6] = "";
			}
			var url = found[1] + found[2] + found[5] + found[6];
			if (this.isLinkOpenable(url)) {
				urlhash[url] = true;
			}
			// proceed to the next link
			found = urlPattern.exec(selection);
		}
		var urls = this.removeDupes(urlhash);
		if (urls.length > 0) {
			if (linky_forceselect || urls.length >= this.pref_showselect) {
				window.openDialog("chrome://linky/content/select-links.xul","_blank","chrome,modal,centerscreen,resizable=yes", {urls: urls, opentype: opentype});
			} else {
				for (var i = 0; i < urls.length; i++) {
					this.openLink(urls[i], opentype);
				}
			}
		} else {
			linkyShared.trace("No links in selection!", 1);
		}
	}
}

// copy links to clipboard
// aSelected: only do selected links
LinkyContext.prototype.doClipboard = function(aSelected, aEvent) {
	var lnks = document.commandDispatcher.focusedWindow.document.getElementsByTagNameNS("*", "a");
	var len = lnks.length;
	if (len) {
		var urlhash = new Object();
		if (aSelected) {
			if (this.getSelectionString().length) {
				var selection = this.getSelectionObject();
				for (var i = 0; i < len; ++i) {
					if (selection.containsNode(lnks[i], true)) {
						urlhash[lnks[i].href] = true;
					}
				}
			} else {
				linkyShared.trace("Selection is empty!", 1);
			}
		} else {
			for (var i = 0; i < len; ++i) {
				urlhash[lnks[i].href] = true;
			}
		}
		var urls = this.removeDupes(urlhash);
		if (urls.length) {
			var txt = "";
			for (var i = 0, last = urls.length; i < last; i++) {
				txt += urls[i] + "\n";
			}
			if (txt) {
				const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);
				gClipboardHelper.copyString(txt);
			}
		} else {
			linkyShared.trace("No links found!", 1);
		}
	} else {
		linkyShared.trace("No links found in page!", 1);
	}
}

// Show all images
// opentype: 3 = in one new tab, 4 = in one new window
LinkyContext.prototype.doImages = function(opentype, event) {
	linkyShared.trace("doImages");
	var lnks = document.commandDispatcher.focusedWindow.document.links;
	var imgs = document.commandDispatcher.focusedWindow.document.images;
	linkyShared.trace("links:" + lnks.length + " - images:" + imgs.length);
	lnks2 = document.commandDispatcher.focusedWindow.document.getElementsByTagNameNS("*", "a");
	imgs2 = document.commandDispatcher.focusedWindow.document.getElementsByTagNameNS("*", "img");
	linkyShared.trace("links:" + lnks2.length + " - images:" + imgs2.length);

	if ("images" in document.commandDispatcher.focusedWindow.document) {
		// holding down the SHIFT key while pressing the menuitem forces the select links dialog
		var linky_forceselect = 0;
		if (event.shiftKey) {
			linky_forceselect = 1;
		}
		var imgs = document.commandDispatcher.focusedWindow.document.images;

		var urlhash = new Object();
		var len = imgs.length;
		for (var i = 0; i < len; ++i) {
			var u = imgs[i].src;
			if (u) {
				urlhash[u] = true;
			} else {
				linkyShared.trace("image has no src");
			}
		}
		var urls = this.removeDupes(urlhash);

		if (urls.length > 0) {
			if (linky_forceselect || urls.length >= this.pref_showselect) {
				window.openDialog("chrome://linky/content/select-links.xul","_blank","chrome,modal,centerscreen,resizable=yes", {urls: urls, opentype: opentype});
			} else {
				var doc;
				if (opentype == 3) {
					try {
						doc = this.generateDocument("", true);
					} catch(err) {
						linkyShared.trace("Unable to add new tab", 1, err);
					}
				} else if (opentype == 4) {
					try {
						doc = this.generateDocument("", false);
					} catch(err) {
						linkyShared.trace("Unable to add new window", 1, err);
					}
				} else {
					linkyShared.trace("Unknown opentype: " + opentype, 1);
				}
				for (i = 0; i < urls.length; i++) {
					this.openLink(urls[i], 3, doc);
				}
			}
		} else {
			linkyShared.trace("No images detected!", 1);
		}
	} else {
		linkyShared.trace("Cant access images in document!", 1);
	}
}

// Show all image links on one page
// opentype: 1 = in new tab, 2 = in new window, 3 = in one new tab, 4 = in one new window
LinkyContext.prototype.doAllPics = function(opentype, event) {
	linkyShared.trace("doAllPics");
	var lnks = document.commandDispatcher.focusedWindow.document.getElementsByTagNameNS("*", "a");
	if (lnks && lnks.length) {
		// holding down the SHIFT key while pressing the menuitem forces the select links dialog
		var linky_forceselect = 0;
		if (event.shiftKey) {
			linky_forceselect = 1;
		}

		var urlhash = new Object();
		var len = lnks.length;
		for (var i = 0; i < len; ++i) {
			var u = lnks[i].href
			if (this.isLinkImage(u)) {
				urlhash[u] = true;
			}
		}
		var urls = this.removeDupes(urlhash);

		if (urls.length > 0) {
			if (linky_forceselect || urls.length >= this.pref_showselect) {
				window.openDialog("chrome://linky/content/select-links.xul","_blank","chrome,modal,centerscreen,resizable=yes", {urls: urls, opentype: opentype});
			} else {
				if (opentype < 3) {
					for (i = 0; i < urls.length; i++) {
						this.openLink(urls[i], opentype);
					}
				} else {
					var doc;
					if (opentype == 3) {
						try {
							doc = this.generateDocument("", true);
						} catch(err) {
							linkyShared.trace("Unable to add new tab", 1, err);
						}
					} else if (opentype == 4) {
						try {
							doc = this.generateDocument("", true);
						} catch(err) {
							linkyShared.trace("Unable to add new window", 1, err);
						}
					} else {
						linkyShared.trace("Unknown opentype: " + opentype);
					}
					for (i = 0; i < urls.length; i++) {
						this.openLink(urls[i], 3, doc);
					}
				}
			}
		} else {
			linkyShared.trace("No image links found!", 1);
		}
	} else {
		linkyShared.trace("Cant access links in document!", 1);
	}
}

// validate links in new tab/window
// aType: 1: tab, 2: window
// aSelected: only do selected links
LinkyContext.prototype.doValidate = function(aType, aSelected, aEvent) {
	var urlhash = new Object();
	var lnks = document.commandDispatcher.focusedWindow.document.links;
	if (lnks.length) {
		if (aSelected) {
			if (this.getSelectionString().length) {
				var selection = this.getSelectionObject();
				for (var i = 0, len = lnks.length; i < len; ++i) {
					var u = lnks[i].href
					if (selection.containsNode(lnks[i], true) && this.isLinkOpenable(u, 1)) {
						urlhash[this.pref_validateURL + escape(u)] = true;
					}
				}
			} else {
				linkyShared.trace("Selection is empty!", 1);
			}
		} else {
			for (var i = 0, len = lnks.length; i < len; ++i) {
				var u = lnks[i].href
				if (this.isLinkOpenable(u, 1)) {
					urlhash[this.pref_validateURL + escape(u)] = true;
				}
			}
		}
		this.openLinks(urlhash, aType, aEvent.shiftKey);
	} else {
		linkyShared.trace("No links found in page!", 1);
	}
}

// download links
// aSelected: only do selected links
LinkyContext.prototype.doDownload = function(aSelected, aEvent) {
	var urlhash = new Object();
	var lnks = document.commandDispatcher.focusedWindow.document.links;
	if (lnks.length) {
		if (aSelected) {
			if (this.getSelectionString().length) {
				var selection = this.getSelectionObject();
				for (var i = 0, len = lnks.length; i < len; ++i) {
					var u = lnks[i].href
					if (selection.containsNode(lnks[i], true) && this.isLinkSaveable(u)) {
						urlhash[u] = true;
					}
				}
			} else {
				linkyShared.trace("Selection is empty!", 1);
			}
		} else {
			for (var i = 0, len = lnks.length; i < len; ++i) {
				var u = lnks[i].href
				linkyShared.trace("URL:" + u);
				if (this.isLinkSaveable(u)) {
					urlhash[u] = true;
				}
			}
		}
		var urls = this.removeDupes(urlhash);
		len = urls.length;
		if (len) {
			if (aEvent.shiftKey || len >= this.pref_showselect) {
				window.openDialog("chrome://linky/content/select-links.xul", "_blank", "chrome,modal,centerscreen,resizable=yes", {urls: urls, download: true});
			} else {
				var dir = this.getDirectory();
				if (dir) {
					var ref = this.getReferer(document.commandDispatcher.focusedWindow.document);
					for (var i = 0; i < len; i++) {
						this.downloadLink(urls[i], ref, dir);
					}
				} else {
					linkyShared.trace("User cancelled out");
				}
			}
		} else {
			linkyShared.trace("No downloadable links found!", 1);
		}
	} else {
		linkyShared.trace("No links found in page!", 1);
	}
}

LinkyContext.prototype.downloadLink = function(aURL, aReferer, aDirectory) {
	linkyShared.trace("Download:" + aURL);
	var data = {url: aURL, fileName: null, filePickerTitle: null, document: null, bypassCache: false, referer: aReferer, directory: aDirectory};
	var fileinfo = new FileInfo();
	initFileInfo(fileinfo, aURL);
	try {
		this.myfoundHeaderInfo(fileinfo, data);
	} catch(err) {
		linkyShared.trace("Exception while trying to download!", 1, err);
	}
}

//
LinkyContext.prototype.myfoundHeaderInfo = function(aFileInfo, aData) {
	// get the default local filename
	var defaultFilename = getDefaultFileName(aData.fileName, aFileInfo.uri, null);
	// create the local file
	var lf = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	var defaultDir;
	if (aData.directory) {
		defaultDir = aData.directory;
	} else {
		linkyShared.trace("No directory specified");
		return;
	}
	lf.initWithPath(defaultDir);
	lf.append(defaultFilename);
	linkyShared.trace("full path: " + lf.path);
	var lftmp = lf.path;
 	if (lf.exists()) {
 		switch (this.pref_download_overwrite) {
	 		// overwrite
	 		case 0:
				break;
	 		// prompt
	 		case 1:
				if (!confirm(lf.path + ' exists! Do you want to overwrite?')) {
					return;
				}
	 			break;
	 		// auto-rename
	 		case 3:
	 			var i = 0;
	 			do {
	 				lf.initWithPath(defaultDir);
	 				lf.append(i++ + "_" + defaultFilename);
	 				// to avoid endless recurssion
	 				if (i > 500) {
	 					linkyShared.trace("Recurssion detected! Unable to save URL.");
	 					return;
	 				}
	 			} while (lf.exists());
	 			break;
	 		// ignore
	 		case 2:
	 		default:
	 			linkyShared.trace("Error! pref_download_overwrite was " + this.pref_download_overwrite);
	 			return;
 		}
 	}
	if (lf.path != lftmp)
		linkyShared.trace("new full path: " + lf.path);

	// setup download data
	var source = aFileInfo.uri;
	var persistArgs = {source : source, contentType : "application/octet-stream", target : lf, postData : null, bypassCache : false};

	linkyShared.trace("about to save " + source.spec + " into " + lf.path)

	var dm = Components.classes["@mozilla.org/download-manager;1"].getService(Components.interfaces.nsIDownloadManager);
	var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	var uri_source = ios.newURI(source.spec, null, null);
	var uri_target = ios.newFileURI(lf);
	var dl = dm.addDownload(dm.DOWNLOAD_TYPE_DOWNLOAD, uri_source, uri_target, lf.leafName, null, null, null, pers);

	const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
	var pers = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(nsIWBP);
	pers.persistFlags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES | nsIWBP.PERSIST_FLAGS_FROM_CACHE | nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
	pers.progressListener = dl.QueryInterface(Components.interfaces.nsIWebProgressListener);
	pers.saveURI(dl.source, null, aData.referer, persistArgs.postData, "Linky: Yes\r\n", dl.targetFile);
}

// create the object
const linkyContext = new LinkyContext();
