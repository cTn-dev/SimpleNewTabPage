var STORAGE = new function () {
    this.get = function (items, callback) {
        chrome.storage.local.get(items, callback);
    };

    this.set = function (items, callback) {
        chrome.storage.local.set(items, callback);
    };

    this.remove = function (items, callback) {
        chrome.storage.local.remove(items, callback);
    };
};