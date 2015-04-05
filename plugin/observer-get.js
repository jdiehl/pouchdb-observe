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
