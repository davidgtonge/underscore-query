###
Backbone Query - A lightweight query API for Backbone Collections
(c)2012 - Dave Tonge
May be freely distributed according to MIT license.
###
((define) -> define 'backbone-query', (require, exports) ->
  _ = require('underscore')
  require('underscore-query')
  Backbone = require('backbone')

  # Sorts models either be a model attribute or with a callback
  sortModels = (models, options) ->
    # If the sortBy param is a string then we sort according to the model attribute with that string as a key
    if _(options.sortBy).isString()
      models = _(models).sortBy (model) -> model.get(options.sortBy)
      # If a function is supplied then it is passed directly to the sortBy iterator
    else if _(options.sortBy).isFunction()
      models = _(models).sortBy(options.sortBy)

    # If there is an order property of "desc" then the results can be reversed
    # (sortBy provides result in ascending order by default)
    if options.order is "desc" then models = models.reverse()
    # The sorted models are returned
    models

  # Slices the results set according to the supplied options
  pageModels = (models, options) ->
    # Expects object in the form: {limit: num, offset: num,  page: num, pager:callback}
    if options.offset then start = options.offset
    else if options.page then start = (options.page - 1) * options.limit
    else start = 0

    end = start + options.limit

    # The results are sliced according to the calculated start and end params
    sliced_models = models[start...end]

    if options.pager and _.isFunction(options.pager)
      total_pages = Math.ceil (models.length / options.limit)
      options.pager total_pages, sliced_models

    sliced_models

  # The default Backbone Collection is extended with our query methods
  Backbone.QueryCollection = Backbone.Collection.extend

  # Main Query method
    query: (params, options) ->
      if params
        # If a query is provided, then the query is run immediately
        models = _.query @models, params, "get"
        if options
          # Caching is depreciated
          if options.cache then throw new Error "Query cache is depreciated in version 0.3.0. Use live collections."
          # Optional sorting performed
          if options.sortBy then models = sortModels(models, options)
          # Options paging performed
          if options.limit then models = pageModels(models, options)
        # Return the results
        models

      else
        # If no query is provided then we return a query builder object
        _.query.build @models, "get"


  # Helper method to return a new collection with the filtered models
    whereBy: -> throw new Error "Whereby is depreciated in version 0.3.0, please use live collections or chain"

  # This method assists in creating live collections that remain updated
    setFilter: (parent, query) ->
      # Need a reference to the parent in case the filter is updated
      @_query_parent = parent

      # A checking function is created to test models against
      # The function is added to the collection instance so that it can later be updated
      if query
        @_query = _.query.tester(query, "get")
        # Any existing models on the parent are filtered and added to this collection
        @set _.query(parent.models, @_query, "get")

      else
        # No models to be added by default until filter is set
        @_query = -> false
        # To allow chaining form
        # col.setFilter(parent).add(a,b).not(c,d).set()
        builder = _.query().getter("get")
        builder.set = =>
          @_query = builder.tester()
          # In case the filter is set later we need to ensure any existing models are updated
          @set _.query(parent.models, @_query, "get")

      # Listeners are added to the parent collection
      @listenTo parent,
        # Any model added to the parent, will be added to this collection if it passes the test
        add: (model) -> if @._query(model) then @add(model)
      # Any model removed from the parent will be removed from this collection
        remove: @remove
      # Any model that is changed on the parent will be re-tested
        change: (model) ->
          if @_query(model) then @add(model) else @remove(model)


    updateFilter: (query) ->
      throw new Error "setFiler must be called before updateFilter" unless @_query
      if query
        @_query = _.query.tester(query, "get")
        @set _.query(@_parent.models, @_query, "get")
      else
        # To allow the form col.updateFilter().and(a,v).set()
        builder = _.query().getter("get")
        builder.set = =>
          @_query = builder.tester()
          @set _.query(@_parent.models, @_query, "get")


  # Helper method to return the first filtered model
    findOne: (query) -> _.findOne @models, query, "get"

    resetQueryCache: -> throw new Error "Query cache is depreciated in version 0.3.0"

  # On the server the new Query Collection is added to exports
  exports.QueryCollection = Backbone.QueryCollection
).call this, if typeof define == 'function' and define.amd then define else (id, factory) ->
  unless typeof exports is 'undefined'
    factory ((id) -> require id), exports
  else
    # Load Underscore and backbone. No need to export QueryCollection in an module-less environment
    factory ((id) -> this[if id == 'underscore' then '_' else 'Backbone']), {}
return

