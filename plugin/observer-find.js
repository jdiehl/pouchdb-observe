'use strict';

function comparatorMatches(comparator, v1, v2) {
  if (v2 instanceof Date && typeof v1 === 'string') {
    v1 = new Date(v1);
  }
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
