(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

// var utils = require('./pouch-utils');
var plugin = require('./plugin');

exports.observe = plugin;

/* istanbul ignore next */
if (typeof window !== 'undefined' && window.PouchDB) {
  window.PouchDB.plugin(exports);
}

},{"./plugin":2}],2:[function(require,module,exports){
'use strict';

var ObserverGet = require('./observer-get');
var ObserverFind = require('./observer-find');

function init(db) {
  db._observers = [];
  db.changes({ since: 'now', live: true, include_docs: true }).on('change', function (change) {
    db._observers.forEach(function (observer) {
      observer.processChange(change);
    });
  });
}

module.exports = function (request, callback) {
  var db = this;

  if (db._observers === undefined) init(db);

  var observer;
  if (typeof request === 'string') {
    observer = new ObserverGet(db, request, callback);
  } else {
    observer = new ObserverFind(db, request, callback);
  }
  db._observers.push(observer);

  observer.remove = function () {
    var index = db._observers.indexOf(observer);
    if (index >= 0) db._observers.splice(index, 1);
  };

  return observer;
};

},{"./observer-find":3,"./observer-get":4}],3:[function(require,module,exports){
'use strict';

function comparatorMatches(comparator, v1, v2) {
  if (v1 instanceof Date && v2 instanceof Date) {
    v1 = v1 - v2;
    v2 = 0;
  }
  switch (comparator) {
    case '$eq': return v1 === v2;
    case '$ne': return v1 !== v2;
    case '$gt': return v1 > v2;
    case '$gte': return v1 >= v2;
    case '$lt': return v1 < v2;
    case '$lte': return v1 <= v2;
    case '$in': return v2.indexOf(v1) >= 0;
    case '$nin': return v2.indexOf(v1) < 0;
    case '$exists': return v2 ? typeof v1 !== 'undefined' : typeof v1 === 'undefined';
    case '$type': return typeof v1 === v2;
    default: console.warn('Unknown comparator: ' + comparator);
  }
  return true;
}

function itemMatchesSelector(item, selector) {
  for (var key in selector) {
    if (selector.hasOwnProperty(key)) {
      var itemValue = item[key];
      for (var comparator in selector[key]) {
        if (selector[key].hasOwnProperty(comparator)) {
          if (!comparatorMatches(comparator, itemValue, selector[key][comparator])) return false;
        }
      }
    }
  }
  return true;
}

function indexOfItemWithId(items, id) {
  for (var i in items) {
    if (items[i]._id === id) return i;
  }
  return -1;
}

module.exports = function (db, request, callback) {
  var self = this;
  self.request = request;
  self.callback = callback;

  db.find(self.request).then(function (res) {
    self.items = res.docs;
    self.trigger();
  });

  function removeItem(i) {
    self.items.splice(i, 1);
    self.trigger();
  }

  function updateItem(i, item) {
    self.items.splice(i, 1, item);
    self.trigger();
  }

  function insertItem(item) {
    self.items.push(item);
    self.trigger();
  }

  self.processChange = function (change) {
    var i = indexOfItemWithId(self.items, change.id);
    var match = itemMatchesSelector(change.doc, request.selector);
    if (i < 0 && !match) return;
    if (i >= 0 && (change.deleted || !match)) return removeItem(i);
    if (i >= 0 && match) return updateItem(i, change.doc);
    if (i < 0 && match) return insertItem(change.doc);
  };

  var triggered;
  self.trigger = function () {
    if (triggered) return;
    triggered = true;
    setTimeout(function () {
      triggered = false;
      callback(self.items);
    });
  };

};

},{}],4:[function(require,module,exports){
'use strict';

module.exports = function (db, id, callback) {
  var self = this;
  self.id = id;
  self.callback = callback;

  db.get(self.id).then(function (doc) {
    self.doc = doc;
    self.trigger();
  });

  self.processChange = function (change) {
    if (change.id === self.id) {
      self.doc = change.doc;
      self.trigger();
    }
  };

  var triggered;
  self.trigger = function () {
    if (triggered) return;
    triggered = true;
    setTimeout(function () {
      triggered = false;
      callback(self.doc);
    });
  };

};

},{}]},{},[1]);
