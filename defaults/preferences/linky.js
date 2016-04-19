// show debug information in Error Console 
pref("extensions.linky.developer", false);
// Show tab/windows/both options
// 0 = tab
// 1 = window
// 2 = both
pref("extensions.linky.showopen", 0);
// when do we show the Select Links dialog
pref("extensions.linky.showselect", 0);
// enable/disable menuitems
pref("extensions.linky.context.alllinks", true);
pref("extensions.linky.context.piclinks", true);
pref("extensions.linky.context.piclinksshow", true);
pref("extensions.linky.context.picshow", true);
pref("extensions.linky.context.selectedlinks", true);
pref("extensions.linky.context.selectedtextlinks", true);
pref("extensions.linky.context.validatelinks", true);
pref("extensions.linky.context.downloadlinks", true);
pref("extensions.linky.context.clipboard", true);
// what extensions to treat as images
pref("extensions.linky.imgexts", "jpg|jpeg|gif|png|bmp");
// what validator URL to use
pref("extensions.linky.validateURL", "http://validator.w3.org/check?verbose=1&ss=1&uri=");
// open mail and news links like mailto: news: snews:?
pref("extensions.linky.open_mailnews", false);
// how to handle overwrites when downloading files
// 0 = always overwrite
// 1 = prompt
// 2 = never overwrite and skip download
// 3 = automaticly find a new name to save to
pref("extensions.linky.download.overwrite", 3);
// where to save downloaded files
pref("extensions.linky.download.directory", "");
// remember last download directory
pref("extensions.linky.download.directory.remember", true);

pref("extensions.linky.timer_delay", 2000);