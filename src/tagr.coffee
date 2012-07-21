###*
* @license Tagr, HTML manipulation for webapps. MIT Licensed.
###

###

DOM TODO:
	compareDocumentPosition
	offsets, custom JSON serialization
	data attributes, custom data, custom attributes
	browser testing. ie6 leak prevention
	normalize events
	verify 'input' value always works

USAGE TODO:
	create usable widget patterns
	integrate with Backbone, or replicate model at least
	comment errything
	server/browser integration
	contenteditable
	server-side version
	writeContext should obviously take children (cool)

CONTEXTS:
	should context objects be a subclass?
	context-interchangeable positions-can mix contexts?
	tagr.view is properties of context?

###

# Supporting Libraries
# ====================

# Functions
# ---------

# Function wrappers to allow keys and values to be mapped and invoked by objects.

mappable = (fn) -> (k, v) ->
	if typeof k == 'object'
		for mk, mv of k then fn.call this, mk, mv
		return this
	return fn.call this, k, v

keyListable = (fn) -> (k, v) ->
	if typeof k == 'object' and k?.length?
		for mk in k then fn.call this, mk, v
		return this
	return fn.call this, k, v

valueListable = (fn) -> (k, v) ->
	if typeof v == 'object' and v?.length?
		for mv in v then fn.call this, k, mv
		return this
	return fn.call this, k, v

# String extensions.

fromCamelCase = (name) -> name.replace(/([A-Z])/g, "-$1").toLowerCase()
toCamelCase = (name) -> name.toLowerCase().replace(/\-[a-z]/g, ((s) -> s[1].toUpperCase()))

# Generic object splicing.

spliceObject = (obj, i, del, add...) ->
	if i < 0 or isNaN(i) then throw 'Invalid index'
	# Remove nodes.
	if del
		ret = []
		for j in [0...del]
			ret.push obj[i+j]
			delete obj[i+j]
	# Shift nodes in array index.
	if del > add.length # Move down.
		for j in [i + del...obj.length] by 1
			obj[j-del] = obj[j]
	else if add.length > del # Move up.
		for j in [obj.length+(add.length-del)-1...i] by -1
			obj[j] = obj[j-(add.length-del)]
	# Insert new nodes.
	if add.length
		for c, j in add
			obj[i+j] = c
	obj.length += (-del) + add.length
	return ret

# HTML escaping.

escapeHTML = do ->
	MAP = "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&#34;", "'": "&#39;"
	return (s) -> s.replace /[&<>'"]/g, (c) -> MAP[c]

# Classes
# -------

# Replicate Node.js EventEmitter.

class EventEmitter
	"listeners": (type) ->
		if @hasOwnProperty.call (if @_events? then @_events else @_events = {}), type then @_events[type] else @_events[type] = []
	"on": (args...) -> @["addListener"] args...
	"once": (type, f) -> @["on"] type, g = (args...) -> f.apply(this, args); @["removeListener"] type, g
	"addListener": (type, f) ->
		if (@["listeners"](type).push f) > @_maxListeners and @_maxListeners != 0
			console?.warn "Possible EventEmitter memory leak detected. #{@_events[type].length} listeners added. Use emitter.setMaxListeners() to increase limit."
		@["emit"] "newListener", type, f
		this
	"removeListener": (type, f) ->
		if (i = @["listeners"](type).indexOf f) != -1 then @["listeners"](type).splice i, 1
		this
	"removeAllListeners": (type) ->
		for k, v of (@_events or {}) when not type? or type == k then v.splice(0, v.length)
		this
	"emit": (type, args...) ->
		for f in @["listeners"](type) then f.apply this, args
		@["listeners"](type).length > 0
	_maxListeners: 10
	"setMaxListeners": (@_maxListeners) ->

# A hash which retains unique values, but also allows custom behaviors.

class ArrayHash
	constructor: (chain, handlers = {}) ->
		hash = {}
		arr = this
		arr.length = 0

		proxy = (chain, f) -> return -> f.apply chain, arguments

		@["get"] = proxy chain, (k) ->
			return if handlers?.get? then handlers.get(k) else hash['@'+k]

		@["set"] = proxy chain, mappable keyListable valueListable (k, v) ->
			unless Object::hasOwnProperty.call(hash, '@'+k)
				arr[arr.length++] = k
			handlers?.set?(k, v)
			hash['@'+k] = v
			return this

		@["remove"] = proxy chain, (k) ->
			if Object::hasOwnProperty.call(hash, '@'+k)
				# Shift values down
				for tk, i in this when tk == k
					for j in [i...arr.length - 1]
						arr[j] = arr[j+1]
					break
				arr.length--
				handlers?.remove?(k)
				delete hash['@'+k]
			return this

# Dom Tools
# ---------

# Tagr uses direct element properties on the object. Browsers need
# aMappingToCamelCaseForMostProperties.
HTML_DOM_PROPS =
	for: "htmlFor", accesskey: "accessKey", codebase: "codeBase"
	frameborder: "frameBorder", framespacing: "frameSpacing", nowrap: "noWrap"
	maxlength: "maxLength", class: "className", readonly: "readOnly"
	longdesc: "longDesc", tabindex: "tabIndex", rowspan: "rowSpan"
	colspan: "colSpan", enctype: "encType", ismap: "isMap"
	usemap: "useMap", cellpadding: "cellPadding", cellspacing: "cellSpacing"

VOID_ELEMS = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input',
	'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr']

# Obligatory.
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

# Get computed CSS properties.
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

# Support IE6, IE7 built-in selectors
# http://weblogs.asp.net/bleroy/archive/2009/08/31/queryselectorall-on-old-ie-versions-something-that-doesn-t-work.aspx
findBySelector = do ->
	browser = do ->
		if document.querySelector?
			return (root, selector) -> root.querySelectorAll(selector)
		else if document.documentElement.currentStyle?
			sheet = new Stylesheet()
			return (root, selector) ->
				tag = selector.match(SIMPLE_SELECTOR_MATCH)?[1]
				sheet.addRule(selector, 'foo:bar')
				res = (x for x in (if tag then root.all.tags(tag) else root.all) when x.currentStyle.foo == 'bar')
				sheet.removeRule(0)
				return res

	return (root, selector) ->
		if typeof Sizzle != 'undefined'
			Sizzle(selector, root)
		else
			browser(root, selector)

# Unique property. Use IE's .uniqueId, or use expando for other browsers.
getElementUniqueId = do ->
	uuid = 0
	return (elem) -> elem.uniqueId ? (elem.uniqueId = uuid++)

# Map of values to DOM nodes without leaking memory. Data should
# manually be removed when a node is no longer in use.
class DomMap
	constructor: -> @cache = {}
	set: (elem, value) -> @cache[getElementUniqueId(elem)] = value
	get: (elem) -> @cache[getElementUniqueId(elem)]
	remove: (elem) -> delete @cache[getElementUniqueId(elem)]

# Simple CSS selector regexes.
SIMPLE_SELECTOR_MATCH = /(?:^|\s+)([^.#\[\]:\s]*)(\S*)\s*$/ # [full, tag, attrs]
SIMPLE_SELECTOR_CHUNKER = /([:#.]+)([^:#.]+)/g
parseSimpleSelector = (selector) ->
	return unless (match = selector.match SIMPLE_SELECTOR_MATCH)
	ret = {tag: match[1] or 'div', classes: [], id: null}
	for attr in (match[2].match(SIMPLE_SELECTOR_CHUNKER) or [])
		switch attr[0] 
			when '#' then ret.id = attr.substr 1
			when '.' then ret.classes.push attr.substr 1
	return ret

# HTML Generics
# =============

# HTML Object generics. Mimicks the handy APIs of Audio, Image, Video, etc. elements.

@['Stylesheet'] = Stylesheet = (media = 'all') ->
	s = document.createElement 'style'
	s.type = 'text/css'
	s.media = media
	document.getElementsByTagName('head')[0].appendChild s
	return (s.sheet or s.styleSheet)

@['Script'] = Script = ->
	s = document.createElement 'script'
	s.src = 'about:blank'
	return document.getElementsByTagName('head')[0].appendChild s

# Tagr API
# ========

# Default namespace. tagr() is a function to create new TagrElements.
@['tagr'] = tagr = exports.tagr = (simple, attrs = {}) ->
	sel = parseSimpleSelector simple or ''
	e = document.createElement sel.tag
	if sel.classes.length then e.className = sel.classes.join ' '
	if sel.id then e.id = sel.id
	return new TagrElement(e).set(attrs)

# Configuration.
tagr.IGNORE_ATTRS = ['data-tagr']

tagr['parse'] = (str) ->
	return str if typeof str == 'string'
	[simple, attrs, args...] = str
	return tagr(simple, attrs).append (tagr.parse(arg) for arg in args)...

# Convience for DOM loading.
tagr['ready'] = addDomReadyListener

# DOM <-> tagr object mapping.
tagr._map = new DomMap()

# Get a wrapper for a node. Initialize the wrapper, or throw
# an error if one doesn't exist.
tagr._getWrapper = (node, initialize = no) ->
	throw new Error('Cannot create Tagr context of non-element') if node.nodeType != 1
	unless (obj = tagr._map.get(node))?
		if not initialize
			throw new Error('No Tagr wrapper exists for this element.')
		tagr._map.set node, (obj = new TagrElement(node))
	return obj

# tagr.getContext creates an element context.
# Only Tagr methods should be used on the children of this context.
tagr['getContext'] = (node) -> tagr._getWrapper(node, yes)
# document.write a new context, avoiding tagr.ready()
tagr['writeContext'] = (tag = 'div', props = {}) ->
	document.write("<#{tag}></#{tag}>")
	list = document.getElementsByTagName(tag)
	return tagr["getContext"](list[list.length-1])["set"](props)

# TagrElement wrapper objects map 1:1 with the DOM.
	
tagr['TagrElement'] = class TagrElement extends EventEmitter

	constructor: (@_node, @parent) ->
		# Tags.
		@["tag"] = @_node.nodeName.toLowerCase()

		# Properties.
		@["props"] = new ArrayHash this,
			set: (k, v) =>
				@["emit"] 'change:' + k, v
				@_node[HTML_DOM_PROPS[k] ? k] = v
			get: (k) => @_node[HTML_DOM_PROPS[k] ? k]
			remove: (k) => @_node.removeAttribute(k)
		for attr in @_node.attributes
			@["props"].set attr.name, attr.value

		# Classes.
		@["classes"] = new ArrayHash this,
			set: (k, v = yes) => @_node.className = "#{(c for c in @["classes"] when c != k).join ''} #{if v then k else ''} #{@_uuidClass}"
			get: (k) => !!@_node.className.match(new RegExp("\\b#{k}\\b"))
			remove: (k) => @_node.className = (c for c in @["classes"] when c != k).join('')
		for name in (@_node.className.match(/\S+/g) or [])
			@["classes"].set(name)

		# Styles.
		@["style"] = new ArrayHash this,
			set: (k, v) =>
				# IE throws errors on invalid values, and hates whitespace.
				try
					@_node.style[toCamelCase k] = v.replace(/^\s*([\S\s]*?)\s*$/, '$1');
				catch e
			get: (k) => @_node.style[toCamelCase k]
			remove: (k) => delete @_node.style[toCamelCase k]

		# Children.
		@length = @_node.childNodes.length
		for c, i in @_node.childNodes
			@[i] = (if c.nodeType == 1 then new TagrElement(c, @) else c._nodeValue)

	# Associate TagrElement object with its DOM node.
	# We only need this association for querying, and thus, only when
	# elements are attached to the document.
	_attach: (@parent) -> tagr._map.set @_node, this
	_detach: -> delete @parent; tagr._map.remove @_node

	# Create a data attribute with the element UUID. This is used only
	# for styling.
	_uuidClass: ''
	_ensureUuidClass: ->
		if not @_uuidClass
			@_node.className += ' ' + (@_uuidClass = 'tagr-' + getElementUniqueId(@_node))
		return @_uuidClass

	# Property shorthand.
	"get": (k) -> @["props"].get(k)
	"set": (k, v) -> @["props"].set(k, v)
	"remove": (k) -> @["props"].remove(k)

	# Events.
	"addListener": (type, f) ->
		if @_node.addEventListener
			@_node.addEventListener type, ((e) => @["emit"] type, e), false
		else if @_node.attachEvent
			@_node.attachEvent 'on'+type, (=> @["emit"] type, window.event)
		return super type, f

	# Child manipulation.
	"splice": (i, del, add...) ->
		# Remove nodes
		for j in [0...del]
			@_node.removeChild @_node.childNodes[i]
			if typeof @[i+j] == 'object' then @[i+j]._detach()

		# Insert nodes.
		right = @_node.childNodes[i] or null
		for obj, j in add
			# Parse arguments.
			if typeof obj == 'object'
				if obj.constructor == Array then obj = add[j] = tagr["parse"](obj)
				n = obj._node
			else n = document.createTextNode(obj)
			# Insert node.
			# IE attaches document parentNode for detached elements: http://www.grauw.nl/blog/entry/486
			if n.parentNode and n.parentNode.nodeType == 1
				throw new Error 'Must remove element before appending elsewhere.'
			@_node.insertBefore n, right
			if typeof obj == 'object' then obj._attach(this)

		return spliceObject this, i, del, add...
	"append": (args...) -> @["splice"](@length, 0, args...); return this
	"prepend": (args...) -> @["splice"](0, 0, args...); return this
	"remove": (i) -> @["splice"] i, 1; return this
	"insert": (i, args...) -> @["splice"] i, 0, args...; return this 
	"empty": -> @["splice"] 0, @length; return this
	"indexOf": (t) ->
		for c, i in this when c == t then return i
		return -1
	# Self-manipulation.
	"appendSelf": (e) -> e["append"](this); return this
	"prependSelf": (e) -> e["prepend"](this); return this
	"removeSelf": -> @["parent"]["remove"] @["index"](); return this
	"insertSelf": (parent, i) -> parent["insert"] i, this; return this
	"index": -> @["parent"].indexOf this
	# Text manipulation.
	"spliceText": (c, i, del, add = '') ->
		unless typeof @[c] == 'string' then throw new Error 'Cannot splice non-text node.'
		@_node.childNodes[c].replaceData(i, del, add)
		@[c] = @_node.childNodes[c].data
		return this
	"splitText": (c, i) ->
		unless typeof @[c] == 'string' then throw new Error 'Cannot split non-text node.'
		@_node.childNodes[c].splitText i
		return spliceObject this, c, 1, @[c].substr(0, i), @[c].substr(i)

	# Children query.
	"select": (match) -> new tagr["TagrQuery"] this, match
	# Shorthand for select('selector').find()
	"find": (match) -> @["select"](match)["find"]()

	# JSON.
	"toJSON": -> [@tag, @attrs, ((if typeof x == 'string' then x else x.toJSON()) for x in @)...]

	"toHTML": ->
		str = ["<#{@tag}"]
		for k in @props
			str.push " #{escapeHTML k}=\"#{escapeHTML String @props.get(k)}\""
		str.push '>', ((if typeof x == 'string' then x else x.toHTML()) for x in @)..., "</#{@tag}>"
		return str.join ''

# Transplant array functions onto TagrElement objects.
for n in ['forEach', 'slice', 'map']
	do (n) ->
		TagrElement::[n] = (args...) -> Array::[n].apply this, args

# A dynamic query matching a CSS selector. Listeners and styles can be
# set to the dynamic list, or we can .find() the current list of
# matches.

tagr['TagrQuery'] = do ->
	# Stylesheet cache.
	sCache = {}
	getStylesheet = (media = 'all') ->
		return sCache[media] if sCache[media]?
		return sCache[media] = new Stylesheet(media)

	return class TagrQuery extends EventEmitter
		constructor: (@ctx, @selector) ->
			@style = new ArrayHash this,
				set: mappable keyListable valueListable (k, v) => 
					s = getStylesheet()
					if s.insertRule?
						s.insertRule ".#{@ctx._ensureUuidClass()} #{@selector} { #{k}: #{v} }", s.cssRules.length
					else
						s.addRule ".#{@ctx._ensureUuidClass()} #{@selector}", "#{k}: #{v}"
					return this

		"addListener": (type, f) ->
			@ctx.on type, ((e) =>
				matches = findBySelector(@ctx._node, @selector)
				n = e.target or e.srcElement
				while n != @ctx._node and n
					if n in matches
						f.call tagr._getWrapper(n), e
					n = n.parentNode
			), false
			return super type, f

		"find": -> (tagr._getWrapper(el) for el in findBySelector(@ctx._node, @selector))

# Anchors
# =======

tagr.ElementAnchor = class ElementAnchor
	constructor: (@par, @i) ->
	toAnchor: -> [@par._node, @i]

tagr.TextAnchor = class TextAnchor
	constructor: (@par, @child, @i) ->
	toAnchor: -> [@par._node.childNodes[@child], @i]

convertAnchor = ([node, offset]) ->
	if node.nodeType == 1
		return unless (t = tagr._getWrapper(node))
		return new ElementAnchor(t, offset)
	else
		return unless (t = tagr._getWrapper(node.parentNode))
		i = 0; n = node
		while n.previousSibling then n = n.previousSibling; i++
		return new TextAnchor(el, i, offset)

# View
# ====

# Dynamic styles based on the current browser view.

tagr['view'] =
	# Bounding box for element.
	"getBox": (t, ctx) ->
		box = t._node.getBoundingClientRect()
		if ctx?
			for k, v of ctx._node.getBoundingClientRect()
				box[k] -= v
		return box

	# Get computed CSS property.
	"getStyle": (t, name) -> getComputedStyle(t._node, name)

	# Cursor selections.
	"selection":
		"has": -> Selection.hasSelection(window)
		"getOrigin": -> convertAnchor Selection.getOrigin(window)
		"getFocus": -> convertAnchor Selection.getFocus(window)
		"getStart": -> convertAnchor Selection.getStart(window)
		"getEnd": -> convertAnchor Selection.getEnd(window)
		"set": (origin, focus) -> Selection.setSelection(window, origin.toAnchor()..., focus.toAnchor()...)
		"remove": -> Selection.clearSelection(window)

# Utility
# =======
	
# Significant whitespace is awesome.
TagrElement::['useWhitespace'] = (toggle = yes) ->
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
		@style.set ['white-space', 'word-wrap'], ''

# Prevent inadvertent selections.
TagrElement::['setSelectable'] = (toggle = yes) ->
	@style.set [
		'-webkit-touch-callout'
		'-webkit-user-select'
		'-khtml-user-select'
		'-moz-user-select'
		'-ms-user-select'
		'user-select'
	], if toggle then '' else 'none'