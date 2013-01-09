(function (name, definition, context) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof context['define'] == 'function' && context['define']['amd']) define(name, definition)
  else context[name] = definition()
})('queryr', function () {
  var doc = this.document || {}
    , html = doc.documentElement
    , byClass = 'getElementsByClassName'
    , byTag = 'getElementsByTagName'
    , qSA = 'querySelectorAll'
    , useNativeQSA = 'useNativeQSA'
    , tagName = 'tagName'
    , nodeType = 'nodeType'
    , select // main select() method, assign later

    , id = /#([\w\-]+)/
    , clas = /\.[\w\-]+/g
    , idOnly = /^#([\w\-]+)$/
    , classOnly = /^\.([\w\-]+)$/
    , tagOnly = /^([\w\-]+)$/
    , tagAndOrClass = /^([\w]+)?\.([\w\-]+)$/
    , splittable = /(^|,)\s*[>~+]/
    , normalizr = /^\s+|\s*([,\s\+\~>]|$)\s*/g
    , splitters = /[\s\>\+\~]/
    , splittersMore = /(?![\s\w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^'"]*\]|[\s\w\+\-]*\))/
    , specialChars = /([.*+?\^=!:${}()|\[\]\/\\])/g
    , simple = /^(\*|[a-z0-9]+)?(?:([\.\#]+[\w\-\.#]+)?)/
    , attr = /\[([\w\-]+)(?:([\|\^\$\*\~]?\=)['"]?([ \w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^]+)["']?)?\]/
    , pseudo = /:([\w\-]+)(\(['"]?([^()]+)['"]?\))?/
    , easy = new RegExp(idOnly.source + '|' + tagOnly.source + '|' + classOnly.source)
    , dividers = new RegExp('(' + splitters.source + ')' + splittersMore.source, 'g')
    , tokenizr = new RegExp(splitters.source + splittersMore.source)
    , chunker = new RegExp(simple.source + '(' + attr.source + ')?' + '(' + pseudo.source + ')?')
    , walker = {
        ' ': function (node) {
          return node && node !== html && node.parentNode
        }
      , '>': function (node, contestant) {
          return node && node.parentNode == contestant.parentNode && node.parentNode
        }
      , '~': function (node) {
          return node && node.previousSibling
        }
      , '+': function (node, contestant, p1, p2) {
          if (!node) return false
          return (p1 = previous(node)) && (p2 = previous(contestant)) && p1 == p2 && p1
        }
      }

  function cache() {
    this.c = {}
  }
  cache.prototype = {
    g: function (k) {
      return this.c[k] || undefined
    }
  , s: function (k, v, r) {
      v = r ? new RegExp(v) : v
      return (this.c[k] = v)
    }
  }

  var classCache = new cache()
    , cleanCache = new cache()
    , attrCache = new cache()
    , tokenCache = new cache()

  function wrap(e) {
    return tagr.getContext(e);
  }

  function classRegex(c) {
    return classCache.g(c) || classCache.s(c, '(^|\\s+)' + c + '(\\s+|$)', 1)
  }

  // not quite as fast as inline loops in older browsers so don't use liberally
  function each(a, fn) {
    var i = 0, l = a.length
    for (; i < l; i++) fn(a[i])
  }

  function flatten(ar) {
    for (var r = [], i = 0, l = ar.length; i < l; ++i) arrayLike(ar[i]) ? (r = r.concat(ar[i])) : (r[r.length] = ar[i])
    return r
  }

  function arrayify(ar) {
    var i = 0, l = ar.length, r = []
    for (; i < l; i++) r[i] = wrap(ar[i])
    return r
  }

  function previous(n) {
    while (n = n.previousSibling) if (n[nodeType] == 1) break;
    return n
  }

  function q(query) {
    return query.match(chunker)
  }

  // called using `this` as element and arguments from regex group results.
  // given => div.hello[title="world"]:foo('bar')
  // div.hello[title="world"]:foo('bar'), div, .hello, [title="world"], title, =, world, :foo('bar'), foo, ('bar'), bar]
  function interpret(whole, tag, idsAndClasses, wholeAttribute, attribute, qualifier, value, wholePseudo, pseudo, wholePseudoVal, pseudoVal) {
    var i, m, k, o, classes
    if (this[nodeType] !== 1) return false
    if (tag && tag !== '*' && this[tagName] && this[tagName].toLowerCase() !== tag) return false
    if (idsAndClasses && (m = idsAndClasses.match(id)) && m[1] !== this.id) return false
    if (idsAndClasses && (classes = idsAndClasses.match(clas))) {
      for (i = classes.length; i--;) if (!classRegex(classes[i].slice(1)).test(this.className)) return false
    }
    if (pseudo && qwery.pseudos[pseudo] && !qwery.pseudos[pseudo](this, pseudoVal)) return false
    if (wholeAttribute && !value) { // select is just for existance of attrib
      o = this.properties()
      for (k in o) {
        if (Object.prototype.hasOwnProperty.call(o, k) && (k) == attribute) {
          return this
        }
      }
    }
    if (wholeAttribute && !checkAttr(qualifier, this.get(attribute) || '', value)) {
      // select is for attrib equality
      return false
    }
    return this
  }

  function clean(s) {
    return cleanCache.g(s) || cleanCache.s(s, s.replace(specialChars, '\\$1'))
  }

  function checkAttr(qualify, actual, val) {
    switch (qualify) {
    case '=':
      return actual == val
    case '^=':
      return actual.match(attrCache.g('^=' + val) || attrCache.s('^=' + val, '^' + clean(val), 1))
    case '$=':
      return actual.match(attrCache.g('$=' + val) || attrCache.s('$=' + val, clean(val) + '$', 1))
    case '*=':
      return actual.match(attrCache.g(val) || attrCache.s(val, clean(val), 1))
    case '~=':
      return actual.match(attrCache.g('~=' + val) || attrCache.s('~=' + val, '(?:^|\\s+)' + clean(val) + '(?:\\s+|$)', 1))
    case '|=':
      return actual.match(attrCache.g('|=' + val) || attrCache.s('|=' + val, '^' + clean(val) + '(-|$)', 1))
    }
    return 0
  }

  // given a selector, first check for simple cases then collect all base candidate matches and filter
  function _qwery(selector, _root) {
    var r = [], ret = [], i, l, m, token, tag, els, intr, item, root = _root
      , tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr))
      , dividedTokens = selector.match(dividers)

    if (!tokens.length) return r

    token = (tokens = tokens.slice(0)).pop() // copy cached tokens, take the last one
    if (tokens.length && (m = tokens[tokens.length - 1].match(idOnly))) root = byId(_root, m[1])
    if (!root) return r

    intr = q(token)
    // collect base candidates to filter
    els = root !== _root && root[nodeType] !== 9 && dividedTokens && /^[+~]$/.test(dividedTokens[dividedTokens.length - 1]) ?
      function (r) {
        while (root = root.nextSibling) {
          root[nodeType] == 1 && (intr[1] ? intr[1] == root[tagName].toLowerCase() : 1) && (r[r.length] = root)
        }
        return r
      }([]) :
      root[byTag](intr[1] || '*')
    // filter elements according to the right-most part of the selector
    for (i = 0, l = els.length; i < l; i++) {
      if (item = interpret.apply(els[i], intr)) r[r.length] = item
    }
    if (!tokens.length) return r

    // filter further according to the rest of the selector (the left side)
    each(r, function(e) { if (ancestorMatch(e, tokens, dividedTokens)) ret[ret.length] = e })
    return ret
  }

  // compare element to a selector
  function is(el, selector, root) {
    if (isNode(selector)) return el == selector
    if (arrayLike(selector)) return !!~flatten(selector).indexOf(el) // if selector is an array, is el a member?

    var selectors = selector.split(','), tokens, dividedTokens
    while (selector = selectors.pop()) {
      tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr))
      dividedTokens = selector.match(dividers)
      tokens = tokens.slice(0) // copy array
      if (interpret.apply(el, q(tokens.pop())) && (!tokens.length || ancestorMatch(el, tokens, dividedTokens, root))) {
        return true
      }
    }
    return false
  }

  // given elements matching the right-most part of a selector, filter out any that don't match the rest
  function ancestorMatch(el, tokens, dividedTokens, root) {
    var cand
    // recursively work backwards through the tokens and up the dom, covering all options
    function crawl(e, i, p) {
      while (p = walker[dividedTokens[i]](p, e)) {
        if (isNode(p) && (interpret.apply(p, q(tokens[i])))) {
          if (i) {
            if (cand = crawl(p, i - 1, p)) return cand
          } else return p
        }
      }
    }
    return (cand = crawl(el, tokens.length - 1, el)) && (!root || isAncestor(cand, root))
  }

  function isNode(el, t) {
    return el && typeof el === 'object' && (t = el[nodeType]) && (t == 1 || t == 9)
  }

  function uniq(ar) {
    var a = [], i, j
    o: for (i = 0; i < ar.length; ++i) {
      for (j = 0; j < a.length; ++j) if (a[j] == ar[i]) continue o
      a[a.length] = ar[i]
    }
    return a
  }

  function arrayLike(o) {
    return (typeof o === 'object' && isFinite(o.length))
  }

  function normalizeRoot(root) {
    //if (!root) return doc
    //if (typeof root == 'string') return qwery(root)[0]
    //if (!root[nodeType] && arrayLike(root)) return root[0]
    return root
  }

  function byId(root, id, el) {
    // if doc, query on it, else query the parent doc or if a detached fragment rewrite the query and run on the fragment
    // TODO fix
    return (el = root._node.ownerDocument.getElementById(id)) && el && (el = wrap(el)) && (isAncestor(el, root) || el == root) && el;
    //return root._node.parent ? wrap(root._node.getElementById(id)) :
    //  root._node.ownerDocument &&
    //    wrap(((el = root._node.ownerDocument.getElementById(id))))
    //      //!isAncestor(root, root._node.ownerDocument) && select('[id="' + id + '"]', root)[0]))
  }

  function qwery(selector, _root) {
    var m, el, root = normalizeRoot(_root)

    // easy, fast cases that we can dispatch with simple DOM calls
    if (!root || !selector) return []
    if (selector === window || isNode(selector)) {
      return !_root || (selector !== window && isNode(root) && isAncestor(selector, root)) ? [selector] : []
    }
    if (selector && arrayLike(selector)) return flatten(selector)
    if (m = selector.match(easy)) {
      if (m[1]) return (el = byId(root, m[1])) ? [el] : []
      if (m[2]) return arrayify(root._node[byTag](m[2]))
      if (hasByClass && m[3]) return arrayify(root._node[byClass](m[3]))
    }

    return select(selector, root)
  }

  // where the root is not document and a relationship selector is first we have to
  // do some awkward adjustments to get it to work, even with qSA
  function collectSelector(root, collector) {
    return function(s) {
      var oid, nid
      if (splittable.test(s)) {
        if (root[nodeType] !== 9) {
         // make sure the el has an id, rewrite the query, set root to doc and run it
         if (!(nid = oid = root.get('id'))) root.set('id', nid = '__qwerymeupscotty')
         s = '[id="' + nid + '"]' + s // avoid byId and allow us to match context element
         collector(root.parent || root, s, true)
         oid || root.remove('id')
        }
        return;
      }
      s.length && collector(root, s, false)
    }
  }

  var isAncestor = function (element, container) {
    //container = !container.parent || container == window ? html : container
    return container !== element && container._node.contains(element._node)
  }
  , hasByClass = !!doc[byClass]
    // has native qSA support
  , hasQSA = doc.querySelector && doc[qSA]
    // use native qSA
  , selectQSA = function (selector, root) {
      var result = [], ss, e
      try {
        if (!root.parent || !splittable.test(selector)) {
          // most work is done right here, defer to qSA
          return arrayify(root._node[qSA](selector))
        }
        // special case where we need the services of `collectSelector()`
        each(ss = selector.split(','), collectSelector(root, function(ctx, s) {
          e = ctx._node[qSA](s)
          if (e.length == 1) result[result.length] = e.item(0)
          else if (e.length) result = result.concat(arrayify(e))
        }))
        return ss.length > 1 && result.length > 1 ? uniq(result) : result
      } catch(ex) { }
      return selectNonNative(selector, root)
    }
    // no native selector support
  , selectNonNative = function (selector, root) {
      var result = [], items, m, i, l, r, ss
      selector = selector.replace(normalizr, '$1')
      if (m = selector.match(tagAndOrClass)) {
        r = classRegex(m[2])
        items = root._node[byTag](m[1] || '*')
        for (i = 0, l = items.length; i < l; i++) {
          if (r.test(items[i].get('class'))) result[result.length] = wrap(items[i])
        }
        return result
      }
      // more complex selector, get `_qwery()` to do the work for us
      each(ss = selector.split(','), collectSelector(root, function(ctx, s, rewrite) {
        r = _qwery(s, ctx)
        for (i = 0, l = r.length; i < l; i++) {
          if (!ctx.parent || rewrite || isAncestor(r[i], root)) result[result.length] = r[i]
        }
      }))
      return ss.length > 1 && result.length > 1 ? uniq(result) : result
    }
  , configure = function (options) {
      // configNativeQSA: use fully-internal selector or native qSA where present
      if (typeof options[useNativeQSA] !== 'undefined')
        select = !options[useNativeQSA] ? selectNonNative : hasQSA ? selectQSA : selectNonNative
    }

  configure({ useNativeQSA: true })

  qwery.configure = configure
  qwery.uniq = uniq
  qwery.is = is
  qwery.pseudos = {}

  return qwery
}, this);
/**
 * @license Tagr, Solid HTML manipulation for webapps. MIT Licensed.
 */

/**
 * Tagr code
 */

var tagr = (function (Selection) {

  var isBrowser = typeof window !== 'undefined';

  /**
   * EventEmitter implementation
   * http://nodejs.org/api/events.html
   */

  if (typeof EventEmitter === 'undefined' && typeof module === 'undefined') {
    var EventEmitter = function () { };

    EventEmitter.prototype.listeners = function (type) {
      return this.hasOwnProperty.call(this._events || (this._events = {}), type) ? this._events[type] : this._events[type] = [];
    };

    EventEmitter.prototype.addListener = function (type, f) {
      if (this._maxListeners !== 0 && this.listeners(type).push(f) > (this._maxListeners || 10)) {
        console && console.warn('Possible EventEmitter memory leak detected. ' + this._events[type].length + ' listeners added. Use emitter.setMaxListeners() to increase limit.');
      }
      this.emit("newListener", type, f);
      return this;
    };

    EventEmitter.prototype.on = function (type, f) {
      return this.addListener(type, f);
    }

    EventEmitter.prototype.removeListener = function (type, f) {
      var i;
      (i = this.listeners(type).indexOf(f)) != -1 && this.listeners(type).splice(i, 1);
      return this;
    };

    EventEmitter.prototype.removeAllListeners = function (type) {
      for (var k in this._events) {
        (!type || type == k) && this._events[k].splice(0, this._events[k].length);
      }
      return this;
    };

    EventEmitter.prototype.emit = function (type) {
      var args = Array.prototype.slice.call(arguments, 1);
      for (var i = 0, fns = this.listeners(type).slice(); i < fns.length; i++) {
        fns[i].apply(this, args);
      }
      return fns.length;
    };

    EventEmitter.prototype.setMaxListeners = function (maxListeners) {
      this._maxListeners = maxListeners;
    };
    
  } else if (typeof EventEmitter == 'undefined' && typeof require != 'undefined') {
    // Node.js import.
    var EventEmitter = require('events').EventEmitter;
  }

  /**
   * Shorthands and polyfills.
   */

  function hasOwnProperty(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function slice (arg, i) {
    return Array.prototype.slice.call(arg, i);
  }

  function isArray (arg) {
    return Object.prototype.toString.call(arg) === '[object Array]';
  }

  function isBareObject (arg) {
    return Object.prototype.toString.call(arg) == '[object Object]';
  }

  function indexOf (arr, v) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] == v) {
        return i;
      }
    }
    return -1;
  }

  function trim (str) {
    return String(str).replace(/^\s+|\s+$/g, '');
  };

  function fromCamelCase (name) {
    return name.replace(/([A-Z])/g, "-$1").toLowerCase();
  };

  function toCamelCase (name) {
    return name.toLowerCase().replace(/\-[a-z]/g, (function (s) {
      return s[1].toUpperCase();
    }));
  };

  function clone (obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Utility methods.
   */

  function augment (a, b) {
    for (var k in b) {
      if (hasOwnProperty(b, k)) {
        a[k] = b[k];
      }
    }
    return a;
  }

  function inherits (Child, proto) {
    function Ctor() {
      this.constructor = Child;
    }
    Ctor.prototype = proto;
    Child.prototype = new Ctor;
    return Child;
  }

  function chainable (fn) {
    return function () {
      fn.apply(this, arguments);
      return this;
    }
  }

  function mappable (fn) {
    return function (k, v) {
      if (typeof k != 'object') {
        return fn.call(this, k, v);
      }
      for (var mk in k) {
        fn.call(this, mk, k[mk]);
      }
    };
  };
  
  function expandKeys (fn) {
    return function (k, v) {
      if (!isArray(k)) {
        return fn.call(this, k, v);
      }
      for (var i = 0; i < k.length; i++) {
        fn.call(this, k[i], v);
      }
    };
  };

  function expandValues (fn) {
    return function (k, v) {
      if (!isArray(v)) {
        return fn.call(this, k, v);
      }
      var that = this;
      for (var i = 0; i < v.length; i++) {
        fn.call(this, k, v[i]);
      }
    };
  };

  function copy (obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * HTML functionality
   */

  var escapeHTML = (function() {
    var MAP = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&#34;",
      "'": "&#39;"
    };
    return function (s) {
      return s.replace(/[&<>'"]/g, function(c) {
        return MAP[c];
      });
    };
  })();

  // Those elements without closing tags.

  var VOID_ELEMS = [
    'area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img',
    'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'
  ];

  /**
   * Parsing for simple CSS selectors.
   */

  var SIMPLE_SELECTOR_MATCH = /(?:^|\s+)([^.#\[\]:\s]*)(\S*)\s*$/; // [full, tag, attrs]
  var SIMPLE_SELECTOR_CHUNKER = /([:#.]+)([^:#.]+)/g; // [type, identifier]

  function parseSimpleSelector (selector) {
    var match;
    if (!(match = selector.match(SIMPLE_SELECTOR_MATCH))) {
      return;
    }
    var ret = {
      tag: match[1] || 'div',
      props: {}
    };
    var chunks = match[2].match(SIMPLE_SELECTOR_CHUNKER) || [];
    for (var i = 0, len = chunks.length; i < len; i++) {
      switch (chunks[i].charAt(0)) {
        case '#':
          ret.props.id = chunks[i].substr(1);
          break;
        case '.':
          if (!ret.props['class']) {
            ret.props['class'] = '';
          }
          ret.props['class'] += (ret.props['class'] && ' ') + chunks[i].substr(1);
      }
    }
    return ret;
  };

  /**
   * TagrClassList
   */

  function TagrClassList (el) {
    this.el = el;
    var that = this;
    el.on('change:class', function (value) {
      that.splice(0, that.length);
      if (trim(value)) {
        that.push.apply(that, trim(value).split(/\s+/));
      }
    });
  }

  inherits(TagrClassList, []);

  TagrClassList.prototype['contains'] = function (token) {
    return indexOf(this, String(token)) >= 0;
  };

  TagrClassList.prototype['add'] = function (token) {
    if (!this.contains(token)) {
      this.el.set('class', token + ' ' + this);
    }
  };

  TagrClassList.prototype['remove'] = function (token) {
    var ret = '';
    for (var i = 0, next; next = this[i++]; ) {
      if (next != String(token)) {
        ret += next + ' ';
      }
    }
    this.el.set('class', ret);
  };

  TagrClassList.prototype['toggle'] = function (token) {
    if (this.contains(token)) {
      this.add(token);
    } else {
      this.remove(token);
    }
  };

  TagrClassList.prototype.toString = function () {
    return this.join(' ');
  };

  /**
   * class TagrElement
   */

  function TagrElement (tag) {
    this.tag = tag;
    this._props = {};
    this._style = {};
    this._nopersist = {};

    this.classList = new TagrClassList(this);
  }

  // TagrElements -are- arrays on the server, and use copy methods on client.
  // Extending array caveats apply: this approach fails in old IE as it does not
  // update the .length property. To manipulate the DOM, we override all in-place
  // functions anyway, and our arrays are read-only. This approach is safe.
  inherits(TagrElement, []);
  // Mixin EventEmitter prototype.
  augment(TagrElement.prototype, EventEmitter.prototype);

  // Properties.

  TagrElement.prototype['get'] = function (key) {
    return this._props[key];
  }

  TagrElement.prototype['set'] = chainable(mappable(expandKeys(expandValues(function (key, value) {
    this.emit('change:' + key, value);
    this._props[key] = value;
  }))));

  TagrElement.prototype['unset'] = function (key) {
    this.emit('change:' + key);
    return delete this._props[key];
  }

  TagrElement.prototype['call'] = function (key) {
    return this_props[key].apply(this, slice(arguments, 1));
  };

  TagrElement.prototype['properties'] = function () {
    return clone(this._props);
  };

  TagrElement.prototype['persist'] = function (key) {
    this._nopersist[key] = false;
  };

  TagrElement.prototype['stopPersisting'] = function (k) {
    this._nopersist[k] = true;
  };

  // Chainable manipulation.

  // TODO better merge with DOM extension.
  // TODO _attach _detach.
  TagrElement.prototype['splice'] = function (i, del) {
    for (var j = 0; j < del; j++) {
      if (typeof this[j] != 'string') {
        this[j].parent = null;
      }
    }
    for (var j = 0; j < arguments.length - 2; j++) {
      var arg = arguments[j + 2];
      if (typeof arg != 'string') {
        arg.parent = this;
      }
    }
    var ret = Array.prototype.splice.apply(this, arguments);
    for (var j = 0; j < arguments.length - 2; j++) {
      this.emit('insert', j, arguments[j + 2]);
    }
    return ret;
  }

  TagrElement.prototype['insert'] = chainable(function (i, args) {
    if (typeof i != 'number') {
      args = i;
      i = -1;
    }
    if (i < 0) {
      i += this.length + 1;
    }
    this['splice'].apply(this, [i, 0].concat(args));
  });

  TagrElement.prototype['remove'] = chainable(function (i, count) {
    if (i < 0) {
      i += this.length + 1;
    }
    var ret = this['splice'](i, count == null ? 1 : count);
  });

  TagrElement.prototype['children'] = chainable(function (args) {
    this['splice'].apply(this, [0, this.length].concat(args));
  });

  // Self manipulation.

  TagrElement.prototype['insertSelf'] = chainable(function (parent, i) {
    parent['insert'](i, this);
  });

  TagrElement.prototype['removeSelf'] = chainable(function () {
    this['parent']['remove'](this['index']());
  });

  TagrElement.prototype['index'] = function () {
    return this['parent'].indexOf(this);
  };

  // Text manipulation.

  TagrElement.prototype['spliceText'] = function (c, i, del, add) {
    if (typeof this[c] !== 'string') {
      throw new Error('Only a string can be spliced.');
    }
    this[c] = this[c].substr(0, i) + (add || '') + this[c].substr(i + del);
  };

  TagrElement.prototype['splitText'] = function (c, i) {
    if (typeof this[c] !== 'string') {
      throw new Error('Cannot split non-text node.');
    }
    Array.prototype.splice.call(this, c, 1, this[c].substr(0, i), this[c].substr(i));
  };

  // Style.

  TagrElement.prototype['style'] = chainable(mappable(expandKeys(expandValues(function (key, value) {
    this.addRule(key, value);
  }))));

  TagrElement.prototype['rules'] = function () {
    return copy(this._style);
  };

  TagrElement.prototype['addRule'] = function (k, v) {
    this._style[k] = v;
  };

  TagrElement.prototype['removeRule'] = function (k, v) {
    return delete this._style[k];
  };

  // Querying.

  TagrElement.prototype['query'] = function (match) {
    return new tagr['Query'](this, match);
  };

  TagrElement.prototype['findAll'] = function (match) {
    return this['query'](match)['findAll']();
  };

  TagrElement.prototype['find'] = function (match) {
    return this['query'](match)['find']();
  };

  // Serialization.

  TagrElement.prototype['toJSON'] = function () {
    return [this.tag, this.properties()].concat(this.map(function (child) {
      return typeof child === 'string' ? child : child.toJSON();
    }))
  };

  // TODO support data-* attributes
  TagrElement.prototype["toHTML"] = function () {
    var str = ["<" + this.tag], props = this.properties();
    for (var k in props) {
      if (hasOwnProperty(props, k)) {
        str.push(' ' + escapeHTML(k) + '="' + escapeHTML(String(props[k])) + '"');
      }
    }
    str.push('>');
    if (indexOf(VOID_ELEMS, this.tag) == -1) {
      for (var i = 0; i < this.length; i++) {
        str.push(typeof this[i] == 'string' ? escapeHTML(this[i]) : this[i].toHTML());
      }
      str.push("</" + this.tag + ">");
    }
    return str.join('');
  };

  /**
   * Element/text selection anchors.
   */

  function ElementAnchor (par, i) {
    this.par = par;
    this.i = i;
  }

  ElementAnchor.prototype.type = 'element';

  ElementAnchor.prototype.toAnchor = function() {
    return [this.par._node, this.i];
  };

  ElementAnchor.prototype.equals = function (cmp) {
    return cmp && this.par == cmp.par && this.i == cmp.i;
  };

  ElementAnchor.prototype.clone = function () {
    return new ElementAnchor(this.par, this.i);
  };

  function TextAnchor (par, child, i) {
    this.par = par;
    this.child = child;
    this.i = i;
  }

  TextAnchor.prototype.type = 'text';

  TextAnchor.prototype.toAnchor = function() {
    return [this.par._node.childNodes[this.child], this.i];
  };

  TextAnchor.prototype.equals = function (cmp) {
    return cmp && this.par == cmp.par && this.child == cmp.child && this.i == cmp.i;
  };

  TextAnchor.prototype.clone = function () {
    return new TextAnchor(this.par, this.child, this.i);
  };

  /**
   * class TagrQuery
   */

  // A dynamic query matching a CSS selector. Listeners and styles can be
  // set to the dynamic list, or we can .find() the current list of
  // matches.

  // A dynamic query matching a CSS selector. Listeners and styles can be
  // set to the dynamic list, or we can .find() the current list of
  // matches.

  function TagrQuery (base, selector) {
    this.base = base;
    this.selector = selector;
    this._style = {};
  }

  inherits(TagrQuery, EventEmitter.prototype);

  TagrQuery.prototype['style'] = chainable(mappable(expandKeys(expandValues(function(key, value) {
    this.addRule(key, value);
  }))));

  TagrQuery.prototype['addRule'] = function (key, value) {
    this._style[key] = value;
  };

  TagrQuery.prototype["find"] = function () {
    return this.findAll()[0];
  };

  TagrQuery.prototype["findAll"] = function () {
    return queryr(this.selector, this.base);
  };


  /****************************************************************************
   * DOM implementation
   */

  // Strings which are accessed differently in HTML than the DOM.

  var HTML_DOM_PROPS = {
    "for": "htmlFor",
    "accesskey": "accessKey",
    "codebase": "codeBase",
    "frameborder": "frameBorder",
    "framespacing": "frameSpacing",
    "nowrap": "noWrap",
    "maxlength": "maxLength",
    "class": "className",
    "readonly": "readOnly",
    "longdesc": "longDesc",
    "tabindex": "tabIndex",
    "rowspan": "rowSpan",
    "colspan": "colSpan",
    "enctype": "encType",
    "ismap": "isMap",
    "usemap": "useMap",
    "cellpadding": "cellPadding",
    "cellspacing": "cellSpacing"
  };

  // Fix DOM events, normalizing across browser. This will
  // probably only ever be rudimentary. :(

  function fixEvent (e) {
    e.target = e.target ? ((e.target.nodeType === 3) ? e.target.parentNode : e.target) : e.srcElement;
    e.relatedTarget = e.relatedTarget || (e.type == 'mouseover' ? e.fromElement : e.toElement);
    e.offsetX = e.offsetX || e.layerX;
    e.offsetY = e.offsetY || e.layerY;
    e.keyCode = e.keyCode || e.which;
    e.metaKey = e.metaKey === null ? e.ctrlKey : e.metaKey;
    e.preventDefault = e.preventDefault || function () { this.returnValue = false; };
    e.stopPropagation = e.stopPropagation || function () { this.cancelBubble = true; };
    return e;
  };

  // Unique identifier for DOM elements.
  // Use IE's .uniqueId, or an expando for other browsers.

  var uuid = 1;
  var getElementUniqueId = function (elem) {
    return elem['uniqueId'] || (elem['uniqueId'] = uuid++);
  };

  // DOM arbitrary value binding.
  // Nodes must be removed manually, as this does not garbage collect.

  var domdata = {
    _cache: {},
    set: function (elem, value) {
      return domdata._cache[getElementUniqueId(elem)] = value;
    },
    get: function (elem) {
      return domdata._cache[getElementUniqueId(elem)];
    },
    remove: function (elem) {
      return delete domdata._cache[getElementUniqueId(elem)];
    }
  };

  // domready
  // Code by Dustin Diaz, MIT licensed
  // https://github.com/ded/domready

  function domready () {
    var fns = [], fn, f = false
      , doc = document
      , testEl = doc.documentElement
      , hack = testEl.doScroll
      , domContentLoaded = 'DOMContentLoaded'
      , addEventListener = 'addEventListener'
      , onreadystatechange = 'onreadystatechange'
      , readyState = 'readyState'
      , loaded = /^loade|^c/.test(doc[readyState]);

    function flush(f) {
      loaded = 1
      while (f = fns.shift()) f()
    }

    doc[addEventListener] && doc[addEventListener](domContentLoaded, fn = function () {
      doc.removeEventListener(domContentLoaded, fn, f)
      flush()
    }, f);

    hack && doc.attachEvent(onreadystatechange, fn = function () {
      if (/^c/.test(doc[readyState])) {
        doc.detachEvent(onreadystatechange, fn)
        flush()
      }
    });

    (ready = hack ?
      function (fn) {
        self != top ?
          loaded ? fn() : fns.push(fn) :
          function () {
            try {
              testEl.doScroll('left')
            } catch (e) {
              return setTimeout(function() { ready(fn) }, 50)
            }
            fn()
          }()
      } :
      function (fn) {
        loaded ? fn() : fns.push(fn)
      })();
  }

  // DOM TagrElement implementation.

  var DOMTagrElement = function (tag, node, win) {
    this._node = node || win.document.createElement(tag);
    TagrElement.call(this, tag);
  };

  inherits(DOMTagrElement, TagrElement.prototype);

  // Associate TagrElement object with its DOM node.
  // We only need this association for querying, and thus, only when
  // elements are attached to the document.

  DOMTagrElement.prototype._attach = function(parent) {
    this.parent = parent;
    return domdata.set(this._node, this);
  };

  DOMTagrElement.prototype._detach = function() {
    delete this.parent;
    return domdata.remove(this._node);
  };

  // Create a data attribute with the element UUID. This is used only
  // for styling.

  DOMTagrElement.prototype._uuidClass = '';

  DOMTagrElement.prototype._ensureUuidClass = function() {
    if (!this._uuidClass) {
      this._node.className += ' ' + (this._uuidClass = 'tagr-' + getElementUniqueId(this._node));
    }
    return this._uuidClass;
  };

  // Properties.

  DOMTagrElement.prototype["get"] = function (key) {
    return (HTML_DOM_PROPS[key] || key) in this._node
      ? this._node[HTML_DOM_PROPS[key] || key]
      : this._props[key];
  };

  DOMTagrElement.prototype["set"] = chainable(mappable(expandKeys(expandValues(function(key, value) {
    this.emit('change:' + key, value);
    (HTML_DOM_PROPS[key] || key) in this._node
      ? this._node[HTML_DOM_PROPS[key] || key] = value
      : this._props[key] = value;
  }))));

  DOMTagrElement.prototype["unset"] = function (key) {
    this.emit('change:' + key);
    return (HTML_DOM_PROPS[key] || key) in this._node
      ? (delete this._node[HTML_DOM_PROPS[key] || key])
      : (delete this._props[key]);
  };

  DOMTagrElement.prototype["call"] = function (key) {
    return (HTML_DOM_PROPS[key] || key) in this._node
      ? this._node[HTML_DOM_PROPS[key] || key].apply(this._node, slice(arguments, 1))
      : this._props[key].apply(this, slice(arguments, 1));
  };

  DOMTagrElement.prototype['properties'] = function () {
    var props = {};
    // Persist properties to JSON, if:
    //  1) They are custom properties not unpersisted.
    for (var k in this._props) {
      if (hasOwnProperty(this._props, k) && !this._nopersist[k]) {
        props[k] = this._props;
      }
    }
    //  2) Have an attribute node (this takes the node value) and not stopPersist()ed
    for (var i = 0; i < this._node.attributes.length; i++) {
      var attr = this._node.attributes[i];
      if (this._nopersist[attr.name] !== false) {
        props[attr.name] = this._node[HTML_DOM_PROPS[attr.name] || attr.name];
      }
    }
    //  3) Explicit persisting of DOM properties.
    for (var k in this._nopersist) {
      if (hasOwnProperty(this._nopersist, k) && !hasOwnProperty(this._props, k) && this._nopersist[k] == false) {
        props[k] = this._node[HTML_DOM_PROPS[k] || k];
      }
    }
    return props;
  };

  // Events.

  DOMTagrElement.prototype['addListener'] = function(type, f) {
    var _this = this;
    if (this._node.addEventListener) {
      this._node.addEventListener(type, (function(e) {
        return _this['emit'](type, fixEvent(e));
      }), false);
    } else if (this._node.attachEvent) {
      this._node.attachEvent('on' + type, (function() {
        return _this['emit'](type, fixEvent(window.event));
      }));
    }
    return EventEmitter.prototype['addListener'].call(this, type, f);
  };

  // Children.

  DOMTagrElement.prototype['splice'] = function (i, del) {
    var parent = this._node;
    for (var j = 0; j < del; j++) {
      parent.removeChild(parent.childNodes[i]);
      if (typeof this[j] != 'string') {
        this[j]._detach();
      }
    }
    var right = parent.childNodes[i];
    for (var j = 0; j < arguments.length - 2; j++) {
      var arg = arguments[j + 2], node;
      if (typeof arguments[j + 2] == 'string') {
        node = this._node.ownerDocument.createTextNode(arg);
      } else {
        node = arg._node;
      }
      if (node.parentNode && node.parentNode.nodeType == 1) {
        throw new Error('Must remove element before appending elsewhere.');
      }
      parent.insertBefore(node, right);
      if (typeof arg != 'string') {
        arg._attach(this);
      }
    }
    var ret = Array.prototype.splice.apply(this, arguments);
    for (var j = 0; j < arguments.length - 2; j++) {
      this.emit('insert', j, arguments[j + 2]);
    }
    return ret;
  };

  DOMTagrElement.prototype['push'] = function () {
    return this.insert.apply(this, [this.length, slice(arguments)]);
  };

  DOMTagrElement.prototype['pop'] = function () {
    return this.remove(this.length - 1);
  };

  DOMTagrElement.prototype['unshift'] = function () {
    return this.insert.apply(this, [0].concat(arguments));
  };

  DOMTagrElement.prototype['shift'] = function () {
    return this.remove(0);
  };

  DOMTagrElement.prototype['sort'] = function () {
    // TODO
  };

  DOMTagrElement.prototype['reverse'] = function () {
    // TODO
  };

  // Text Manipulation.

  DOMTagrElement.prototype['spliceText'] = function (c, i, del, add) {
    this._node.childNodes[c].replaceData(i, del, add || '');
    return TagrElement.prototype['spliceText'].apply(this, arguments);
  };

  DOMTagrElement.prototype['splitText'] = function (c, i) {
    this._node.childNodes[c].splitText(i);
    return TagrElement.prototype['splitText'].apply(this, arguments);
  };

  // Style.

  DOMTagrElement.prototype['addRule'] = function (k, v) {
    // IE throws errors on invalid values, and hates whitespace.
    try {
      this._node.style[toCamelCase(k)] = trim(v);
    } catch (e) { }
    return TagrElement.prototype['addRule'].apply(this, arguments);
  };

  // DOM Tagr Query equivalent.

  function Stylesheet (media) {
    var s = document.createElement('style');
    s.type = 'text/css';
    s.media = media || 'all';
    document.getElementsByTagName('head')[0].appendChild(s);
    return s.sheet || s.styleSheet;
  };

  var stylesheetCache = {};
  function getStylesheet (media) {
    media = media || 'all';
    return stylesheetCache[media] || (stylesheetCache[media] = new Stylesheet(media));
  };

  function DOMTagrQuery (base, selector) {
    TagrQuery.apply(this, arguments);
  }

  inherits(DOMTagrQuery, TagrQuery.prototype);

  DOMTagrQuery.prototype['addRule'] = function (key, value) {
    TagrQuery.prototype['addRule'].apply(this, arguments);
    var s = getStylesheet();
    if (s.insertRule != null) {
      s.insertRule("." + (this.base._ensureUuidClass()) + " " + this.selector + " { " + key + ": " + value + " }", s.cssRules.length);
    } else {
      s.addRule("." + (this.base._ensureUuidClass()) + " " + this.selector, "" + key + ": " + value);
    }
    return this;
  };

  DOMTagrQuery.prototype["addListener"] = function (type, f) {
    var _this = this;
    this.base.on(type, function (e) {
      var matches = queryr(_this.selector, _this.base);
      for (var n = tagr.getContext(e.target || e.srcElement); n != _this.base && n; n = n.parent) {
        if (indexOf(matches, n) > -1) {
          f.call(n, e);
        }
      }
    });
    return TagrQuery.prototype["addListener"].call(this, type, f);
  };

  /**
   * Tagr view
   */

  // Get the used value of a style (aka getComputedStyle)
  // https://developer.mozilla.org/en/DOM/window.getComputedStyle

  function getStyleUsedValue (n, name) {
    var computedStyle, left, rsLeft, val, _ref, _ref1, _ref2;
    if (window.getComputedStyle) {
      computedStyle = n.ownerDocument.defaultView.getComputedStyle(n, null);
      val = computedStyle != null ? computedStyle.getPropertyValue(name) : void 0;
      return (name === "opacity" && val === "" ? "1" : val);
    } else if (n.currentStyle) {
      val = (_ref = n.currentStyle[name]) != null ? _ref : n.currentStyle[toCamelCase(name)];
      if (!/^\d+(?:px)?$/i.test(ret) && /^\d/.test(ret)) {
        _ref1 = [n.style.left, n.runtimeStyle.left], left = _ref1[0], rsLeft = _ref1[1];
        n.runtimeStyle.left = n.currentStyle.left;
        n.style.left = (name === "font-size" ? "1em" : val || 0);
        val = n.style.pixelLeft + "px";
        _ref2 = [left, rsLeft], n.style.left = _ref2[0], n.runtimeStyle.left = _ref2[1];
      }
      return val;
    }
  };

  // Function to convert a [node, offset] pair into a normalized anchor.

  function convertAnchor (arg) {
    var node = arg[0], offset = arg[1], el;
    if (node.nodeType === 1) {
      if (!(el = domdata.get(node))) {
        return;
      }
      return new ElementAnchor(el, offset);
    } else {
      if (!(el = domdata.get(node.parentNode))) {
        return;
      }
      var i = 0, n = node;
      while (n.previousSibling) {
        n = n.previousSibling;
        i++;
      }
      return new TextAnchor(el, i, offset);
    }
  };

  // Creates a view object, which exposes aspects of how the DOM is being 
  // rendered or the user is interacting with the DOM.

  function createView (win) {
    return {
      'getBox': function (el, ctx) {
        var box = el._node.getBoundingClientRect();
        if (ctx) {
          var relativeBox = ctx._node.getBoundingClientRect();
          for (var k in relativeBox) {
            box[k] -= relativeBox[k];
          }
        }
        return box;
      },
      'getStyle': function (t, name) {
        return getStyleUsedValue(t._node, name);
      },
      'selection': {
        "has": function () {
          return Selection.hasSelection(win);
        },
        "getOrigin": function () {
          return convertAnchor(Selection.getOrigin(win));
        },
        "getFocus": function () {
          return convertAnchor(Selection.getFocus(win));
        },
        "getStart": function () {
          return convertAnchor(Selection.getStart(win));
        },
        "getEnd": function () {
          return convertAnchor(Selection.getEnd(win));
        },
        "set": function (origin, focus) {
          return Selection.setSelection.apply(Selection, [win].concat(origin.toAnchor(), focus.toAnchor()));
        },
        "unset": function () {
          return Selection.clearSelection(win);
        }
      }
    }
  }

  /****************************************************************************
   * module tagr
   */

  // Module generators.

  function createVirtualModule () {
    return createModule(TagrElement, TagrQuery);
  }

  function createDOMModule (win) {
    var tagr = createModule(DOMTagrElement, DOMTagrQuery);
    tagr._window = win;
    tagr.view = createView(win);
    tagr._domdata = domdata;

    // tagr.getContext creates an element context.
    // Only Tagr methods should be used on the children of this context.
    tagr['getContext'] = function (node) {
      var el;
      if ((el = domdata.get(node)) == null) {
        domdata.set(node, (el = new DOMTagrElement(node.tagName.toLowerCase(), node, win)));
      }
      return el;
    };

    // document.write a new context, avoiding the need for tagr.ready()
    tagr['writeContext'] = function (simple) {
      var sel = parseSimpleSelector(simple || '');
      var props = isBareObject(arguments[1]) ? arguments[1] : {};
      var children = slice(arguments, isBareObject(arguments[1]) ? 2 : 1);

      document.write("<" + sel.tag + "></" + sel.tag + ">");
      var list = document.getElementsByTagName(sel.tag);
      return tagr["getContext"](list[list.length - 1])
        ['set'](sel.props)['set'](props)
        ['children'](children);
    };

    tagr['ready'] = domready;

    return tagr;
  }

  function createModule (TagrElement, TagrQuery) {
    return {
      'Element': TagrElement,
      'Query': TagrQuery,

      'ElementAnchor': ElementAnchor,
      'TextAnchor': TextAnchor,

      // tagr.create(...) is the public method to create new TagrElements.
      'create': function (simple) {
        var sel = parseSimpleSelector(simple || '');
        var props = isBareObject(arguments[1]) ? arguments[1] : {};
        var children = slice(arguments, isBareObject(arguments[1]) ? 2 : 1);

        return new this['Element'](sel.tag, null, this._window)
          ['set'](sel.props)['set'](props)
          ['children'](children);
      },

      // Parse a JSON tree into a map of Tagr elements.
      'parse': function (format) {
        if (typeof format == 'object') {
          // Parse JSON. Passes arguments to tagr.create();
          var props = isBareObject(format[1]) ? format[1] : {};
          var children = format.slice(isBareObject(format[1]) ? 2 : 1);
          for (var i = 0; i < children.length; i++) {
            if (isArray(children[i])) {
              children[i] = this['parse'](children[i]);
            }
          }
          return this['create'](format[0], props)['children'](children);

        } else {
          // Parse HTML.
          // aaaaaaand.... TODO
        } 
      },

      // Module rewrites.
      'dom': createDOMModule,
      'virtual': createVirtualModule
    };
  };

  return isBrowser ? createDOMModule(window) : createVirtualModule();

})(this.Selection);

if (typeof module !== 'undefined') {
  module.exports = tagr;

  module.exports.staticPath = __dirname + '/lib';
}

//console.log(tagr.create('div', 'Hey mom!', tagr.create('b', 'Bold text.')));