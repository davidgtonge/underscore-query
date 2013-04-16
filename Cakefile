# CakeFile inspired by chosen:
# https://raw.github.com/harvesthq/chosen/master/Cakefile
#
# Building  requires coffee-script and uglify-js. For
# help installing, try:
#
# `npm -g install coffee-script uglify-js`
#
fs               = require 'fs'
path             = require 'path'
{spawn, exec}    = require 'child_process'
CoffeeScript     = require 'coffee-script'
uglify = require 'uglify-js'


output =
  'lib/underscore-query.js': ["src/underscore-query.coffee"]


wrap = (code) ->  """
(function (require) {

  #{code}
}).call(this,  typeof exports !== 'undefined' ? require : function(id) {
  return this[id === 'underscore' ? '_' : id];
});
"""

task 'build', 'build  from source',  ->
  for js, sources of output
    js = path.join(__dirname, js)
    code = ''
    for source in sources
      source = path.join(__dirname, source)
      file_contents = "#{fs.readFileSync source}"
      code += CoffeeScript.compile file_contents, {bare:true}
    code = wrap(code)
    fs.writeFileSync js, code
    minName = js.replace(/\.js$/,'.min.js')
    minCode =  uglify.minify(code, {fromString:true})
    fs.writeFileSync minName, minCode.code

