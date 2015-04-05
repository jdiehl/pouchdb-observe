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
