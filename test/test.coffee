# Requires
require "coffee-script"

assert = require "assert"
_ = require "underscore"
require("../src/underscore-query")(_)

suite = require "./suite"

describe "Underscore Query Tests", ->
  suite(_.query)
