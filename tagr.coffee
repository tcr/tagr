###*
* @license Tagr, HTML manipulation for webapps. MIT Licensed.
###

fromCamelCase = -> name.replace(/([A-Z])/g, "-$1").toLowerCase()
toCamelCase = -> name.toLowerCase().replace(/\-[a-z]/g, ((s) -> s[1].toUpperCase()))

# EventEmitter
# ------------

# Standard shim to replicate Node.js behavior.

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

# Obligatory DomReady hander.

addDomReadyListener = do ->
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

# HTML Object generics. Mimicks the handy APIs of the
# Audio, Image, Video, etc. elements.

@Stylesheet = Stylesheet = (media = 'all') ->
	s = document.createElement 'style'
	s.type = 'text/css'
	s.media = media
	document.getElementsByTagName('head')[0].appendChild s
	return s

@Script = Script = ->
	s = document.createElement 'script'
	s.src = 'about:blank'
	document.getElementsByTagName('head')[0].appendChild s
	return s

# DOM Map
# -------

# Unique property. Use IE's .uniqueId, or use expando for other browsers.
getElementUUID = do ->
	uuid = 0
	return (elem) -> elem.uniqueId ? (elem.uniqueId = uuid++)

# Map of values/objects to DOM nodes without leaking memory. Data should
# manually be cleared using .clean(elem) when a node is no longer in use.

class DomMap

	isEmptyObject = (obj) ->
		for key of obj then return no
		return yes

	constructor: ->
		@cache = {}

	set: (elem, name, value) ->
		(@cache[getElementUUID(elem)] ?= {})[name] = value
	get: (elem, name) ->
		if (data = @cache[getElementUUID(elem)])? then data[name]
		else null

	remove: (elem, name) ->
		if obj = @cache[getElementUUID(elem)]
			delete obj[name]
			if isEmptyObject(obj)
				delete @cache[getElementUUID(elem)]
		return null

	clean: (elem) -> delete @cache[getElementUUID(elem)]

# Tagr model
# ----------

# Default namespace. tagr() defaults to tagr.create, creating a new
# element.

@tagr = tagr = (args...) -> tagr.create args...

# Configuration.
tagr.IGNORE_ATTRS = ['data-tagr']
# Tagr uses direct element properties on the object. Browsers need
# aMappingToCamelCaseForMostProperties.
tagr.ATTR_PROPS =
	for: "htmlFor", accesskey: "accessKey", codebase: "codeBase"
	frameborder: "frameBorder", framespacing: "frameSpacing", nowrap: "noWrap"
	maxlength: "maxLength", class: "className", readonly: "readOnly"
	longdesc: "longDesc", tabindex: "tabIndex", rowspan: "rowSpan"
	colspan: "colSpan", enctype: "encType", ismap: "isMap"
	usemap: "useMap", cellpadding: "cellPadding", cellspacing: "cellSpacing"
# Because we cache attributes statically, we need to detect changes
# made by the user. (We trust the user! Not the programmer. Bad programmer.)
tagr.ATTR_WATCH =
	# http://www.greywyvern.com/?post=282
	value: (t) ->
		update = -> t.attrs.value = t._node.value
		t.on 'input', update
		t.on 'propertychange', (e) -> if e.propertyName == 'value' then update()
	checked: (t) -> t.on 'change', -> t.attrs.checked = t._node.checked

# Create a new Tagr object.
tagr.create = (tag, attrs = {}) ->
	e = document.createElement tag
	e.setAttribute(k, v) for k, v of attrs    
	return new Tagr(e)

tagr.parse = (str) ->
	return str if typeof str == 'string'
	[tag, attrs, args...] = str
	e = tagr.create tag, attrs
	e.append (tagr.parse(arg) for arg in args)...
	return e

# Convience for DOM loading.
tagr.ready = addDomReadyListener

# DOM <-> tagr object mapping.
tagr._map = new DomMap()

# tagr.getContext creates an element context.
# Only Tagr methods should be used on the children of this context.
tagr.getContext = (node) ->
	throw new Error('Cannot create Tagr context from non-element') if node.nodeType != 1
	unless (obj = tagr._map.get(node, 'tagr'))?
		tagr._map.set node, 'tagr', (obj = new Tagr(node))
	return obj
# Get a wrapper for a node. This doesn't create a wrapper, but throws
# an error if one doesn't exist. Used to wrap query results.
tagr.getWrapper = (node) ->
	throw new Error('Cannot create Tagr context of non-element') if node.nodeType != 1
	unless (obj = tagr._map.get(node, 'tagr'))?
		throw new Error('No Tagr wrapper exists for this element.')
	return obj

# document.write a new context, avoiding tagr.ready()
tagr.writeContext = (tag = 'div', attrs = {}) ->
	document.write("<#{tag}></#{tag}>")
	list = document.getElementsByTagName('*')
	return tagr.getContext(list[list.length-1]).setAttrs attrs

# Tagr wrapper objects map 1:1 with the DOM.
	
tagr.Tagr = class Tagr extends EventEmitter

	constructor: (@_node, @parent) ->
		@tag = @_node.nodeName.toLowerCase()
		# Attributes and classes.
		@attrs = {}
		for attr in @_node.attributes when attr not in tagr.IGNORE_ATTRS
			@attrs[attr.name] = attr.value
		for k, v of tagr.ATTR_WATCH when @_node[tagr.ATTR_PROPS[k] ? k]?
			v(this)
		# Classes.
		@classes = (@_node.className.match(/\S+/g) or [])
		# Styles.
		@style = {}
		for k in @_node.style
			@style[k] = @_node.style[k]
		# Children.
		@length = @_node.childNodes.length
		for c, i in @_node.childNodes
			@[i] = (if c.nodeType == 1 then new Tagr(c, @) else c._nodeValue)

	# Associate DOM node with Tagr object, for querying. We only need
	# this association when elements are attached to the document.
	_attach: (@parent) -> tagr._map.set @_node, 'tagr', this
	_detach: -> @parent = null; tagr._map.remove @_node, 'tagr'

	# Create a data attribute with the element UUID. This is used only
	# for styling.
	_ensureAttrUuid: ->
		if not @_node.hasAttribute('data-tagr')
			@_node.setAttribute 'data-tagr', getElementUUID(@_node)
		@_node.getAttribute('data-tagr')

	# Children.
	splice: (i, del, add...) ->
		if i < 0 or isNaN(i) then throw 'Invalid index'
		# Remove nodes.
		if del
			ret = for j in [0...del]
				c = @[i+j]
				@_node.removeChild @_node.childNodes[i]
				if typeof c == 'object' then c._detach()
				delete @[i+j]
				c
		# Shift nodes in array index.
		if del > add.length
			for j in [i + del...@length]
				@[j-del] = @[j]
		if add.length > del
			for j in [@length+add.length-1...i]
				@[j] = @[j-add.length]
		# Insert new nodes.
		if add.length
			right = @_node.childNodes[i]
			for c, j in add
				# Get valid DOM node.
				if typeof c == 'object' and c?.constructor == Array then c = tagr.parse(c); n = c._node
				else if typeof c == 'string' then n = document.createTextNode(c)
				else n = c._node
				if n.parentNode then throw new Error 'Must remove element before appending elsewhere.'
				# Insert node, update Tagr.
				@_node.insertBefore n, right
				if typeof c == 'object' then c._attach(this)
				@[i+j] = c
		@length += (-del) + add.length
		return ret

	# Manipulating our own children...
	append: (args...) -> @splice(@length, 0, args...); return this
	prepend: (args...) -> @splice(0, 0, args...); return this
	remove: (i) -> @splice i, 1; return this
	insert: (i, e) -> @splice i, 0, e; return this 
	empty: -> @splice 0, @length; return this
	# ...or letting our parents do it for us. #issues
	appendSelf: (e) -> e.append(this); return this
	prependSelf: (e) -> e.prepend(this); return this
	removeSelf: -> @parent.remove @parent.indexOf(this); return this
	insertSelf: (parent, i) -> parent.insert i, this; return this
	index: -> @parent.indexOf this

	# Children query.
	select: (match) -> new TagrQuery this, match
	# Shorthand for select('selector').find()
	find: (match) -> @select(match).find()

	# Attributes.
	setAttr: (name, v) ->
		if name == 'class' then @classes = (v.match(/\S+/g) or [])
		@_node[tagr.ATTR_PROPS[name] ? name] = @attrs[name] = v;
		return this
	setAttrs: (map) ->
		for k, v of map then @setAttr k, v
		return this

	# Classes.
	setClass: (name, toggle = yes) ->
		if toggle
			@classes = @classes.concat([name]) unless name in @classes
			@setAttr 'class', @classes.join ' '
		else
			@classes = (c for c in @classes when c != name)
			@setAttr 'class', @classes.join ' '
		return this
	setClasses: (map) ->
		for k, v of map then @setClass k, v
		return this

	# Style.
	setStyle: (k, v) ->
		throw new Exception('setStyle must be called with a value. Call using an empty string.') unless v?
		# Properties can cascade if an array is supplied for 'value'.
		for val in (if typeof v == 'object' then v else [v])
			@style[k] = @_node.style[k] = val
		return this
	setStyles: (map) ->
		for k, v of map then @setStyle k, v
		return this

	# Events.
	addListener: (type, f) ->
		@_node.addEventListener? type, ((e) => @emit type, e), false
		@_node.attachEvent? 'on'+type (=> @emit type, window.event)
		return super type, f

	# JSON.
	toJSON: -> [@tag, @attrs, ((if typeof x == 'string' then x else x.toJSON()) for x in @)...]

	# Utility methods.
		
	# Significant whitespace is awesome.
	useWhitespace: (toggle = yes) ->
		if toggle
			@setStyles {
				'white-space': [
					'pre'						# IE6-8
					'pre-wrap'					# CSS3
					'-moz-pre-wrap'				# Mozilla
					'-pre-wrap'					# Opera 4-6
					'-o-pre-wrap'				# Opera 7+
				]
				'word-wrap': 'break-word'       # IE 5.5+
			}
		else
			@setStyles {
				'white-space': ''
				'word-wrap': ''
			}

	# Prevent inadvertent selections.
	setSelectable: (toggle = yes) ->
		val = if toggle then '' else 'none'
		@setStyles {
			'-webkit-touch-callout': val
			'-webkit-user-select': val
			'-khtml-user-select': val
			'-moz-user-select': val
			'-ms-user-select': val
			'user-select': val
		}

# Transplant array functions onto Tagr objects.
for n in ['forEach', 'slice', 'map', 'indexOf']
	do (n) ->
		Tagr::[n] = (args...) -> Array::[n].apply this, args

# A dynamic query matching a CSS selector. Listeners and styles can be
# set to the dynamic list, or we can .find() the current list of
# matches.

tagr.TagrQuery = class TagrQuery extends EventEmitter

	# Stylesheet cache.
	sCache = {}
	getStylesheet = (media = 'all') ->
		return sCache[media] if sCache[media]?
		s = new Stylesheet(media)
		return sCache[media] = (s.sheet or s.styleSheet)

	constructor: (@ctx, @match) ->

	find: -> new Tagr(el) for el in Sizzle(match, @ctx._node)

	addListener: (type, f) ->
		@ctx._node.addEventListener type, ((e) =>
			matches = Sizzle("#{@match}", @ctx._node)
			n = e.target
			while n != @ctx._node and n
				if n in matches
					f.call tagr.getWrapper(n), e
				n = n.parentNode
		), false
		return super type, f

	setStyle: (k, v) ->
		throw new Exception('setStyle must be called with a value.') unless v
		selector = "[data-tagr='#{@ctx._ensureAttrUuid()}'] #{@match}"
		s = getStylesheet()
		s.insertRule "#{selector} { #{k}: #{v} }", s.cssRules.length
		return this
	setStyles: (map) ->
		for k, v of map then @setStyle k, v
		return this

# Apply methods to a list of Tagr objects.

tagr.TagrList = class TagrList
	constructor: (args...) ->
		@length = args.length
		for i in args
			@[i] = args[i]

	setAttr: (args...) -> for t in @ then t.setAttr args...
	setAttrs: (args...) -> for t in @ then t.setAttrs args...
	setStyle: (args...) -> for t in @ then t.setStyle args...
	setStyles: (args...) -> for t in @ then t.setStyles args...

tagr.list = (args...) -> new TagrList(args...)

# Dynamic styles based on the current browser view.

tagr.view =
	# Bounding box for element.
	getBox: (t) -> t._node.getBoundingClientRect()

	# Get computed CSS property.
	# http://web.archive.org/web/20091208072543/http://erik.eae.net/archives/2007/07/27/18.54.15/
	getStyle: (t, name) -> 
		if window.getComputedStyle
			computedStyle = t._node.ownerDocument.defaultView.getComputedStyle(t._node, null)
			val = computedStyle?.getPropertyValue(name)
			return (if name == "opacity" and val == "" then "1" else val)
		else if t._node.currentStyle
			val = t._node.currentStyle[name] ? t._node.currentStyle[toCamelCase name]
			if not /^\d+(?:px)?$/i.test(ret) and /^\d/.test(ret)
				[left, rsLeft] = [t._node.style.left, t._node.runtimeStyle.left]
				t._node.runtimeStyle.left = t._node.currentStyle.left
				t._node.style.left = (if name == "font-size" then "1em" else (val or 0))
				val = t._node.style.pixelLeft + "px"
				[t._node.style.left, t._node.runtimeStyle.left] = [left, rsLeft]
			return val

# Offsets

Tagr::getSize = (i) ->
	if typeof @[i] == 'string' then @[i].length
	else
		o = 2
		for j in [0...@[i].length] then o += @[i].getSize j
		return o

Tagr::getOffset = ->
	p = @parent; i = @index()
	o = 0
	loop
		while i >= 0
			o += p.getSize(i)
			i--
		unless p.parent? then break
		i = p.index(); p = p.parent
	return o