// Send a message to the active tab that a browser action has been initiated by
// a click.
chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id,
    	{"message": "clicked_browser_action"});
  });
});
