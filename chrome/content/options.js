var LinkyOption = function() {}

LinkyOption.prototype.selectDir = function() {
	var dir = linkyContext.getDirectory();
	if (dir) {
		document.getElementById("linky-pref-download-directory-dir").label = dir;
	}
}

LinkyOption.prototype.startup = function() {
	var dir = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(null).getComplexValue("extensions.linky.download.directory", Components.interfaces.nsILocalFile);
	if (dir) {
		document.getElementById("linky-pref-download-directory-dir").label = dir.path;
	}
}

window.linkyOption = new LinkyOption;