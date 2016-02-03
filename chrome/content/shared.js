// Put everything into a namespace so that we dont pollute
var LinkyShared = function() {}

LinkyShared.prototype.replaceInsert = function(t, i, v) {
	var result = t;
	var re = new RegExp("#" + i, "g");
	result = result.replace(re, v);
	return result;
}

// Dump message to the JavaScript console
// t : text message
// u : show message to the user?
// a : additional information
LinkyShared.prototype.trace = function(t, u, a) {
	var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.linky.");
	var CONSOLE_SERVICE = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);

	// developer or not?
	var dev = false;
	try {
		dev = pref.getBoolPref("developer");
	} catch(e) {
	}
	t = "Linky - " + t;
	if (u) {
		var s = t;
		if (a) {
			s += "\nSee the Error Console for more info";
		}
		alert(s);
		if (a) {
			t += " - info: " + a;
		}
		CONSOLE_SERVICE.logStringMessage(t);
	} else if (dev) {
		if (a) {
			t += " - info: " + a;
		}
		CONSOLE_SERVICE.logStringMessage(t);
	}
}

window.linkyShared = new LinkyShared;
