underscore-query
===================

[![Build Status](https://secure.travis-ci.org/davidgtonge/underscore-query.png)](http://travis-ci.org/davidgtonge/underscore-query)

A lightweight query API plugin for Underscore.js - works in the Browser and on the Server.
This project was originally [Backbone Query](https://github.com/davidgtonge/backbone_query), however I found that it
was useful to have the ability to query arrays as well as Backbone Collections. So the library has been ported to
underscore, and backbone-query now uses underscore-query.

In updating the prokect serveral new features have been added, including the ability to use a chainable query api.

### Features

 - Search for objects with a Query API similar to [MongoDB](http://www.mongodb.org/display/DOCS/Advanced+Queries)
 - Use a complex query object, or build queries up with a chainable api
 - Full support for compound queries ($not, $nor, $or, $and), including nested compound queries.
 - Full support for querying nested arrays (see `$elemMatch`)
 - Accepts dot notation to query deep properties (e.g. {"stats.views.december": 100}
 - Custom getters can be defined, (e.g. `.get` for Backbone)
 - Works well with underscore chaining

Please report any bugs, feature requests in the issue tracker.
Pull requests are welcome!


Installation
============

#### Client Side Installation:
To install, include the `lib/underscore-query.min.js` file in your HTML page, after Underscore (or Lodash).
`_.query` will now be available for you to use.

If you use AMD, then you can use "lib/underscore-query.amd.js".
This will return a function that accepts either underscore or lodash. This function
also accepts an optional boolean argument on whether to mixin the query methods to underscore/lodash.
If you are using AMD and you want the methods mixed in, then you'd only need to require "underscore-query" once
probably in your init script:

```js
define('myModule',
    ['underscore', 'underscore-query'],
    function ( _, underscoreQuery ) {
        // opt 1
        underscoreQuery(_); // _.query is now available on the underscore module
        // opt 2
        var query = underscoreQuery(_, false) // query is available as a local variable with all the query methods
    }
```

#### Server side (node.js) installation
You can install with NPM: `npm install underscore-query`
The library can work with either lodash or underscore, when you first require it in it exposes a method that takes
either underscore or lodash:

```ja
// With Underscore
_ = require("underscore");
require("underscore-query")(_);

// With Lodash
_ = require("lodash");
require("underscore-query(_);

// If you don't want the query methods 'mixed in'
_ = require("underscore");
query = require("underscore-query")(_, false);
```



Basic Usage
===========

The following are some basic examples:

```js
_.query( MyCollection, {
    featured:true, 
    likes: {$gt:10}
});
// Returns all models where the featured attribute is true and there are
// more than 10 likes

_.query( MyCollection, {tags: { $any: ["coffeescript", "backbone", "mvc"]}});
// Finds models that have either "coffeescript", "backbone", "mvc" in their "tags" attribute

_.query(MyCollection, {
  // Models must match all these queries
  $and:{
    title: {$like: "news"}, // Title attribute contains the string "news"
    likes: {$gt: 10}
  }, // Likes attribute is greater than 10

  // Models must match one of these queries
  $or:{
    featured: true, // Featured attribute is true
    category:{$in:["code","programming","javascript"]}
  } 
  //Category attribute is either "code", "programming", or "javascript"
});

titles = _.query.build( MyCollection )
  .and("published", true)
  .or("likes", {$gt:10})
  .or("tags":["javascript", "coffeescript"])
  .chain()
  .sortBy(_.query.get("likes"))
  .pluck("title")
  .value();
// Builds a query up programatically
// Runs the query, sort's by likes, and plucks the titles.


query = _.query.build()
  .and("published", true)
  .or("likes", {$gt:10})
  .or("tags":["javascript", "coffeescript"])

resultsA = query.all(collectionA)
resultsB = query.all(collectionB)
// Builds a query and then runs it on 2 seperate collections

```

Or if CoffeeScript is your thing (the source is written in CoffeeScript), try this:

```coffeescript
_.query MyCollection,
  $and:
    likes: $lt: 15
  $or:
    content: $like: "news"
    featured: $exists: true
  $not:
    colors: $contains: "yellow"
```



Query API
===

### $equal
Performs a strict equality test using `===`. If no operator is provided and the query value isn't a regex then `$equal` is assumed.

If the attribute in the model is an array then the query value is searched for in the array in the same way as `$contains`

If the query value is an object (including array) then a deep comparison is performed using underscores `_.isEqual`

```javascript
_.query( MyCollection, { title:"Test" });
// Returns all models which have a "title" attribute of "Test"

_.query( MyCollection, { title: {$equal:"Test"} }); // Same as above

_.query( MyCollection, { colors: "red" });
// Returns models which contain the value "red" in a "colors" attribute that is an array.

MyCollection.query ({ colors: ["red", "yellow"] });
// Returns models which contain a colors attribute with the array ["red", "yellow"]
```

### $contains
Assumes that the model property is an array and searches for the query value in the array

```js
_.query( MyCollection, { colors: {$contains: "red"} });
// Returns models which contain the value "red" in a "colors" attribute that is an array.
// e.g. a model with this attribute colors:["red","yellow","blue"] would be returned
```

### $ne
"Not equal", the opposite of $equal, returns all models which don't have the query value

```js
_.query( MyCollection, { title: {$ne:"Test"} });
// Returns all models which don't have a "title" attribute of "Test"
```

### $lt, $lte, $gt, $gte
These conditional operators can be used for greater than and less than comparisons in queries

```js
_.query( MyCollection, { likes: {$lt:10} });
// Returns all models which have a "likes" attribute of less than 10
_.query( MyCollection, { likes: {$lte:10} });
// Returns all models which have a "likes" attribute of less than or equal to 10
_.query( MyCollection, { likes: {$gt:10} });
// Returns all models which have a "likes" attribute of greater than 10
_.query( MyCollection, { likes: {$gte:10} });
// Returns all models which have a "likes" attribute of greater than or equal to 10
```

### $between
To check if a value is in-between 2 query values use the $between operator and supply an array with the min and max value

```js
_.query( MyCollection, { likes: {$between:[5,15] } });
// Returns all models which have a "likes" attribute of greater than 5 and less then 15
```

### $in
An array of possible values can be supplied using $in, a model will be returned if any of the supplied values is matched

```js
_.query( MyCollection, { title: {$in:["About", "Home", "Contact"] } });
// Returns all models which have a title attribute of either "About", "Home", or "Contact"
```

### $nin
"Not in", the opposite of $in. A model will be returned if none of the supplied values is matched

```js
_.query( MyCollection, { title: {$nin:["About", "Home", "Contact"] } });
// Returns all models which don't have a title attribute of either
// "About", "Home", or "Contact"
```

### $all
Assumes the model property is an array and only returns models where all supplied values are matched.

```js
_.query( MyCollection, { colors: {$all:["red", "yellow"] } });
// Returns all models which have "red" and "yellow" in their colors attribute.
// A model with the attribute colors:["red","yellow","blue"] would be returned
// But a model with the attribute colors:["red","blue"] would not be returned
```

### $any
Assumes the model property is an array and returns models where any of the supplied values are matched.

```js
_.query( MyCollection, { colors: {$any:["red", "yellow"] } });
// Returns models which have either "red" or "yellow" in their colors attribute.
```

### $size
Assumes the model property has a length (i.e. is either an array or a string).
Only returns models the model property's length matches the supplied values

```js
_.query( MyCollection, { colors: {$size:2 } });
// Returns all models which 2 values in the colors attribute
```

### $exists or $has
Checks for the existence of an attribute. Can be supplied either true or false.

```js
_.query( MyCollection, { title: {$exists: true } });
// Returns all models which have a "title" attribute
_.query( MyCollection, { title: {$has: false } });
// Returns all models which don't have a "title" attribute
```

### $like
Assumes the model attribute is a string and checks if the supplied query value is a substring of the property.
Uses indexOf rather than regex for performance reasons

```js
_.query( MyCollection, { title: {$like: "Test" } });
//Returns all models which have a "title" attribute that
//contains the string "Test", e.g. "Testing", "Tests", "Test", etc.
```

### $likeI
The same as above but performs a case insensitive search using indexOf and toLowerCase (still faster than Regex)

```js
_.query( MyCollection, { title: {$likeI: "Test" } });
//Returns all models which have a "title" attribute that
//contains the string "Test", "test", "tEst","tesT", etc.
```

### $regex
Checks if the model attribute matches the supplied regular expression. The regex query can be supplied without the `$regex` keyword

```js
_.query( MyCollection, { content: {$regex: /coffeescript/gi } });
// Checks for a regex match in the content attribute
_.query( MyCollection, { content: /coffeescript/gi });
// Same as above
```

### $cb
A callback function can be supplied as a test. The callback will receive the attribute and should return either true or false.
`this` will be set to the current model, this can help with tests against computed properties

```js
_.query( MyCollection, { title: {$cb: function(attr){ return attr.charAt(0) === "c";}} });
// Returns all models that have a title attribute that starts with "c"

_.query( MyCollection, { computed_test: {$cb: function(){ return this.computed_property() > 10;}} });
// Returns all models where the computed_property method returns a value greater than 10.
```

For callbacks that use `this` rather than the model attribute, the key name supplied is arbitrary and has no
effect on the results. If the only test you were performing was like the above test it would make more sense
to simply use `MyCollection.filter`. However if you are performing other tests or are using the paging / sorting /
caching options of backbone query, then this functionality is useful.

### $elemMatch
This operator allows you to perform queries in nested arrays similar to [MongoDB](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24elemMatch)
For example you may have a collection of models in with this kind of data stucture:

```js
var Posts = new QueryCollection([
    {title: "Home", comments:[
      {text:"I like this post"},
      {text:"I love this post"},
      {text:"I hate this post"}
    ]},
    {title: "About", comments:[
      {text:"I like this page"},
      {text:"I love this page"},
      {text:"I really like this page"}
    ]}
]);
```
To search for posts which have the text "really" in any of the comments you could search like this:

```js
Posts.query({
  comments: {
    $elemMatch: {
      text: /really/i
    }
  }
});
```

All of the operators above can be performed on `$elemMatch` queries, e.g. `$all`, `$size` or `$lt`.
`$elemMatch` queries also accept compound operators, for example this query searches for all posts that
have at least one comment without the word "really" and with the word "totally".
```js
Posts.query({
  comments: {
    $elemMatch: {
      $not: {
        text: /really/i
      },
      $and: {
        text: /totally/i
      }
    }
  }
});
```


### $computed
This operator allows you to perform queries on computed properties. For example you may want to perform a query
for a persons full name, even though the first and last name are stored separately in your db / model.
For example

```js
testModel = Backbone.Model.extend({
  full_name: function() {
    return (this.get('first_name')) + " " + (this.get('last_name'));
  }
});

a = new testModel({
  first_name: "Dave",
  last_name: "Tonge"
});

b = new testModel({
  first_name: "John",
  last_name: "Smith"
});

MyCollection = new QueryCollection([a, b]);

_.query( MyCollection, {
  full_name: { $computed: "Dave Tonge" }
});
// Returns the model with the computed `full_name` equal to Dave Tonge

_.query( MyCollection, {
  full_name: { $computed: { $likeI: "john smi" } }
});
// Any of the previous operators can be used (including elemMatch is required)
```


Combined Queries
================

Multiple queries can be combined together. By default all supplied queries use the `$and` operator. However it is possible
to specify either `$or`, `$nor`, `$not` to implement alternate logic.

### $and

```js
_.query( MyCollection, { $and: { title: {$like: "News"}, likes: {$gt: 10}}});
// Returns all models that contain "News" in the title and have more than 10 likes.
_.query( MyCollection, { title: {$like: "News"}, likes: {$gt: 10} });
// Same as above as $and is assumed if not supplied
```

### $or

```js
_.query( MyCollection, { $or: { title: {$like: "News"}, likes: {$gt: 10}}});
// Returns all models that contain "News" in the title OR have more than 10 likes.
```

### $nor
The opposite of `$or`

```js
_.query( MyCollection, { $nor: { title: {$like: "News"}, likes: {$gt: 10}}});
// Returns all models that don't contain "News" in the title NOR have more than 10 likes.
```

### $not
The opposite of `$and`

```js
_.query( MyCollection, { $not: { title: {$like: "News"}, likes: {$gt: 10}}});
// Returns all models that don't contain "News" in the title AND DON'T have more than 10 likes.
```

If you need to perform multiple queries on the same key, then you can supply the query as an array:
```js
_.query( MyCollection, {
    $or:[
        {title:"News"},
        {title:"About"}
    ]
});
// Returns all models with the title "News" or "About".
```


Compound Queries
================

It is possible to use multiple combined queries, for example searching for models that have a specific title attribute,
and either a category of "abc" or a tag of "xyz"

```js
_.query( MyCollection, {
    $and: { title: {$like: "News"}},
    $or: {likes: {$gt: 10}, color:{$contains:"red"}}
});
//Returns models that have "News" in their title and
//either have more than 10 likes or contain the color red.
```


Chainable API
=============

Rather than supplying a single query object, you can build up the query bit by bit:

```javascript
 _.query.build( MyCollection )
  .and("published", true)
  .or("likes", {$gt:10})
  .or("tags":["javascript", "coffeescript"])
  .run()
```

Instead of calling `_.query`, we call `_.query.build`. This returns a query object that we can build before running.
`_.query.build` can take the collection that you want to query, or alternatively you can pass the collection in when
running the query. Therefore these 2 both give the same results:

```javascript
 results = _.query.build( MyCollection ).and("published", true).run()
 results = _.query.build().and("published", true).run( MyCollection )
```

To build the query you can call `.and`, `.or`, `.nor` and `.not`.
These methods can accept either a query object, or a query key and a query value.  For example the following two examples
are the same.

```javascript
 results = _.query.build( MyCollection ).and({"published":true}).run()
 results = _.query.build( MyCollection ).and("published", true).run()
```

To run the query you can call either `.run`, `.all`, `.find`, or `.all`.
These methods are all aliases too each other and will run the query returning an array of results.

To retrieve just the first results you can use `.first`. For example:

```javascript
 firstResult = _.query.build( MyCollection ).and({"published":true}).first()
```

If you wish to perform further data manipulation using underscore, you can call the `.chain` method.
This will run the query and return the results as a wrapped underscore object, whcih you can then use methods like
`.sortBy`, `.groupBy`, `.map`, etc.

```javascript
titles = _.query.build( MyCollection )
  .and("published", true)
  .or("likes", {$gt:10})
  .or("tags":["javascript", "coffeescript"])
  .chain()
  .sortBy(function(item) { return item.likes; })
  .pluck("title")
  .value();
```

Indexing
========


More documentation coming...
Essentially you can add indexes when using the chainable syntax.
You can then perform queries as usual, but the results, should be faster on larger sets
I suggest that you benchmark your code to test this out.
The index method takes either a single key, or a key and a function.


```coffeescript

    query = _.query(array)
      .index("title")

    # could have been .index("title", (obj) -> obj.title)

    result = query.and("title", "Home").run()
```





Contributors
===========

Dave Tonge - [davidgtonge](http://github.com/davidgtonge)
Rob W - [Rob W](https://github.com/Rob--W)
Cezary Wojtkowski - [cezary](https://github.com/cezary)
