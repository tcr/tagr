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

this.tagr = tagr =
    use: (el) -> new Tagr(el)
    create: (tag, attrs = {}) ->
        e = document.createElement tag
        e.setAttribute(k, v) for k, v of attrs    
        return new Tagr(e)
    parse: (str) ->
        return str if typeof str == 'string'
        [tag, attrs, args...] = str
        e = tagr.create tag, attrs
        for arg in args
            e.push tagr.parse arg
        return e
    guid: 0

tagr.ready = do ->
    loaded = /^loade|c/.test(document.readyState)

    fns = []
    flush = (f) ->
        loaded = yes
        f() while f = fns.shift()

    if document.documentElement.doScroll
        document.attachEvent "onreadystatechange", fn = ->
            if /^c/.test(document.readyState)
                document.detachEvent "onreadystatechange", fn
                flush()
        return (fn) ->
            if self isnt top then (if loaded then fn() else fns.push(fn))
            else (->
                try
                    testEl.doScroll "left"
                catch e
                    return setTimeout (-> ready fn), 50
                fn()
            )()
    if document.addEventListener?
        document.addEventListener "DOMContentLoaded", fn = ->
            document.removeEventListener "DOMContentLoaded", fn, false
            flush()
        , false
        return (fn) -> if loaded then fn() else fns.push(fn)

Stylesheet = (media = 'all') ->
    s = document.createElement 'style'
    s.type = 'text/css'
    s.media = media
    document.getElementsByTagName('head')[0].appendChild s
    return s

Script = ->
    s = document.createElement 'script'
    s.src = 'about:blank'
    document.getElementsByTagName('head')[0].appendChild s
    return s

HeadCache = do ->
    hc = {}

    sCache = {}
    hc.getStylesheet = (media = 'all') ->
        return sCache[media] if sCache[media]?
        s = new Stylesheet(media)
        return sCache[media] = (s.sheet or s.styleSheet)

    #TODO scripts?

    return hc

checkNode = (e) ->
    if typeof e == 'string' then return document.createTextNode e
    if e.node.parentNode then throw new Error 'Must remove element before appending elsewhere.'
    return e.node
    
class Tagr extends EventEmitter
    constructor: (@node, @parent) ->
        @node.setAttribute 'data-tagr', String (@guid = tagr.guid++)
        @tag = @node.nodeName.toLowerCase()
        # Attributes and classes.
        @attrs = {}
        for attr in @node.attributes
            @attrs[attr.name] = attr.value
        @classes = (@node.className.match(/\S+/g) or [])
        # Styles.
        @style = {}
        for k in @node.style
            @style[k] = @node.style[k]
        @length = @node.childNodes.length
        for c, i in @node.childNodes
            @[i] = (if c.nodeType == 1 then new Tagr(c, @) else c.nodeValue)
        # Don't hog memory until we do
        #@_detach()
    _detach: -> @node = null
    _attach: -> @node = Sizzle("[data-tagr=\"#{@guid}\"]")[0]

    # Children.
    splice: (i, del, add...) ->
        if i < 0 or isNaN(i) then throw 'Invalid index'
        # Remove nodes.
        if del
            for c in [0...del]
                #@emit 'removeChild', @[i+c]
                @[i+c].parent = null
                @node.removeChild @node.childNodes[i]
        ret = (@[i+j] for j in [0...del])
        # Shift nodes in array index.
        if del > add.length
            for j in [i + del...@length]
                @[j-del] = @[j]
        if add.length > del
            for j in [@length+add.length-1...i]
                @[j] = @[j-add.length]
        # Insert new nodes.
        if add.length
            right = @node.childNodes[i]
            for c, j in add
                if typeof c == 'object' and c?.constructor == Array then c = tagr.parse(c)
                #@emit 'insertChild', c
                @node.insertBefore checkNode(c), right
                @[i+j] = c
                c.parent = this
        @length += (-del) + add.length
        return ret
    push: (e) -> @splice(@length, 0, e); @length
    pop: -> @splice(@length-1, 1)[0]
    unshift: (e) -> @splice(0, 0, e); @length
    shift: -> @splice(0, 1)[0]
    remove: (e) -> @splice @indexOf(e), 1
    insert: (i, e) -> @splice i, 0, e
    empty: -> @splice 0, @length
    indexOf: (e) -> [].indexOf.call(this, e)

    # Match children
    match: (match) -> new TagrList @node, match

    # Attributes.
    setAttr: (name, v) ->
        if name == 'class' then @classes = (v.match(/\S+/g) or [])
        @node.setAttribute(name, v); @attrs[name] = v
    # Classes.
    setClass: (name, toggle = yes) ->
        if toggle then @setAttr 'class', @classes.concat([name]).join ' '
        else @setAttr 'class', (c for c in @classes when c != name).join ' '

    # Style
    setStyle: (args...) ->
        if args.length == 2 then [k, v] = args; args = {}; args[k] = v
        else args = args[0]
        for k, v of args then @style[k] = @node.style[k] = v

    # Events
    addListener: (type, f) ->
        @node.addEventListener type, ((e) => @emit type, e), false
        return super type, f

    # JSON
    toJSON: -> [@tag, @attrs, ((if typeof x == 'string' then x else x.toJSON()) for x in @)...]

class TagrList extends EventEmitter
    constructor: (@node, @match) ->
        @length = 0
        for el, i in Sizzle(match, @node)
            @[i] = new Tagr el
            @length++

    addListener: (type, f) ->
        @node.addEventListener type, ((e) =>
            if Sizzle.matches("[data-tagr='#{@node.getAttribute('data-tagr')}'] #{@match}", [e.target]).length
                f.call new Tagr(e.target), e
            ), false
        return super type, f

    setStyle: (args...) ->
        s = HeadCache.getStylesheet()
        if args.length == 2 then [k, v] = args; args = {}; args[k] = v
        else args = args[0]
        for k, v of args then s.insertRule "[data-tagr='#{@node.getAttribute('data-tagr')}'] #{@match} { #{k}: #{v} }", s.cssRules.length

# Transplant array functions.
for n in ['forEach', 'slice'] when Array::[n]?
    for Cls in [Tagr, TagrList]
        Cls::[n] = Array::[n]

new Script('https://raw.github.com/jquery/sizzle/master/sizzle.js')
