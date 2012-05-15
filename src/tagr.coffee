###*
* @license Tagr, HTML manipulation for webapps. MIT Licensed.
###

###



DOM TODO:
	Selections
	compareDocumentPosition
	offsets, custom JSON serialization
	data attributes, custom data, custom attributes
	pull out attribute caching
	browser testing. ie6 leak prevention
	normalize events
	verify 'input' value always works
	create "div#apple.selected.something"
	class attribute as array
	context-interchangeable positions-can mix contexts?

USAGE TODO:
	create usable widget patterns
	integrate with Backbone, or replicate model at least
	documentation
	comment errything
	server/browser integration
	should context objects be a subclass?
	tagr.view is properties of context?
	contenteditable
	optional sizzle? optional selection.js?
	server-side version
	writeContext should obviously take children (cool)
	browser storage? (recommended solution)
	cdn?

###

# Support
# -------

fromCamelCase = -> name.replace(/([A-Z])/g, "-$1").toLowerCase()
toCamelCase = -> name.toLowerCase().replace(/\-[a-z]/g, ((s) -> s[1].toUpperCase()))

# Tagr uses direct element properties on the object. Browsers need
# aMappingToCamelCaseForMostProperties.
HTML_DOM_PROPS =
	for: "htmlFor", accesskey: "accessKey", codebase: "codeBase"
	frameborder: "frameBorder", framespacing: "frameSpacing", nowrap: "noWrap"
	maxlength: "maxLength", class: "className", readonly: "readOnly"
	longdesc: "longDesc", tabindex: "tabIndex", rowspan: "rowSpan"
	colspan: "colSpan", enctype: "encType", ismap: "isMap"
	usemap: "useMap", cellpadding: "cellPadding", cellspacing: "cellSpacing"

# EventEmitter
# ============

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

# Generics
# ========

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

# Dom Tools
# =========

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

# http://web.archive.org/web/20091208072543/http://erik.eae.net/archives/2007/07/27/18.54.15/
getComputedStyle = (n, name) ->
	if window.getComputedStyle
		computedStyle = n.ownerDocument.defaultView.getComputedStyle(n, null)
		val = computedStyle?.getPropertyValue(name)
		return (if name == "opacity" and val == "" then "1" else val)
	else if n.currentStyle
		val = n.currentStyle[name] ? n.currentStyle[toCamelCase name]
		if not /^\d+(?:px)?$/i.test(ret) and /^\d/.test(ret)
			[left, rsLeft] = [n.style.left, n.runtimeStyle.left]
			n.runtimeStyle.left = n.currentStyle.left
			n.style.left = (if name == "font-size" then "1em" else (val or 0))
			val = n.style.pixelLeft + "px"
			[n.style.left, n.runtimeStyle.left] = [left, rsLeft]
		return val

# Support IE7
# http://weblogs.asp.net/bleroy/archive/2009/08/31/queryselectorall-on-old-ie-versions-something-that-doesn-t-work.aspx
findSelector = do ->
	if not document.documentElement.querySelector? and document.documentElement.currentStyle?
		sheet = new Stylesheet()
		return (root, selector) ->
			tag = selector.match(/(?:^|\s+)([^.#:\s]+)(?:[.#:]+[^:.#()\s]+)*\s*$/)?[1]
			sheet.addRule(selector, 'foo:bar')
			res = (x for x in (if tag? then root.tags(tag) else root.all) when x.currentStyle.foo == 'bar')
			sheet.removeRule(0)
			return res
	else
		return (root, selector) -> root.querySelectorAll(selector)

# ArrayHash
# =========

class ArrayHash
	constructor: (@chain, @handlers = {}) ->
		@hash = {}
		@length = 0

	get: (k) ->
		return if @handlers?.get? then @handlers.get(k) else @hash['@'+k]

	set: (k, v) ->
		if typeof k == 'object'
			@set(ak, av) for ak, av of k
			return @chain
		if typeof v == 'object' and v.length?
			@set(k, av) for av in v
			return @chain
		unless Object::hasOwnProperty.call(@hash, '@'+k)
			@[@length++] = k
		@handlers?.set?(k, v)
		@hash['@'+k] = v
		return @chain

	remove: (k) ->
		return @chain unless Object::hasOwnProperty.call(@hash, '@'+k)
		# Shift values down
		for tk, i in this when tk == k
			for j in [i...@length - 1]
				@[j] = @[j+1]
			break
		@length--
		@handlers?.remove?(k)
		delete @hash['@'+k]
		return @chain

# DOM Map
# =======

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
tagr.writeContext = (tag = 'div', props = {}) ->
	document.write("<#{tag}></#{tag}>")
	list = document.getElementsByTagName(tag)
	obj = tagr.getContext(list[list.length-1]).set(props)
	console.log obj
	return obj

# Tagr wrapper objects map 1:1 with the DOM.
	
tagr.Tagr = class Tagr extends EventEmitter

	constructor: (@_node, @parent) ->
		# Tags.
		@tag = @_node.nodeName.toLowerCase()

		# Classes.
		@classes = new ArrayHash this,
			set: (k, v) => @_node.className = "#{(c for c in (@_node.className.match(/\S+/g) ? []) when c != k).join ''} #{k}"
			get: (k) => !!@_node.className.match(new RegExp("\\b#{k}\\b"))
			remove: (k) => @_node.className = (c for c in (@_node.className.match(/\S+/g) ? []) when c != k).join ''
		for name in (@_node.className.match(/\S+/g) or [])
			console.log name
			@classes.set(name)

		# Styles.
		@style = new ArrayHash this,
			set: (k, v) => @_node.style[k] = v
			get: (k) => @_node.style[k]
			remove: (k) => delete @_node.style[k]

		# Children.
		@length = @_node.childNodes.length
		for c, i in @_node.childNodes
			@[i] = (if c.nodeType == 1 then new Tagr(c, @) else c._nodeValue)

	# Associate DOM node with Tagr object, for querying. We only need
	# this association when elements are attached to the document.
	_attach: (@parent) -> tagr._map.set @_node, 'tagr', this
	_detach: -> delete @parent; tagr._map.remove @_node, 'tagr'

	# Create a data attribute with the element UUID. This is used only
	# for styling.
	_ensureAttrUuid: ->
		if not @_node.hasAttribute('data-tagr')
			@_node.setAttribute 'data-tagr', getElementUUID(@_node)
		@_node.getAttribute('data-tagr')

	# Properties.
	get: (k) ->
		return @_node[HTML_DOM_PROPS[k] ? k]
	set: (k, v) ->
		if typeof k == 'object'
			@set(ak, av) for ak, av of k
			return this
		@emit 'change:' + k, v
		@_node[HTML_DOM_PROPS[k] ? k] = v
	remove: (k) ->
		@_node.removeAttribute(k)

	# Events.
	addListener: (type, f) ->
		@_node.addEventListener? type, ((e) => @emit type, e), false
		@_node.attachEvent? 'on'+type (=> @emit type, window.event)
		return super type, f

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
		else if add.length > del
			for j in [@length+add.length-1...i]
				@[j] = @[j-add.length]
		# Insert new nodes.
		if add.length
			right = @_node.childNodes[i]
			for c, j in add
				# Get DOM node.
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

	# Let the children manipulate themselves...
	append: (args...) -> @splice(@length, 0, args...); return this
	prepend: (args...) -> @splice(0, 0, args...); return this
	remove: (i) -> @splice i, 1; return this
	insert: (i, e) -> @splice i, 0, e; return this 
	empty: -> @splice 0, @length; return this
	# ...or letting their parents do it for them.
	appendSelf: (e) -> e.append(this); return this
	prependSelf: (e) -> e.prepend(this); return this
	removeSelf: -> @parent.remove @parent.indexOf(this); return this
	insertSelf: (parent, i) -> parent.insert i, this; return this
	index: -> @parent.indexOf this

	# Children query.
	select: (match) -> new TagrQuery this, match
	# Shorthand for select('selector').find()
	find: (match) -> @select(match).find()

	# JSON.
	toJSON: -> [@tag, @attrs, ((if typeof x == 'string' then x else x.toJSON()) for x in @)...]

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

	constructor: (@ctx, @selector) ->
		@style = new ArrayHash this,
			set: (k, v) => 
				fullSelector = "[data-tagr='#{@ctx._ensureAttrUuid()}'] #{@selector}"
				s = getStylesheet()
				s.insertRule "#{fullSelector} { #{k}: #{v} }", s.cssRules.length
				return

	addListener: (type, f) ->
		@ctx._node.addEventListener type, ((e) =>
			matches = findSelector(@ctx._node, @selector)
			n = e.target
			while n != @ctx._node and n
				if n in matches
					f.call tagr.getWrapper(n), e
				n = n.parentNode
		), false
		return super type, f

	find: -> new Tagr(el) for el in findSelector(@ctx._node, @selector)

# Apply methods to a list of Tagr objects.

tagr.TagrList = class TagrList
	constructor: (args...) ->
		@length = args.length
		for i in args
			@[i] = args[i]

		@attrs = new ArrayHash this,
			set: (k, v) => for t in @ then t.set(k, v)
		@styles = new ArrayHash this,
			set: (k) => for t in @ then t.style.set(k)
			remove: (k) => for t in @ then t.style.remove(k)

tagr.list = (args...) -> new TagrList(args...)

# View
# ====

# Dynamic styles based on the current browser view.

tagr.view =
	# Bounding box for element.
	getBox: (t, ctx) ->
		box = t._node.getBoundingClientRect()
		if ctx?
			for k, v of ctx._node.getBoundingClientRect()
				box[k] -= v
		return box

	# Get computed CSS property.
	getStyle: (t, name) -> getComputedStyle(t._node, name)

# Selection
# =========

Tagr::getSelection = ->

# Offsets
# =======

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

# Utility
# =======
	
# Significant whitespace is awesome.
Tagr::useWhitespace = (toggle = yes) ->
	if toggle
		@style.set {
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
		@style.set {
			'white-space': ''
			'word-wrap': ''
		}

# Prevent inadvertent selections.
Tagr::setSelectable = (toggle = yes) ->
	val = if toggle then '' else 'none'
	@style.set {
		'-webkit-touch-callout': val
		'-webkit-user-select': val
		'-khtml-user-select': val
		'-moz-user-select': val
		'-ms-user-select': val
		'user-select': val
	}