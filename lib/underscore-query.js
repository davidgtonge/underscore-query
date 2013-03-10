(function (root) {
  var require = root.require || function(name) { return root[name]; };
  /*
Underscore Query - A lightweight query API for JavaScript collections
(c)2012 - Dave Tonge
May be freely distributed according to MIT license.

This is small library that provides a query api for JavaScript arrays similar to *mongo db*.
The aim of the project is to provide a simple, well tested, way of filtering data in JavaScript.
*/

var buildQuery, iterator, key, parseQuery, parseSubQuery, performQuery, runQuery, testModelAttribute, testQueryValue, utils, _, _i, _len, _ref,
  __hasProp = {}.hasOwnProperty,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

_ = require('underscore');

/* UTILS
*/


utils = {};

_ref = ["every", "some", "filter", "reject", "reduce", "intersection", "isEqual", "keys", "isArray", "result"];
for (_i = 0, _len = _ref.length; _i < _len; _i++) {
  key = _ref[_i];
  utils[key] = _[key];
}

utils.getType = function(obj) {
  var type;
  type = Object.prototype.toString.call(obj).substr(8);
  return type.substr(0, type.length - 1);
};

utils.makeObj = function(key, val) {
  var o;
  (o = {})[key] = val;
  return o;
};

utils.getNested = function(keyArray) {
  return function(obj) {
    var out, _j, _len1;
    out = obj;
    for (_j = 0, _len1 = keyArray.length; _j < _len1; _j++) {
      key = keyArray[_j];
      if (out) {
        out = out[key];
      }
    }
    return out;
  };
};

utils.reverseString = function(str) {
  return str.toLowerCase().split("").reverse().join("");
};

utils.compoundKeys = ["$and", "$not", "$or", "$nor"];

utils.seperator = ".";

parseSubQuery = function(rawQuery) {
  var o, paramType, query, queryArray, queryParam, type, val, value, _j, _len1, _results;
  if (utils.isArray(rawQuery)) {
    queryArray = rawQuery;
  } else {
    queryArray = (function() {
      var _results;
      _results = [];
      for (key in rawQuery) {
        if (!__hasProp.call(rawQuery, key)) continue;
        val = rawQuery[key];
        _results.push(utils.makeObj(key, val));
      }
      return _results;
    })();
  }
  _results = [];
  for (_j = 0, _len1 = queryArray.length; _j < _len1; _j++) {
    query = queryArray[_j];
    for (key in query) {
      if (!__hasProp.call(query, key)) continue;
      queryParam = query[key];
      o = {
        key: key
      };
      if (key.indexOf(utils.seperator) !== -1) {
        o.getter = utils.getNested(key.split(utils.seperator));
      }
      paramType = utils.getType(queryParam);
      switch (paramType) {
        case "RegExp":
        case "Date":
          o.type = "$" + (paramType.toLowerCase());
          o.value = queryParam;
          break;
        case "Object":
          if (__indexOf.call(utils.compoundKeys, key) >= 0) {
            o.type = key;
            o.value = parseSubQuery(queryParam);
            o.key = null;
          } else {
            for (type in queryParam) {
              value = queryParam[type];
              if (testQueryValue(type, value)) {
                o.type = type;
                switch (type) {
                  case "$elemMatch":
                    o.value = parseQuery(value);
                    break;
                  case "$endsWith":
                    o.value = utils.reverseString(value);
                    break;
                  case "$likeI":
                  case "$startsWith":
                    o.value = value.toLowerCase();
                    break;
                  default:
                    o.value = value;
                }
              } else {
                throw new Error("Query value doesn't match query type: " + type + ": " + value);
              }
            }
          }
          break;
        default:
          o.type = "$equal";
          o.value = queryParam;
      }
      if ((o.type === "$equal") && (paramType === "Object" || paramType === "Array")) {
        o.type = "$deepEqual";
      }
    }
    _results.push(o);
  }
  return _results;
};

testQueryValue = function(queryType, value) {
  var valueType;
  valueType = utils.getType(value);
  switch (queryType) {
    case "$in":
    case "$nin":
    case "$all":
    case "$any":
      return valueType === "Array";
    case "$size":
      return valueType === "Number";
    case "$regex":
    case "$regexp":
      return valueType === "RegExp";
    case "$like":
    case "$likeI":
      return valueType === "String";
    case "$between":
    case "$mod":
      return (valueType === "Array") && (value.length === 2);
    case "$cb":
      return valueType === "Function";
    default:
      return true;
  }
};

testModelAttribute = function(queryType, value) {
  var valueType;
  valueType = utils.getType(value);
  switch (queryType) {
    case "$like":
    case "$likeI":
    case "$regex":
    case "$startsWith":
    case "$endsWith":
      return valueType === "String";
    case "$contains":
    case "$all":
    case "$any":
    case "$elemMatch":
      return valueType === "Array";
    case "$size":
      return valueType === "String" || valueType === "Array";
    case "$in":
    case "$nin":
      return value != null;
    default:
      return true;
  }
};

performQuery = function(type, value, attr, model) {
  switch (type) {
    case "$equal":
      if (utils.isArray(attr)) {
        return __indexOf.call(attr, value) >= 0;
      } else {
        return attr === value;
      }
      break;
    case "$deepEqual":
      return utils.isEqual(attr, value);
    case "$contains":
      return __indexOf.call(attr, value) >= 0;
    case "$ne":
      return attr !== value;
    case "$lt":
      return attr < value;
    case "$gt":
      return attr > value;
    case "$lte":
      return attr <= value;
    case "$gte":
      return attr >= value;
    case "$between":
      return (value[0] < attr && attr < value[1]);
    case "$betweene":
      return (value[0] <= attr && attr <= value[1]);
    case "$in":
      return __indexOf.call(value, attr) >= 0;
    case "$nin":
      return __indexOf.call(value, attr) < 0;
    case "$all":
      return utils.every(value, function(item) {
        return __indexOf.call(attr, item) >= 0;
      });
    case "$any":
      return utils.some(attr, function(item) {
        return __indexOf.call(value, item) >= 0;
      });
    case "$size":
      return attr.length === value;
    case "$exists":
    case "$has":
      return (attr != null) === value;
    case "$like":
      return attr.indexOf(value) !== -1;
    case "$likeI":
      return attr.toLowerCase().indexOf(value) !== -1;
    case "$startsWith":
      return attr.toLowerCase().indexOf(value) === 0;
    case "$endsWith":
      return utils.reverseString(attr).indexOf(value) === 0;
    case "$type":
      return typeof attr === value;
    case "$regex":
    case "$regexp":
      return value.test(attr);
    case "$cb":
      return value.call(model, attr);
    case "$mod":
      return (attr % value[0]) === value[1];
    case "$elemMatch":
      return (runQuery(attr, value, null, true)).length > 0;
    case "$and":
    case "$or":
    case "$nor":
    case "$not":
      return iterator([model], value, type).length === 1;
    default:
      return false;
  }
};

iterator = function(models, query, type, getter) {
  var andOr, filterFunction;
  filterFunction = type === "$and" || type === "$or" ? utils.filter : utils.reject;
  andOr = (type === "$or" || type === "$nor");
  return filterFunction(models, function(model) {
    var attr, q, test, _j, _len1;
    for (_j = 0, _len1 = query.length; _j < _len1; _j++) {
      q = query[_j];
      if (q.getter) {
        attr = q.getter(model);
      } else if (getter) {
        attr = getter(model, q.key);
      } else {
        attr = model[q.key];
      }
      test = testModelAttribute(q.type, attr);
      if (test) {
        test = performQuery(q.type, q.value, attr, model);
      }
      if (andOr === test) {
        return andOr;
      }
    }
    return !andOr;
  });
};

parseQuery = function(query) {
  var compoundQuery, queryKeys, type, val;
  queryKeys = utils.keys(query);
  compoundQuery = utils.intersection(utils.compoundKeys, queryKeys);
  if (compoundQuery.length === 0) {
    return [
      {
        type: "$and",
        parsedQuery: parseSubQuery(query)
      }
    ];
  } else {
    if (compoundQuery.length !== queryKeys.length) {
      if (__indexOf.call(compoundQuery, "$and") < 0) {
        query.$and = {};
        compoundQuery.unshift("$and");
      }
      for (key in query) {
        if (!__hasProp.call(query, key)) continue;
        val = query[key];
        if (!(__indexOf.call(utils.compoundKeys, key) < 0)) {
          continue;
        }
        query.$and[key] = val;
        delete query[key];
      }
    }
    return (function() {
      var _j, _len1, _results;
      _results = [];
      for (_j = 0, _len1 = compoundQuery.length; _j < _len1; _j++) {
        type = compoundQuery[_j];
        _results.push({
          type: type,
          parsedQuery: parseSubQuery(query[type])
        });
      }
      return _results;
    })();
  }
};

buildQuery = function(items, getter, isParsed) {
  var out, _fn, _j, _len1, _ref1;
  out = {
    items: items,
    getter: getter,
    isParsed: isParsed,
    theQuery: {}
  };
  out.all = out.find = out.query = out.run = function(items, getter, isParsed) {
    if (items == null) {
      items = out.items;
    }
    if (getter == null) {
      getter = out.getter;
    }
    if (isParsed == null) {
      isParsed = out.isParsed;
    }
    return runQuery(items, out.theQuery, getter, isParsed);
  };
  out.first = function() {
    var _ref1;
    return (_ref1 = out.all.apply(this, arguments)) != null ? _ref1[0] : void 0;
  };
  out.chain = function() {
    return _.chain(out.all.apply(this, arguments));
  };
  _ref1 = utils.compoundKeys;
  _fn = function(key) {
    var op;
    op = key.substr(1);
    return out[op] = function(params, qVal) {
      var _base, _ref2;
      if (qVal) {
        params = utils.makeObj(params, qVal);
      }
      if ((_ref2 = (_base = out.theQuery)[key]) == null) {
        _base[key] = [];
      }
      out.theQuery[key].push(params);
      return out;
    };
  };
  for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
    key = _ref1[_j];
    _fn(key);
  }
  return out;
};

runQuery = function(items, query, getter, isParsed) {
  var method, reduceIterator;
  if (!isParsed) {
    query = parseQuery(query);
  }
  if (utils.getType(getter) === "String") {
    method = getter;
    getter = function(obj, key) {
      return obj[method](key);
    };
  }
  reduceIterator = function(memo, queryItem) {
    return iterator(memo, queryItem.parsedQuery, queryItem.type, getter);
  };
  return utils.reduce(query, reduceIterator, items);
};

runQuery.build = buildQuery;

runQuery.parse = parseQuery;

_.mixin({
  query: runQuery
});

}).call(this);