'use strict';

// var utils = require('./pouch-utils');
var plugin = require('./plugin');

exports.observe = plugin;

/* istanbul ignore next */
if (typeof window !== 'undefined' && window.PouchDB) {
  window.PouchDB.plugin(exports);
}
