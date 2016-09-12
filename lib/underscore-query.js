
/*
Underscore Query - A lightweight query API for JavaScript collections
(c)2016 - Dave Tonge
May be freely distributed according to MIT license.

This is small library that provides a query api for JavaScript arrays similar to *mongo db*.
The aim of the project is to provide a simple, well tested, way of filtering data in JavaScript.
 */

(function() {
  var QueryBuilder, addToQuery, buildQuery, createUtils, expose, findOne, i, key, len, lookup, makeTest, multipleConditions, parseGetter, parseParamType, parseQuery, parseSubQuery, performQuery, performQuerySingle, ref, root, runQuery, score, single, tag_sort_order, testModelAttribute, testQueryValue, utils,
    hasProp = {}.hasOwnProperty;

  root = this;


  /* UTILS */

  utils = {};

  createUtils = function(_) {
    var i, key, len, ref;
    ref = ["every", "some", "filter", "first", "find", "reject", "reduce", "property", "sortBy", "indexOf", "intersection", "isEqual", "keys", "isArray", "result", "map", "includes", "isNaN"];
    for (i = 0, len = ref.length; i < len; i++) {
      key = ref[i];
      utils[key] = _[key];
      if (!utils[key]) {
        throw new Error(key + " missing. Please ensure that you first initialize underscore-query with either lodash or underscore");
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

  utils.expectedArrayQueries = ["$and", "$or", "$nor"];

  lookup = function(keys, obj) {
    var i, idx, key, len, out, remainingKeys;
    out = obj;
    for (idx = i = 0, len = keys.length; i < len; idx = ++i) {
      key = keys[idx];
      if (utils.isArray(out)) {
        remainingKeys = keys.slice(idx);
        out = utils.map(out, function(v) {
          return lookup(remainingKeys, v);
        });
      } else if (out) {
        out = utils.result(out, key);
      } else {
        break;
      }
    }
    return out;
  };

  utils.makeGetter = function(keys) {
    keys = keys.split(".");
    return function(obj) {
      return lookup(keys, obj);
    };
  };

  multipleConditions = function(key, queries) {
    var results, type, val;
    results = [];
    for (type in queries) {
      val = queries[type];
      results.push(utils.makeObj(key, utils.makeObj(type, val)));
    }
    return results;
  };

  parseParamType = function(query) {
    var key, o, paramType, queryParam, result, size, type, value;
    result = [];
    for (key in query) {
      if (!hasProp.call(query, key)) continue;
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
        case "Array":
          if (utils.includes(utils.compoundKeys, key)) {
            o.type = key;
            o.value = parseSubQuery(queryParam, key);
            o.key = null;
          } else {
            o.type = "$equal";
            o.value = queryParam;
          }
          break;
        case "Object":
          size = utils.keys(queryParam).length;
          if (utils.includes(utils.compoundKeys, key)) {
            o.type = key;
            o.value = parseSubQuery(queryParam, key);
            o.key = null;
          } else if (!(size === 1 || (size === 2 && '$options' in queryParam))) {
            o.type = "$and";
            o.value = parseSubQuery(multipleConditions(key, queryParam));
            o.key = null;
          } else {
            for (type in queryParam) {
              if (!hasProp.call(queryParam, type)) continue;
              value = queryParam[type];
              if (type === "$options") {
                if ("$regex" in queryParam || "regexp" in queryParam) {
                  continue;
                }
                throw new Error("$options needs a $regex");
              }
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
                  case "$regex":
                  case "$regexp":
                    if (typeof value === "string") {
                      o.value = new RegExp(value, queryParam.$options || "");
                    } else {
                      o.value = value;
                    }
                    break;
                  case "$not":
                  case "$nor":
                  case "$or":
                  case "$and":
                    o.value = parseSubQuery(utils.makeObj(o.key, value));
                    o.key = null;
                    break;
                  case "$computed":
                    o = utils.first(parseParamType(utils.makeObj(key, value)));
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
      if ((o.type === "$equal") && (utils.includes(["Object", "Array"], paramType))) {
        o.type = "$deepEqual";
      } else if (utils.isNaN(o.value)) {
        o.type = "$deepEqual";
      }
      result.push(o);
    }
    return result;
  };

  tag_sort_order = ["$lt", "$lte", "$gt", "$gte", "$exists", "$has", "$type", "$ne", "$equal", "$mod", "$size", "$between", "$betweene", "$startsWith", "$endsWith", "$like", "$likeI", "$contains", "$in", "$nin", "$all", "$any", "$none", "$cb", "$regex", "$regexp", "$deepEqual", "$elemMatch", "$not", "$and", "$or", "$nor"];

  parseSubQuery = function(rawQuery, type) {
    var iteratee, key, queryArray, result, val;
    if (utils.isArray(rawQuery)) {
      queryArray = rawQuery;
    } else {
      queryArray = (function() {
        var results;
        results = [];
        for (key in rawQuery) {
          if (!hasProp.call(rawQuery, key)) continue;
          val = rawQuery[key];
          results.push(utils.makeObj(key, val));
        }
        return results;
      })();
    }
    iteratee = function(memo, query) {
      var parsed;
      parsed = parseParamType(query);
      if (type === "$or" && parsed.length >= 2) {
        memo.push({
          type: "$and",
          parsedQuery: parsed
        });
        return memo;
      } else {
        return memo.concat(parsed);
      }
    };
    result = utils.reduce(queryArray, iteratee, []);
    return utils.sortBy(result, function(x) {
      var index;
      index = utils.indexOf(tag_sort_order, x.type);
      if (index >= 0) {
        return index;
      } else {
        return Infinity;
      }
    });
  };

  testQueryValue = function(queryType, value) {
    var valueType;
    valueType = utils.getType(value);
    switch (queryType) {
      case "$in":
      case "$nin":
      case "$all":
      case "$any":
      case "$none":
        return valueType === "Array";
      case "$size":
        return valueType === "Number";
      case "$regex":
      case "$regexp":
        return utils.includes(["RegExp", "String"], valueType);
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
        return utils.includes(["String", "Array"], valueType);
      case "$in":
      case "$nin":
        return value != null;
      default:
        return true;
    }
  };

  performQuery = function(type, value, attr, model, getter) {
    switch (type) {
      case "$and":
      case "$or":
      case "$nor":
      case "$not":
        return performQuerySingle(type, value, getter, model);
      case "$cb":
        return value.call(model, attr);
      case "$elemMatch":
        return runQuery(attr, value, null, true);
    }
    if (typeof value === 'function') {
      value = value();
    }
    switch (type) {
      case "$equal":
        if (utils.isArray(attr)) {
          return utils.includes(attr, value);
        } else {
          return attr === value;
        }
        break;
      case "$deepEqual":
        return utils.isEqual(attr, value);
      case "$ne":
        return attr !== value;
      case "$type":
        return typeof attr === value;
      case "$lt":
        return (value != null) && attr < value;
      case "$gt":
        return (value != null) && attr > value;
      case "$lte":
        return (value != null) && attr <= value;
      case "$gte":
        return (value != null) && attr >= value;
      case "$between":
        return (value[0] != null) && (value[1] != null) && (value[0] < attr && attr < value[1]);
      case "$betweene":
        return (value[0] != null) && (value[1] != null) && (value[0] <= attr && attr <= value[1]);
      case "$size":
        return attr.length === value;
      case "$exists":
      case "$has":
        return (attr != null) === value;
      case "$contains":
        return utils.includes(attr, value);
      case "$in":
        return utils.includes(value, attr);
      case "$nin":
        return !utils.includes(value, attr);
      case "$all":
        return utils.every(value, function(item) {
          return utils.includes(attr, item);
        });
      case "$any":
        return utils.some(attr, function(item) {
          return utils.includes(value, item);
        });
      case "$none":
        return !utils.some(attr, function(item) {
          return utils.includes(value, item);
        });
      case "$like":
        return attr.indexOf(value) !== -1;
      case "$likeI":
        return attr.toLowerCase().indexOf(value) !== -1;
      case "$startsWith":
        return attr.toLowerCase().indexOf(value) === 0;
      case "$endsWith":
        return utils.reverseString(attr).indexOf(value) === 0;
      case "$regex":
      case "$regexp":
        return value.test(attr);
      case "$mod":
        return (attr % value[0]) === value[1];
      default:
        return false;
    }
  };

  single = function(queries, getter, isScore) {
    var queryObj;
    if (getter) {
      getter = parseGetter(getter);
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
        var i, len;
        for (i = 0, len = queries.length; i < len; i++) {
          queryObj = queries[i];
          if (!performQuerySingle(queryObj.type, queryObj.parsedQuery, getter, model, isScore)) {
            return false;
          }
        }
        return true;
      };
    }
  };

  performQuerySingle = function(type, query, getter, model, isScore) {
    var attr, boost, i, len, passes, q, ref, score, scoreInc, test;
    passes = 0;
    score = 0;
    scoreInc = 1 / query.length;
    for (i = 0, len = query.length; i < len; i++) {
      q = query[i];
      if (getter) {
        attr = getter(model, q.key);
      } else if (q.getter) {
        attr = q.getter(model, q.key);
      } else {
        attr = model[q.key];
      }
      test = testModelAttribute(q.type, attr);
      if (test) {
        if (q.parsedQuery) {
          test = single([q], getter, isScore)(model);
        } else {
          test = performQuery(q.type, q.value, attr, model, getter);
        }
      }
      if (test) {
        passes++;
        if (isScore) {
          boost = (ref = q.boost) != null ? ref : 1;
          score += scoreInc * boost;
        }
      }
      switch (type) {
        case "$and":
          if (!(isScore || test)) {
            return false;
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
    var compoundQuery, i, j, key, len, len1, queryKeys, results, type, val;
    queryKeys = utils.keys(query);
    if (!queryKeys.length) {
      return [];
    }
    compoundQuery = utils.intersection(utils.compoundKeys, queryKeys);
    for (i = 0, len = compoundQuery.length; i < len; i++) {
      type = compoundQuery[i];
      if (!utils.isArray(query[type]) && utils.includes(utils.expectedArrayQueries, type)) {
        throw new Error(type + ' query must be an array');
      }
    }
    if (compoundQuery.length === 0) {
      return [
        {
          type: "$and",
          parsedQuery: parseSubQuery(query)
        }
      ];
    } else {
      if (compoundQuery.length !== queryKeys.length) {
        if (!utils.includes(compoundQuery, "$and")) {
          query.$and = {};
          compoundQuery.unshift("$and");
        }
        for (key in query) {
          if (!hasProp.call(query, key)) continue;
          val = query[key];
          if (!(!utils.includes(utils.compundKeys, key))) {
            continue;
          }
          query.$and[key] = val;
          delete query[key];
        }
      }
      results = [];
      for (j = 0, len1 = compoundQuery.length; j < len1; j++) {
        type = compoundQuery[j];
        results.push({
          type: type,
          parsedQuery: parseSubQuery(query[type], type)
        });
      }
      return results;
    }
  };

  parseGetter = function(getter) {
    if (typeof getter === 'string') {
      return function(obj, key) {
        return obj[getter](key);
      };
    } else {
      return getter;
    }
  };

  QueryBuilder = (function() {
    function QueryBuilder(items1, _getter) {
      this.items = items1;
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
      var base;
      if (qVal) {
        params = utils.makeObj(params, qVal);
      }
      if ((base = this.theQuery)[type] == null) {
        base[type] = [];
      }
      this.theQuery[type].push(params);
      return this;
    };
  };

  ref = utils.compoundKeys;
  for (i = 0, len = ref.length; i < len; i++) {
    key = ref[i];
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
      fn = utils.find;
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
    createUtils(_);
    if (mixin) {
      _.mixin({
        query: runQuery,
        q: runQuery
      });
    }
    return runQuery;
  };

  if (typeof exports !== "undefined" && (typeof module !== "undefined" && module !== null ? module.exports : void 0)) {
    return module.exports = expose;
  } else if (root._) {
    return expose(root._);
  }

  return expose;

}).call(this);
