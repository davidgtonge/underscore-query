# Requires
require "coffee-script"

assert = require "assert"
_ = require "lodash"
require("../src/underscore-query")(_)

suite = require "./suite"

describe "Underscore Query Tests", ->
  suite(_.query)
