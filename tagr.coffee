class EventEmitter
        listeners: (type) ->
            if @hasOwnProperty.call (if @_events? then @_events else @_events = {}), type then @_events[type] else @_events[type] = []
        on: (args...) -> @addListener args...
        once: (type, f) -> @on type, g = (args...) -> f.apply(this, args); @removeListener type, g
        addListener: (type, f) ->
            if (@listeners(type).push f) > @_maxListeners and @_maxListeners != 0
                console?.warn "Possible EventEmitter memory leak detected. #{@_events[type].length} listeners added. Use emitter.setMaxListeners() to increase limit."
            @emit "newListener", type, f
            this
        removeListener: (type, f) ->
            if (i = @listeners(type).indexOf f) != -1 then @listeners(type).splice i, 1
            this
        removeAllListeners: (type) ->
            for k, v of (@_events or {}) when not type? or type == k then v.splice(0, v.length)
            this
        emit: (type, args...) ->
            for f in @listeners(type) then f.apply this, args
            @listeners(type).length > 0
        _maxListeners: 10
        setMaxListeners: (@_maxListeners) ->

tagr =
  use: (el) -> new Tagr(el)
  create: (tag, attrs = {}) ->
    e = document.createElement tag
    e.setAttribute(k, v) for k, v of attrs    
    return new Tagr(e)
  parse: (str) ->
    console.log str
    return str if typeof str == 'string'
    [tag, attrs, args...] = str
    e = tagr.create tag, attrs
    for arg in args
      e.push tagr.parse arg
    return e
  
class Tagr extends EventEmitter
  constructor: (@node, @parent) ->
    @tag = @node.nodeName.toLowerCase()
    @attrs = {}
    for attr in @node.attributes
      @attrs[attr.name] = attr.value
    @length = @node.childNodes.length
    for c, i in @node.childNodes
      @[i] = (if c.nodeType == 1 then new Tagr(c, @) else c.nodeValue)
  checkNode = (e) ->
    if typeof e == 'string' then return document.createTextNode e
    if e.node.parentNode then throw new Error 'Must remove element'
    return e
  splice: (i, del, add...) ->
    if i < 0 or isNaN(i) then throw 'Invalid index'
    for c in [0...del]
      @emit 'removeChild', @[i+c]
      @[i+c].parent = null
      @node.removeChild @node.childNodes[i]
    ret = (@[i+j] for j in [0...del])
    if del > add.length
      for j in [i + del...@length]
        @[j-del] = @[j]
    if add.length > del
      for j in [@length+add.length-1...i]
        @[j] = @[j-add.length]
    right = @node.childNodes[i]
    for c, j in add
      @emit 'insertChild', c
      @node.insertBefore checkNode(c), right
      @[i+j] = c
      c.parent = this
    @length += (-del) + add.length
    return ret
  indexOf: (e) -> [].indexOf.call(this, e)
  push: (e) -> @splice(@length, 0, e); @length
  unshift: (e) -> @splice(0, 0, e); @length
  pop: -> @splice(@length-1, 1)[0]
  shift: -> @splice(0, 1)[0]
  remove: (e) -> @splice @indexOf(e), 1
  insert: (i, e) -> @splice i, 0, e
  setAttr: (name, v) -> @node.setAttribute(name, v); @attrs[name] = v
  toJSON: -> [@tag, @attrs, ((if typeof x == 'string' then x else x.toJSON()) for x in @)...]

body = tagr.use(document.body)
h1 = body[1]
h1.push 'one'
h1.push 'two'
h1.push 'three'
console.log h1.splice 1, 1, 'apple'
console.log h1, h1.length
h1.remove(h1[1])
console.log body.toJSON()
console.log tagr.parse(body.toJSON())
​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​