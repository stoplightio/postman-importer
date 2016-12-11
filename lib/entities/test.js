const jsonHelper = require('../utils/json');

function Test(name) {
  this._id = null;
  this.name = name;
  this.summary = '';
  this.initialVariables = '{}';
  this.steps = [];
  // TODO map each step to maintain proper structure
}

Test.prototype = {
  get Id() {
    return this._id;
  },
  set Id(id) {
    this._id = id;
  },
  get Name() {
    return this.name;
  },
  set Name(name) {
    this.name = name;
  },
  get Summary() {
    return this.summary || '';
  },
  set Summary(summary) {
    this.summary = summary;
  },
  get InitialVariables() {
    return this.initialVariables;
  },
  set InitialVariables(initialVariables) {
    this.initialVariables = jsonHelper.stringify(initialVariables, 4);
  },
  get Steps() {
    return this.steps;
  },
  set Steps(steps) {
    this.steps = steps;
  }
};

module.exports = Test;
