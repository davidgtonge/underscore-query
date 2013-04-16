###
Underscore Query - A lightweight query API for JavaScript collections
(c)2012 - Dave Tonge
May be freely distributed according to MIT license.

This is small library that provides a query api for JavaScript arrays similar to *mongo db*.
The aim of the project is to provide a simple, well tested, way of filtering data in JavaScript.
###

# *underscore* is the only dependency for this project.
_ = require('underscore')

### UTILS ###
# We assign local references to the underscore methods used.
# This way we can easily remove underscore as a dependecy for other versions of the library
utils = {}
for key in ["every", "some", "filter", "reject", "reduce", "intersection", "isEqual", "keys", "isArray", "result"]
  utils[key] = _[key]

# Returns a string denoting the type of object
utils.getType =  (obj) ->
  type = Object.prototype.toString.call(obj).substr(8)
  type.substr(0, (type.length - 1))

# Utility Function to turn 2 values into an object
utils.makeObj = (key, val)->
  (o = {})[key] = val
  o

# Returns a function that retrieves the nested value fron an array of nested keys
utils.getNested = (keyArray) ->
  (obj) ->
    out = obj
    for key in keyArray
      if out then out = out[key]
    out

# Reverses a string
utils.reverseString = (str) -> str.toLowerCase().split("").reverse().join("")

# An array of the compound modifers that can be used in queries
utils.compoundKeys = ["$and", "$not", "$or", "$nor"]

# The seperator string for nested property lookup
utils.seperator = "."

# This function parses and normalizes raw queries.
parseSubQuery = (rawQuery) ->

  # Ensure that the query is an array
  if utils.isArray(rawQuery)
    queryArray = rawQuery
  else
    queryArray = (utils.makeObj(key, val) for own key, val of rawQuery)

  # Loop through all the different queries
  (for query in queryArray
    # Start building a normalized query object for each query
    for own key, queryParam of query
      o = {key}
      # If the key uses dot notation, then create a getter function
      if key.indexOf(utils.seperator) isnt -1
        o.getter = utils.getNested(key.split(utils.seperator))

      paramType = utils.getType(queryParam)
      switch paramType
      # Test for Regexs and Dates as they can be supplied without an operator
        when "RegExp", "Date"
          o.type = "$#{paramType.toLowerCase()}"
          o.value = queryParam

        when "Object"
          # If the key is one of the compound keys, then parse the param as a raw query
          if key in utils.compoundKeys
            o.type = key
            o.value = parseSubQuery queryParam
            o.key = null

          # Otherwise extract the key and value
          else
            for type, value of queryParam
              # Before adding the query, its value is checked to make sure it is the right type
              if testQueryValue type, value
                o.type = type
                switch type
                  when "$elemMatch" then o.value = parseQuery value
                  when "$endsWith" then o.value = utils.reverseString(value)
                  when "$likeI", "$startsWith" then o.value = value.toLowerCase()
                  else o.value = value
              else throw new Error("Query value doesn't match query type: #{type}: #{value}")
      # If the query_param is not an object or a regexp then revert to the default operator: $equal
        else
          o.type = "$equal"
          o.value = queryParam

      # For "$equal" queries with arrays or objects we need to perform a deep equal
      if (o.type is "$equal") and (paramType in ["Object","Array"])
        o.type = "$deepEqual"
    o)


# Tests query value, to ensure that it is of the correct type
testQueryValue = (queryType, value) ->
  valueType = utils.getType(value)
  switch queryType
    when "$in","$nin","$all", "$any"  then valueType is "Array"
    when "$size"                      then valueType is "Number"
    when "$regex", "$regexp"          then valueType is "RegExp"
    when "$like", "$likeI"            then valueType is "String"
    when "$between", "$mod"           then (valueType is "Array") and (value.length is 2)
    when "$cb"                        then valueType is "Function"
    else true

# Test each attribute that is being tested to ensure that is of the correct type
testModelAttribute = (queryType, value) ->
  valueType = utils.getType(value)
  switch queryType
    when "$like", "$likeI", "$regex", "$startsWith", "$endsWith"  then valueType is "String"
    when "$contains", "$all", "$any", "$elemMatch" then valueType is "Array"
    when "$size"                      then valueType in ["String","Array"]
    when "$in", "$nin"                then value?
    else true

# Perform the actual query logic for each query and each model/attribute
performQuery = (type, value, attr, model) ->
  switch type
    when "$equal"
      # If the attribute is an array then search for the query value in the array the same as Mongo
      if utils.isArray(attr) then (value in attr) else (attr is value)
    when "$deepEqual"       then utils.isEqual(attr, value)
    when "$contains"        then value in attr
    when "$ne"              then attr isnt value
    when "$lt"              then attr < value
    when "$gt"              then attr > value
    when "$lte"             then attr <= value
    when "$gte"             then attr >= value
    when "$between"         then value[0] < attr < value[1]
    when "$betweene"        then value[0] <= attr <= value[1]
    when "$in"              then attr in value
    when "$nin"             then attr not in value
    when "$all"             then utils.every value, (item) -> item in attr
    when "$any"             then utils.some attr, (item) -> item in value
    when "$size"            then attr.length is value
    when "$exists", "$has"  then attr? is value
    when "$like"            then attr.indexOf(value) isnt -1
    when "$likeI"           then attr.toLowerCase().indexOf(value) isnt -1
    when "$startsWith"      then attr.toLowerCase().indexOf(value) is 0
    when "$endsWith"        then utils.reverseString(attr).indexOf(value) is 0
    when "$type"            then typeof attr is value
    when "$regex", "$regexp" then value.test attr
    when "$cb"              then value.call model, attr
    when "$mod"             then (attr % value[0]) is value[1]
    when "$elemMatch"       then (runQuery(attr,value, null, true)).length > 0
    when "$and", "$or", "$nor", "$not"
      iterator([model], value, type).length is 1
    else false


# The main iterator that actually applies the query
iterator = (models, query, type, getter) ->
  filterFunction = if type in ["$and","$or"] then utils.filter else utils.reject
  andOr = (type in ["$or","$nor"])
  # The collections filter or reject method is used to iterate through each model in the collection
  filterFunction models, (model) ->
    # For each model in the collection, iterate through the supplied queries
    for q in query
      # Retrieve the attribute value from the model
      if q.getter
        attr = q.getter model
      else if getter
        attr = getter model, q.key
      else
        attr = model[q.key]

      # Check if the attribute value is the right type (some operators need a string, or an array)
      test = testModelAttribute(q.type, attr)
      # If the attribute test is true, perform the query
      if test then test = performQuery q.type, q.value, attr, model
      # If the query is an "or" query than as soon as a match is found we return "true"
      # Whereas if the query is an "and" query then we return "false" as soon as a match isn't found.
      return andOr if andOr is test

    # For an "or" query, if all the queries are false, then we return false
    # For an "and" query, if all the queries are true, then we return true
    not andOr


# The main function to parse raw queries.
# Queries are split according to the compound type ($and, $or, etc.) before being parsed with parseSubQuery
parseQuery = (query) ->
  queryKeys = utils.keys(query)
  compoundQuery = utils.intersection utils.compoundKeys, queryKeys

  # If no compound methods are found then use the "and" iterator
  if compoundQuery.length is 0
    return [{type:"$and", parsedQuery:parseSubQuery(query)}]
  else
    # Detect if there is an implicit $and compundQuery operator
    if compoundQuery.length isnt queryKeys.length
      # Add the and compund query operator (with a sanity check that it doesn't exist)
      if "$and" not in compoundQuery
        query.$and = {}
        compoundQuery.unshift "$and"
      for own key, val of query when key not in utils.compoundKeys
        query.$and[key] = val
        delete query[key]
    return (for type in compoundQuery
      {type, parsedQuery:parseSubQuery(query[type])})


# Build Query function for progamatically building up queries before running them.
buildQuery = (items, getter, isParsed) ->
  out = {items, getter, isParsed, theQuery:{}}
  out.all = out.find = out.query = out.run = (items = out.items, getter = out.getter, isParsed = out.isParsed) ->
    runQuery(items, out.theQuery, getter, isParsed)
  out.first = -> out.all.apply(this, arguments)?[0]
  out.chain = -> _.chain(out.all.apply(this, arguments))
  for key in utils.compoundKeys
    do (key) ->
      op = key.substr(1)
      out[op] = (params, qVal) ->
        if qVal
          params = utils.makeObj params, qVal
        out.theQuery[key] ?= []
        out.theQuery[key].push params
        out
  out

# Create a *test* function that checks if the object or objects match the query
makeTest = (query, getter) ->
  parsedQuery = parseQuery(query)
  (items) ->
    items = [items] unless utils.isArray(items)
    runQuery(items, parsedQuery, getter, true).length is items.length

# The main function to be mxied into underscore that takes a collection and a raw query
runQuery = (items, query, getter, isParsed) ->
  if arguments.length < 2
    # If no arguments or only the items are provided, then use the buildQuery interface
    return buildQuery.apply this, arguments
  query = parseQuery(query) unless isParsed
  if utils.getType(getter) is "String"
    method = getter
    getter = (obj, key) -> obj[method](key)
  reduceIterator = (memo, queryItem) ->
    iterator memo, queryItem.parsedQuery, queryItem.type, getter
  utils.reduce(query, reduceIterator, items)

runQuery.build = buildQuery
runQuery.parse = parseQuery
runQuery.tester = makeTest
_.mixin
  query:runQuery