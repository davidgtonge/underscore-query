// AMD Wrapper
define(function(){
    
/*
Underscore Query - A lightweight query API for JavaScript collections
(c)2015 - Dave Tonge
May be freely distributed according to MIT license.

This is small library that provides a query api for JavaScript arrays similar to *mongo db*.
The aim of the project is to provide a simple, well tested, way of filtering data in JavaScript.
 */
var QueryBuilder, addToQuery, buildQuery, createUtils, expose, findOne, key, makeTest, multipleConditions, parseGetter, parseParamType, parseQuery, parseSubQuery, performQuery, performQuerySingle, root, runQuery, score, single, testModelAttribute, testQueryValue, underscoreReplacement, utils, _i, _len, _ref,
  __slice = [].slice,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
  __hasProp = {}.hasOwnProperty;

root = this;


/* UTILS */

utils = {};

underscoreReplacement = function() {
  var out;
  out = {};
  ["every", "some", "filter", "reduce", "map"].forEach(function(key) {
    return out[key] = function() {
      var args, array;
      array = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return array[key].apply(array, args);
    };
  });
  out.keys = Object.keys;
  out.isArray = Array.isArray;
  out.result = function(obj, key) {
    if (obj == null) {
      obj = {};
    }
    if (utils.getType(obj[key]) === "Function") {
      return obj[key]();
    } else {
      return obj[key];
    }
  };
  out.detect = function(array, fn) {
    var item, _i, _len;
    for (_i = 0, _len = array.length; _i < _len; _i++) {
      item = array[_i];
      if (fn(item)) {
        return item;
      }
    }
  };
  out.reject = function(array, fn) {
    var item, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = array.length; _i < _len; _i++) {
      item = array[_i];
      if (!fn(item)) {
        _results.push(item);
      }
    }
    return _results;
  };
  out.intersection = function(array1, array2) {
    var item, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = array1.length; _i < _len; _i++) {
      item = array1[_i];
      if (array2.indexOf(item) !== -1) {
        _results.push(item);
      }
    }
    return _results;
  };
  out.isEqual = function(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  };
  return out;
};

createUtils = function(_) {
  var key, _i, _len, _ref;
  _ref = ["every", "some", "filter", "detect", "reject", "reduce", "intersection", "isEqual", "keys", "isArray", "result", "map"];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    key = _ref[_i];
    utils[key] = _[key];
    if (!utils[key]) {
      throw new Error("" + key + " missing. Please ensure that you first initialize underscore-query with either lodash or underscore");
    }
  }
};

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

utils.reverseString = function(str) {
  return str.toLowerCase().split("").reverse().join("");
};

utils.compoundKeys = ["$and", "$not", "$or", "$nor"];

utils.makeGetter = function(keys) {
  keys = keys.split(".");
  return function(obj) {
    var key, out, _i, _len;
    out = obj;
    for (_i = 0, _len = keys.length; _i < _len; _i++) {
      key = keys[_i];
      if (out) {
        out = utils.result(out, key);
      }
    }
    return out;
  };
};

multipleConditions = function(key, queries) {
  var type, val, _results;
  _results = [];
  for (type in queries) {
    val = queries[type];
    _results.push(utils.makeObj(key, utils.makeObj(type, val)));
  }
  return _results;
};

parseParamType = function(query) {
  var key, o, paramType, queryParam, type, value;
  key = utils.keys(query)[0];
  queryParam = query[key];
  o = {
    key: key
  };
  if (queryParam != null ? queryParam.$boost : void 0) {
    o.boost = queryParam.$boost;
    delete queryParam.$boost;
  }
  if (key.indexOf(".") !== -1) {
    o.getter = utils.makeGetter(key);
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
      } else if (utils.keys(queryParam).length > 1) {
        o.type = "$and";
        o.value = parseSubQuery(multipleConditions(key, queryParam));
        o.key = null;
      } else {
        for (type in queryParam) {
          if (!__hasProp.call(queryParam, type)) continue;
          value = queryParam[type];
          if (testQueryValue(type, value)) {
            o.type = type;
            switch (type) {
              case "$elemMatch":
                o.value = single(parseQuery(value));
                break;
              case "$endsWith":
                o.value = utils.reverseString(value);
                break;
              case "$likeI":
              case "$startsWith":
                o.value = value.toLowerCase();
                break;
              case "$not":
              case "$nor":
              case "$or":
              case "$and":
                o.value = parseSubQuery(utils.makeObj(o.key, value));
                o.key = null;
                break;
              case "$computed":
                o = parseParamType(utils.makeObj(key, value));
                o.getter = utils.makeGetter(key);
                break;
              default:
                o.value = value;
            }
          } else {
            throw new Error("Query value (" + value + ") doesn't match query type: (" + type + ")");
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
  return o;
};

parseSubQuery = function(rawQuery) {
  var key, query, queryArray, val, _i, _len, _results;
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
  for (_i = 0, _len = queryArray.length; _i < _len; _i++) {
    query = queryArray[_i];
    _results.push(parseParamType(query));
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

performQuery = function(type, value, attr, model, getter) {
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
      return runQuery(attr, value, null, true);
    case "$and":
    case "$or":
    case "$nor":
    case "$not":
      return performQuerySingle(type, value, getter, model);
    default:
      return false;
  }
};

single = function(queries, getter, isScore) {
  var method, queryObj;
  if (utils.getType(getter) === "String") {
    method = getter;
    getter = function(obj, key) {
      return obj[method](key);
    };
  }
  if (isScore) {
    if (queries.length !== 1) {
      throw new Error("score operations currently don't work on compound queries");
    }
    queryObj = queries[0];
    if (queryObj.type !== "$and") {
      throw new Error("score operations only work on $and queries (not " + queryObj.type);
    }
    return function(model) {
      model._score = performQuerySingle(queryObj.type, queryObj.parsedQuery, getter, model, true);
      return model;
    };
  } else {
    return function(model) {
      var _i, _len;
      for (_i = 0, _len = queries.length; _i < _len; _i++) {
        queryObj = queries[_i];
        if (!performQuerySingle(queryObj.type, queryObj.parsedQuery, getter, model, isScore)) {
          return false;
        }
      }
      return true;
    };
  }
};

performQuerySingle = function(type, query, getter, model, isScore) {
  var attr, boost, passes, q, score, scoreInc, test, _i, _len, _ref;
  passes = 0;
  score = 0;
  scoreInc = 1 / query.length;
  for (_i = 0, _len = query.length; _i < _len; _i++) {
    q = query[_i];
    if (q.getter) {
      attr = q.getter(model, q.key);
    } else if (getter) {
      attr = getter(model, q.key);
    } else {
      attr = model[q.key];
    }
    test = testModelAttribute(q.type, attr);
    if (test) {
      test = performQuery(q.type, q.value, attr, model, getter);
    }
    if (test) {
      passes++;
      if (isScore) {
        boost = (_ref = q.boost) != null ? _ref : 1;
        score += scoreInc * boost;
      }
    }
    switch (type) {
      case "$and":
        if (!isScore) {
          if (!test) {
            return false;
          }
        }
        break;
      case "$not":
        if (test) {
          return false;
        }
        break;
      case "$or":
        if (test) {
          return true;
        }
        break;
      case "$nor":
        if (test) {
          return false;
        }
        break;
      default:
        throw new Error("Invalid compound method");
    }
  }
  if (isScore) {
    return score;
  } else if (type === "$not") {
    return passes === 0;
  } else {
    return type !== "$or";
  }
};

parseQuery = function(query) {
  var compoundQuery, key, queryKeys, type, val;
  queryKeys = utils.keys(query);
  if (!queryKeys.length) {
    return [];
  }
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
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = compoundQuery.length; _i < _len; _i++) {
        type = compoundQuery[_i];
        _results.push({
          type: type,
          parsedQuery: parseSubQuery(query[type])
        });
      }
      return _results;
    })();
  }
};

parseGetter = function(getter) {
  var method;
  if (utils.getType(getter) === "String") {
    method = getter;
    getter = function(obj, key) {
      return obj[method](key);
    };
  }
  return getter;
};

QueryBuilder = (function() {
  function QueryBuilder(items, _getter) {
    this.items = items;
    this._getter = _getter;
    this.theQuery = {};
  }

  QueryBuilder.prototype.all = function(items, first) {
    if (items) {
      this.items = items;
    }
    if (this.indexes) {
      items = this.getIndexedItems(this.items);
    } else {
      items = this.items;
    }
    return runQuery(items, this.theQuery, this._getter, first);
  };

  QueryBuilder.prototype.chain = function() {
    return _.chain(this.all.apply(this, arguments));
  };

  QueryBuilder.prototype.tester = function() {
    return makeTest(this.theQuery, this._getter);
  };

  QueryBuilder.prototype.first = function(items) {
    return this.all(items, true);
  };

  QueryBuilder.prototype.getter = function(_getter) {
    this._getter = _getter;
    return this;
  };

  return QueryBuilder;

})();

addToQuery = function(type) {
  return function(params, qVal) {
    var _base;
    if (qVal) {
      params = utils.makeObj(params, qVal);
    }
    if ((_base = this.theQuery)[type] == null) {
      _base[type] = [];
    }
    this.theQuery[type].push(params);
    return this;
  };
};

_ref = utils.compoundKeys;
for (_i = 0, _len = _ref.length; _i < _len; _i++) {
  key = _ref[_i];
  QueryBuilder.prototype[key.substr(1)] = addToQuery(key);
}

QueryBuilder.prototype.find = QueryBuilder.prototype.query = QueryBuilder.prototype.run = QueryBuilder.prototype.all;

buildQuery = function(items, getter) {
  return new QueryBuilder(items, getter);
};

makeTest = function(query, getter) {
  return single(parseQuery(query), parseGetter(getter));
};

findOne = function(items, query, getter) {
  return runQuery(items, query, getter, true);
};

runQuery = function(items, query, getter, first, isScore) {
  var fn;
  if (arguments.length < 2) {
    return buildQuery.apply(this, arguments);
  }
  if (getter) {
    getter = parseGetter(getter);
  }
  if (!(utils.getType(query) === "Function")) {
    query = single(parseQuery(query), getter, isScore);
  }
  if (isScore) {
    fn = utils.map;
  } else if (first) {
    fn = utils.detect;
  } else {
    fn = utils.filter;
  }
  return fn(items, query);
};

score = function(items, query, getter) {
  return runQuery(items, query, getter, false, true);
};

runQuery.build = buildQuery;

runQuery.parse = parseQuery;

runQuery.findOne = runQuery.first = findOne;

runQuery.score = score;

runQuery.tester = runQuery.testWith = makeTest;

runQuery.getter = runQuery.pluckWith = utils.makeGetter;

expose = function(_, mixin) {
  if (mixin == null) {
    mixin = true;
  }
  if (!_) {
    _ = underscoreReplacement();
    mixin = false;
  }
  createUtils(_);
  if (mixin) {
    _.mixin({
      query: runQuery,
      q: runQuery
    });
  }
  return runQuery;
};

if (root._) {
  return expose(root._);
}

if (exports && (typeof module !== "undefined" && module !== null ? module.exports : void 0)) {
  return module.exports = expose;
}

return expose;

});