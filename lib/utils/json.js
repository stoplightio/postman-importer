const _ = require('lodash'),
   jsonSchemaConverter = require('json-schema-compatibility');

module.exports = {
  parse: function(data){
    if (typeof data !== 'string') {
      return data;
    }

    try{
      let result = JSON.parse(data);
      if ((typeof result) === 'string') {
        return this.parse(result);
      }
      return result;
    } catch(err) {
      //can't parse, use as it is
      return data;
    }
  },
  stringify: function(jsonObj, spacing){
    if ((typeof jsonObj) === 'string') {
      return jsonObj;
    }
    if (!spacing) {
      spacing = 0;
    }
    return JSON.stringify(jsonObj, null, spacing);
  },
  //format given object/json string with pretty print style
  format: function(data){
    if ((typeof data) !== 'string') {
      if ((typeof data) === 'object') {
        return this.stringify(data, 4);
      }
      return data;
    }
    //try parse
    let result = this.parse(data);
    if ((typeof result) === 'string') {
      //not parsable, no formatting possible
      return data;
    }
    return this.stringify(result, 4);
  },
  //return json version of the given object, excluding function/getters/setters etc
  toJSON: function(obj) {
    let def = {};
    for (let property in obj) {
      let propType = typeof obj[property];
      if (propType !== 'function' && propType !== 'undefined') {
        def[property] = obj[property];
      }
    }
    return def;
  },
  //sort object keys in given order, acccepts both array and objects
  orderByKeys: function(obj, propertiesOrder) {
    //if array recursive call to all items
    if (Array.isArray(obj)) {
      let me = this;
      return obj.map(function(item){
        return me.orderByKeys(item, propertiesOrder);
      });
    }

    let orderedObj = {};
    //place the ordered key items first
    for (let i in propertiesOrder) {
      let key = propertiesOrder[i];
      if (obj.hasOwnProperty(key)) {
        orderedObj[key] = obj[key];
      }
    }

    //add if something missing from the given orders
    for (let key in obj) {
      if (!orderedObj.hasOwnProperty(key)) {
        orderedObj[key] = obj[key];
      }
    }
    return orderedObj;
  },
  // checks whether json schema is empty
  isEmptySchema: function(schema) {
    if (_.isEmpty(schema)) {
      return true;
    }

    let parsed = schema;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (e) {
        return true;
      }
    }

    if (!parsed || !Object.keys(parsed).length || (parsed.properties && !Object.keys(parsed.properties).length)) {
      return true;
    }

    if (parsed.type === 'object' && _.isEmpty(parsed.properties)) {
      return true;
    }

    if (parsed.type === 'array' && _.isEmpty(parsed.items)) {
      return true;
    }

    return false;
  },
  cleanSchema: function(schema) {
    let parsed = this.parse(schema);

    try {
      jsonSchemaConverter.v4(parsed);
    } catch (e) {}

    return this.stringify(parsed, 4);
  }
};
