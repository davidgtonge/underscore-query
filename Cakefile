# CakeFile inspired by chosen:
# https://raw.github.com/harvesthq/chosen/master/Cakefile
#

fs               = require 'fs'
path             = require 'path'
{spawn, exec}    = require 'child_process'
CoffeeScript     = require 'coffee-script'
handlebars       = require "handlebars"
uglify = require 'uglify-js'
wrapper = handlebars.compile fs.readFileSync("build/wrapper.js").toString()

output =
  'lib/underscore-query.js': ["src/underscore-query.coffee"]
  'lib/underscore-query.amd.js': ["src/underscore-query.coffee"]


wrap = (code) ->  wrapper({code})

task 'build', 'build  from source',  ->
  for js, sources of output
    isAMD = js.indexOf("amd") isnt -1
    js = path.join(__dirname, js)

    code = ''
    for source in sources
      source = path.join(__dirname, source)
      file_contents = "#{fs.readFileSync source}"
      code += CoffeeScript.compile file_contents, {bare:isAMD}
    if isAMD
      code = wrap(code)
    fs.writeFileSync js, code
    minName = js.replace(/\.js$/,'.min.js')
    minCode =  uglify.minify(code, {fromString:true})
    fs.writeFileSync minName, minCode.code