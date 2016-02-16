# Requires
require "coffee-script"

assert = require "assert"
_query = require("../src/underscore-query")()

suite = require "./suite"

describe "Underscore Query Tests", ->
  suite(_query)
