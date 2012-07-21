/**
 * @license Tagr, HTML manipulation for webapps. MIT Licensed.
 */

var tagr = (function() {

  // Environment variables.
  var window, document, head, body;

  /**
   * Wishful utilities
   */

  function isArray (arg) {
    return Object.prototype.toString.call(arg) === "[object Array]";
  }

  function hasOwnProperty (obj, k) {
    return Object.prototype.hasOwnProperty.call(obj, k);
  }

  // TODO shim this
  function forEach (obj, fn) {
    return [].forEach.call(obj, fn);
  }

  // TODO shim this
  function indexOf (arr, v) {
    return [].indexOf.call(arr, v);
  }

  // TODO shim this
  function map (arr, f) {
    return [].map.call(arr, f);
  }

  function trim (str) {
    return str.replace(/^\s+|\s+$/g, "");
  };

  function fromCamelCase (name) {
    return name.replace(/([A-Z])/g, "-$1").toLowerCase();
  };

  function toCamelCase (name) {
    return name.toLowerCase().replace(/\-[a-z]/g, (function (s) {
      return s[1].toUpperCase();
    }));
  };

  function extend (child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    return child;
  }

  var spliceObject = function() {
    var add, c, del, i, j, obj, ret, _i, _j, _k, _l, _len, _ref, _ref1, _ref2;
    obj = arguments[0], i = arguments[1], del = arguments[2], add = 4 <= arguments.length ? [].slice.call(arguments, 3) : [];
    if (i < 0 || isNaN(i)) {
      throw 'Invalid index';
    }
    if (del) {
      ret = [];
      for (j = _i = 0; 0 <= del ? _i < del : _i > del; j = 0 <= del ? ++_i : --_i) {
        ret.push(obj[i + j]);
        delete obj[i + j];
      }
    }
    if (del > add.length) {
      for (j = _j = _ref = i + del, _ref1 = obj.length; _j < _ref1; j = _j += 1) {
        obj[j - del] = obj[j];
      }
    } else if (add.length > del) {
      for (j = _k = _ref2 = obj.length + (add.length - del) - 1; _k > i; j = _k += -1) {
        obj[j] = obj[j - (add.length - del)];
      }
    }
    if (add.length) {
      for (j = _l = 0, _len = add.length; _l < _len; j = ++_l) {
        c = add[j];
        obj[i + j] = c;
      }
    }
    obj.length += (-del) + add.length;
    return ret;
  };

  function mappable (fn) {
    return function (k, v) {
      if (typeof k === 'object') {
        for (var mk in k) {
          fn.call(this, mk, k[mk]);
        }
        return this;
      }
      return fn.call(this, k, v);
    };
  };
  
  function iterkeys (fn) {
    return function (k, v) {
      if (isArray(k)) {
        var that = this;
        k.forEach(function (mk) {
          fn.call(that, mk, v);
        });
        return this;
      }
      return fn.call(this, k, v);
    };
  };

  function itervalues (fn) {
    return function (k, v) {
      if (isArray(v)) {
        var that = this;
        v.forEach(function (mv) {
          fn.call(that, k, mv);
        });
        return this;
      }
      return fn.call(this, k, v);
    };
  };


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

  // Strings which are accessed differently in HTML than the DOM.

  var HTML_DOM_PROPS = {
    "for": "htmlFor",
    accesskey: "accessKey",
    codebase: "codeBase",
    frameborder: "frameBorder",
    framespacing: "frameSpacing",
    nowrap: "noWrap",
    maxlength: "maxLength",
    "class": "className",
    readonly: "readOnly",
    longdesc: "longDesc",
    tabindex: "tabIndex",
    rowspan: "rowSpan",
    colspan: "colSpan",
    enctype: "encType",
    ismap: "isMap",
    usemap: "useMap",
    cellpadding: "cellPadding",
    cellspacing: "cellSpacing"
  };

  // Those elements without closing tags.

  var VOID_ELEMS = [
    'area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img',
    'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'
  ];

  /**
   * domready
   * Code by Dustin Diaz, MIT licensed
   * https://github.com/ded/domready
   */

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

  /**
   * Get the used value of a style (aka getComputedStyle)
   * https://developer.mozilla.org/en/DOM/window.getComputedStyle
   */

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

  /**
   * querySelector implementation for browsers back to IE6.
   * This works naively, and defaults to Sizzle when available.
   */

  var findBySelector = null;

  var getQuerySelector = function () {
    var browser;
    browser = (function() {
      var sheet;
      if (document.querySelector != null) {
        return function(root, selector) {
          return root.querySelectorAll(selector);
        };
      } else if (document.documentElement.currentStyle != null) {
        sheet = new Stylesheet();
        return function(root, selector) {
          var res, tag, x, _ref;
          tag = (_ref = selector.match(SIMPLE_SELECTOR_MATCH)) != null ? _ref[1] : void 0;
          sheet.addRule(selector, 'foo:bar');
          res = (function() {
            var _i, _len, _ref1, _results;
            _ref1 = (tag ? root.all.tags(tag) : root.all);
            _results = [];
            for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
              x = _ref1[_i];
              if (x.currentStyle.foo === 'bar') {
                _results.push(x);
              }
            }
            return _results;
          })();
          sheet.removeRule(0);
          return res;
        };
      }
    });

    return function(root, selector) {
      if (typeof Sizzle !== 'undefined') {
        return Sizzle(selector, root);
      } else {
        return browser(root, selector);
      }
    };
  };

  /**
   * Unique identifier for DOM elements.
   * Use IE's .uniqueId, or an expando for other browsers.
   */

  var getElementUniqueId = (function() {
    var uuid;
    uuid = 0;
    return function(elem) {
      var _ref;
      return (_ref = elem.uniqueId) != null ? _ref : (elem.uniqueId = uuid++);
    };
  })();

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
      classes: [],
      id: null
    };
    var chunks = match[2].match(SIMPLE_SELECTOR_CHUNKER) || [];
    for (var i = 0, len = chunks.length; i < len; i++) {
      switch (chunks[i].charAt(0)) {
        case '#':
          ret.id = chunks[i].substr(1);
          break;
        case '.':
          ret.classes.push(chunks[i].substr(1));
      }
    }
    return ret;
  };

  /**
   * EventEmitter implementation
   * http://nodejs.org/api/events.html
   */

  function EventEmitter () { }

  EventEmitter.prototype.listeners = function(type) {
    this._events = (this._events ? this._events : {});
    if (hasOwnProperty(this._events, type)) {
      return this._events[type];
    } else {
      return this._events[type] = [];
    }
  };

  EventEmitter.prototype.on = function() {
    return this.addListener.apply(this, [].slice.call(arguments, 0));
  };

  EventEmitter.prototype.once = function(type, f) {
    var g = function() {
      f.apply(this, [].slice.call(arguments, 0));
      return this.removeListener(type, g);
    };
    return this.on(type, g);
  };

  EventEmitter.prototype.addListener = function(type, f) {
    if ((this.listeners(type).push(f)) > this._maxListeners && this._maxListeners !== 0) {
      if (typeof console !== "undefined") {
        console.warn("Possible EventEmitter memory leak detected. " + this._events[type].length + " listeners added. Use emitter.setMaxListeners() to increase limit.");
      }
    }
    this.emit("newListener", type, f);
    return this;
  };

  EventEmitter.prototype.removeListener = function(type, f) {
    var i = this.listeners(type).indexOf(f);
    if (i !== -1) {
      this.listeners(type).splice(i, 1);
    }
    return this;
  };

  EventEmitter.prototype.removeAllListeners = function(type) {
    var k, v, _ref = this._events || {};
    for (k in _ref) {
      v = _ref[k];
      if (!(type != null) || type === k) {
        v.splice(0, v.length);
      }
    }
    return this;
  };

  EventEmitter.prototype.emit = function() {
    var type = arguments[0];
    for (var i = 0, listeners = this.listeners(type); i < listeners.length; i++) {
      listeners[i].apply(this, [].slice.call(arguments, 1));
    }
    return this.listeners(type).length > 0;
  };

  EventEmitter.prototype._maxListeners = 10;

  EventEmitter.prototype.setMaxListeners = function(_maxListeners) {
    this._maxListeners = _maxListeners;
  };

  /**
   * DOM arbitrary value binding.
   * Objects must be removed manually, as this does not garbage collect.
   */

  function DomMap() {
    this.cache = {};
  }

  DomMap.prototype.set = function (elem, value) {
    return this.cache[getElementUniqueId(elem)] = value;
  };

  DomMap.prototype.get = function (elem) {
    return this.cache[getElementUniqueId(elem)];
  };

  DomMap.prototype.remove = function (elem) {
    return delete this.cache[getElementUniqueId(elem)];
  };

  /** 
   * Resource extensions.
   * TODO expose these with Tagr?
   */

  function Stylesheet (media) {
    var s = document.createElement('style');
    s.type = 'text/css';
    s.media = media || 'all';
    document.getElementsByTagName('head')[0].appendChild(s);
    return s.sheet || s.styleSheet;
  };

  function Script () {
    var s = document.createElement('script');
    s.src = 'about:blank';
    return document.getElementsByTagName('head')[0].appendChild(s);
  };

  /**
   * Tagr Implementation
   */

  function tagr (simple, attrs) {
    if (typeof simple != 'string') {
      throw new Exception('Invalid tag or selector argument passed to tagr.create: ' + simple)
    } 

    // Break the simple selector into its component parts.
    var sel = parseSimpleSelector(simple || '');
    var node = document.createElement(sel.tag);
    if (sel.classes.length) {
      node.className = sel.classes.join(' ');
    }
    if (sel.id) {
      node.id = sel.id;
    }

    // Create the element.
    var el = new TagrElement(node);
    el.set(attrs || {});
    if (arguments.length > 2) {
      el.push.apply(el, [].slice.call(arguments, 2));
    }
    return el;
  };

  // tagr.create(...) is an alias for tagr(...)
  tagr.create = tagr;

  tagr.IGNORE_ATTRS = ['data-tagr'];

  tagr['parse'] = function(str) {
    var arg, args, attrs, simple, _ref;
    if (typeof str === 'string') {
      return str;
    }
    simple = str[0], attrs = str[1], args = 3 <= str.length ? [].slice.call(str, 2) : [];
    return (_ref = tagr(simple, attrs)).push.apply(_ref, (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = args.length; _i < _len; _i++) {
        arg = args[_i];
        _results.push(tagr.parse(arg));
      }
      return _results;
    })());
  };

  tagr['ready'] = domready;

  tagr._map = new DomMap();

  tagr._getWrapper = function(node, initialize) {
    var obj;
    if (initialize == null) {
      initialize = false;
    }
    if (node.nodeType !== 1) {
      throw new Error('Cannot create Tagr context of non-element');
    }
    if ((obj = tagr._map.get(node)) == null) {
      if (!initialize) {
        throw new Error('No Tagr wrapper exists for this element.');
      }
      tagr._map.set(node, (obj = new TagrElement(node)));
    }
    return obj;
  };

  tagr['getContext'] = function(node) {
    return tagr._getWrapper(node, true);
  };

  tagr['writeContext'] = function(simple, props) {
    var sel = parseSimpleSelector(simple || '');
    document.write("<" + sel.tag + "></" + sel.tag + ">");
    // TODO classes and ids

    var list = document.getElementsByTagName(sel.tag);
    var el = tagr["getContext"](list[list.length - 1]);
    el.set(props || {});
    el.push.apply(el, [].slice.call(arguments, 2));
    return el;
  };

  /**
   * TagrClassList
   */

  function TagrClassList (elem) {
    this.push.apply(this, elem.className ? trim(elem.className).split(/\s+/) : []);
    this._update = function () {
      node.className = this.toString();
    };
  }

  extend(TagrClassList, Array);

  TagrClassList.prototype.item = function (i) {
    return this[i] || null;
  };

  TagrClassList.prototype.contains = function (token) {
    return indexOf(this, String(token)) !== -1;
  };

  TagrClassList.prototype.add = function (token) {
    if (!this.contains(token)) {
      this.push(String(token));
      this._update();
    }
  };

  TagrClassList.prototype.remove = function (token) {
    var i = 0;
    if ((i = indexOf(this, String(token))) !== -1) {
      this.splice(i, 1);
      this._update();
    }
  };

  TagrClassList.prototype.toggle = function (token) {
    if (this.contains(String(token))) {
      this.add(token);
    } else {
      this.remove(token);
    }
  };

  TagrClassList.prototype.toString = function () {
    return this.join(" ");
  };

  /**
   * TagrElement
   */

  // Those properties which can be updated in the DOM and not have
  // their changes reflected in HTML.

  var HTML_PERSIST_ATTRS = {
    input: ['value']
  };

  var TagrElement = tagr['TagrElement'] = function (_node, parent) {
    this._node = _node;
    this.parent = parent;

    this["tag"] = this._node.nodeName.toLowerCase();
    this.classList = new TagrClassList(_node);
    this._props = {};
    this._persist = {};
    if (HTML_PERSIST_ATTRS[this.tag]) {
      for (var i = 0; i < HTML_PERSIST_ATTRS[this.tag].length; i++) {
        this.persist(HTML_PERSIST_ATTRS[this.tag][i]);
      }
    }

    // Import existing children.
    var childNodes = this._node.childNodes;
    this.length = childNodes.length;
    for (var i = 0; i < this.length; i++) {
      var child = childNodes[i];
      this[i] = (child.nodeType === 1 ? new TagrElement(child, this) : child.nodeValue);
    }
  }

  extend(TagrElement, EventEmitter);

  TagrElement.prototype._attach = function(parent) {
    this.parent = parent;
    return tagr._map.set(this._node, this);
  };

  TagrElement.prototype._detach = function() {
    delete this.parent;
    return tagr._map.remove(this._node);
  };

  TagrElement.prototype._uuidClass = '';

  TagrElement.prototype._ensureUuidClass = function() {
    if (!this._uuidClass) {
      this._node.className += ' ' + (this._uuidClass = 'tagr-' + getElementUniqueId(this._node));
    }
    return this._uuidClass;
  };

  // Style.

  TagrElement.prototype["style"] = mappable(iterkeys(itervalues(function (k, v) {
    this.addRule(k, v);
    return this;
  })));

  TagrElement.prototype.rules = function () {
    // Read out all inline styles into a hash.
    var rules = {};
    for (var i = 0; i < this._node.style.length; i++) {
      rules[this._node.style[i]] = this._node.style[this._node.style[i]];
    }
    return rules;
  };

  TagrElement.prototype.addRule = function (k, v) {
    // IE throws errors on invalid values, and hates whitespace.
    try {
      this._node.style[toCamelCase(k)] = trim(v);
    } catch (e) { }
    return this;
  };

  TagrElement.prototype.removeRule = function (k, v) {
    // We're not removing the rule, just clearing it.
    try {
      this._node.style[toCamelCase(k)] = '';
    } catch (e) { }
    return this;
  };

  // Properties.

  TagrElement.prototype["get"] = function(k) {
    return (HTML_DOM_PROPS[k] || k) in this._node
      ? this._node[HTML_DOM_PROPS[k] || k]
      : this._props[k];
  };

  TagrElement.prototype["set"] = mappable(iterkeys(itervalues(function(k, v) {
    this.emit('change:' + k, v);
    (HTML_DOM_PROPS[k] || k) in this._node
      ? this._node[HTML_DOM_PROPS[k] || k] = v
      : this._props[k] = v;
    return this;
  })));

  TagrElement.prototype["remove"] = function(k) {
    this.emit('change:' + k);
    return (HTML_DOM_PROPS[k] || k) in this._node
      ? (delete this._node[HTML_DOM_PROPS[k] || k])
      : (delete this._props[k]);
  };

  TagrElement.prototype['properties'] = function () {
    var props = JSON.parse(JSON.stringify(this._props));
    for (var i = 0; i < this._node.attributes.length; i++) {
      var attr = this._node.attributes[i];
      props[attr.name] = this._node[HTML_DOM_PROPS[attr.name] || attr.name];
    }
    for (var k in this._persist) {
      if (hasOwnProperty(this._persist, k) && this._persist[k]) {
        props[k] = this._node[HTML_DOM_PROPS[k] || k];
      }
    }
    return props;
  };

  TagrElement.prototype['persist'] = function (k) {
    this._persist[k] = true;
  };

  TagrElement.prototype['stopPersisting'] = function (k) {
    this._persist[k] = false;
  };

  // Events.

  TagrElement.prototype["addListener"] = function(type, f) {
    var _this = this;
    if (this._node.addEventListener) {
      this._node.addEventListener(type, (function(e) {
        return _this["emit"](type, e);
      }), false);
    } else if (this._node.attachEvent) {
      this._node.attachEvent('on' + type, (function() {
        return _this["emit"](type, window.event);
      }));
    }
    return EventEmitter.prototype["addListener"].call(this, type, f);
  };

  // Array manipulation.

  TagrElement.prototype["splice"] = function() {
    var add, del, i, j, n, obj, right, _i, _j, _len;
    i = arguments[0], del = arguments[1], add = 3 <= arguments.length ? [].slice.call(arguments, 2) : [];
    for (j = _i = 0; 0 <= del ? _i < del : _i > del; j = 0 <= del ? ++_i : --_i) {
      this._node.removeChild(this._node.childNodes[i]);
      if (typeof this[i + j] === 'object') {
        this[i + j]._detach();
      }
    }
    right = this._node.childNodes[i] || null;
    for (j = _j = 0, _len = add.length; _j < _len; j = ++_j) {
      obj = add[j];
      if (typeof obj === 'object') {
        if (obj.constructor === Array) {
          obj = add[j] = tagr["parse"](obj);
        }
        n = obj._node;
      } else {
        n = document.createTextNode(obj);
      }
      if (n.parentNode && n.parentNode.nodeType === 1) {
        throw new Error('Must remove element before appending elsewhere.');
      }
      this._node.insertBefore(n, right);
      if (typeof obj === 'object') {
        obj._attach(this);
      }
    }
    return spliceObject.apply(null, [this, i, del].concat([].slice.call(add)));
  };

  TagrElement.prototype["push"] = function () {
    return this.insert.apply(this, [this.length].concat([].slice.call(arguments)));
  };

  TagrElement.prototype["pop"] = function () {
    return this.remove(this.length - 1);
  };

  TagrElement.prototype["unshift"] = function () {
    return this.insert.apply(this, [0].concat(arguments));
  };

  TagrElement.prototype["shift"] = function () {
    return this.remove(0);
  };

  TagrElement.prototype["indexOf"] = function (cmp) {
    for (var i = 0; i < this.length; i++) {
      if (this[i] == cmp) {
        return i;
      }
    }
    return -1;
  };

  // Extend TagrElement with built-in array functionality.
  // Arrays might be extended to ES5, so dynamically invoke the array prototype.

  forEach([
    'slice', 'sort', 'reverse', 'forEach', 'map', 'every',
    'lastIndexOf', 'filter', 'some', 'reduce', 'reduceRight'
  ], function (name) {
    TagrElement.prototype[name] = function() {
      return Array.prototype[name].apply(this, arguments);
    };
  });

  // Custom manipulation.
  // TODO support negative indices

  TagrElement.prototype["insert"] = function (i) {
    this["splice"].apply(this, [i, 0].concat([].slice.call(arguments, 1)));
    return this.length;
  };

  TagrElement.prototype["remove"] = function (i) {
    var ret = this["splice"](i, 1);
    return ret[0];
  };

  TagrElement.prototype["empty"] = function () {
    this["splice"](0, this.length);
    return this.length;
  };

  // Self manipulation.

  TagrElement.prototype["insertSelf"] = function (parent, i) {
    parent["insert"](i, this);
    return this;
  };

  TagrElement.prototype["removeSelf"] = function () {
    this["parent"]["remove"](this["index"]());
    return this;
  };

  TagrElement.prototype["index"] = function () {
    return this["parent"].indexOf(this);
  };

  // Text manipulation.

  TagrElement.prototype["spliceText"] = function (c, i, del, add) {
    if (typeof this[c] !== 'string') {
      throw new Error('Cannot splice non-text node.');
    }
    this._node.childNodes[c].replaceData(i, del, add || '');
    this[c] = this._node.childNodes[c].data;
    return this;
  };

  TagrElement.prototype["splitText"] = function (c, i) {
    if (typeof this[c] !== 'string') {
      throw new Error('Cannot split non-text node.');
    }
    this._node.childNodes[c].splitText(i);
    return spliceObject(this, c, 1, this[c].substr(0, i), this[c].substr(i));
  };

  // Querying.

  TagrElement.prototype["query"] = function (match) {
    return new tagr["TagrQuery"](this, match);
  };

  TagrElement.prototype["findAll"] = function (match) {
    return this["query"](match)["findAll"]();
  };

  TagrElement.prototype["find"] = function (match) {
    return this["query"](match)["find"]();
  };

  // Serialization.

  TagrElement.prototype["toJSON"] = function () {
    // Persist properties to JSON, if:
    //  1) They are deliberately persist()ed
    var props = {};
    for (var k in this._persist) {
      if (hasOwnProperty(this._persist, k) && this._persist[k]) {
        props[k] = this._node[HTML_DOM_PROPS[k] || k];
      }
    }
    //  2) Have an attribute node (this takes the node value) and not stopPersist()ed
    for (var i = 0; i < this._node.attributes.length; i++) {
      var attr = this._node.attributes[i];
      if (this._persist[attr.name] !== false) {
        props[attr.name] = this._node[HTML_DOM_PROPS[attr.name] || attr.name];
      }
    }

    // Serialize children.
    var children = map(this, function (x) {
      return typeof x === 'string' ? x : x.toJSON();
    });

    return [this.tag, props].concat(children);
  };

  TagrElement.prototype["toHTML"] = function () {
    var k, str, x, _i, _len, _ref;
    str = ["<" + this.tag];
    _ref = this.props;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      k = _ref[_i];
      str.push(" " + (escapeHTML(k)) + "=\"" + (escapeHTML(String(this.props.get(k)))) + "\"");
    }
    str.push.apply(str, ['>'].concat([].slice.call((function() {
      var _j, _len1, _results;
      _results = [];
      for (_j = 0, _len1 = this.length; _j < _len1; _j++) {
        x = this[_j];
        _results.push(typeof x === 'string' ? x : x.toHTML());
      }
      return _results;
    }).call(this)), ["</" + this.tag + ">"]));
    return str.join('');
  };

  /**
   * TagrQuery. A dynamic query for child elements.
   */

  var TagrQuery = tagr['TagrQuery'] = (function () {

    var sCache = {};
    function getStylesheet (media) {
      if (media == null) {
        media = 'all';
      }
      if (sCache[media] != null) {
        return sCache[media];
      }
      return sCache[media] = new Stylesheet(media);
    };

    function TagrQuery (ctx, selector) {
      var _this = this;
      this.base = this.ctx = ctx;
      this.selector = selector;
    }

    extend(TagrQuery, EventEmitter);

    TagrQuery.prototype['style'] = function(k, v) {
      var s = getStylesheet();
      if (s.insertRule != null) {
        s.insertRule("." + (this.ctx._ensureUuidClass()) + " " + this.selector + " { " + k + ": " + v + " }", s.cssRules.length);
      } else {
        s.addRule("." + (this.ctx._ensureUuidClass()) + " " + this.selector, "" + k + ": " + v);
      }
      return this;
    };

    TagrQuery.prototype["addListener"] = function (type, f) {
      var _this = this;
      this.ctx.on(type, (function(e) {
        var matches, _results;
        matches = findBySelector(_this.ctx._node, _this.selector);
        n = e.target || e.srcElement;
        _results = [];
        while (n !== _this.ctx._node && n) {
          if (indexOf(matches, n) >= 0) {
            f.call(tagr._getWrapper(n), e);
          }
          _results.push(n = n.parentNode);
        }
        return _results;
      }), false);
      return EventEmitter.prototype["addListener"].call(this, type, f);
    };

    TagrQuery.prototype["find"] = function () {
      return this.findAll()[0];
    };

    TagrQuery.prototype["findAll"] = function () {
      var el, _j, _len1, _ref1, _results;
      _ref1 = findBySelector(this.ctx._node, this.selector);
      _results = [];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        el = _ref1[_j];
        _results.push(tagr._getWrapper(el));
      }
      return _results;
    };

    return TagrQuery;
  })();

  /**
   * Element/text selection anchors.
   */

  var ElementAnchor = tagr['ElementAnchor'] = function (par, i) {
    this.par = par;
    this.i = i;
  }

  ElementAnchor.prototype.toAnchor = function() {
    return [this.par._node, this.i];
  };

  var TextAnchor = tagr['TextAnchor'] = function (par, child, i) {
    this.par = par;
    this.child = child;
    this.i = i;
  }

  TextAnchor.prototype.toAnchor = function() {
    return [this.par._node.childNodes[this.child], this.i];
  };

  convertAnchor = function(_arg) {
    var i, node, offset, t;
    node = _arg[0], offset = _arg[1];
    if (node.nodeType === 1) {
      if (!(t = tagr._getWrapper(node))) {
        return;
      }
      return new ElementAnchor(t, offset);
    } else {
      if (!(t = tagr._getWrapper(node.parentNode))) {
        return;
      }
      i = 0;
      n = node;
      while (n.previousSibling) {
        n = n.previousSibling;
        i++;
      }
      return new TextAnchor(el, i, offset);
    }
  };

  /**
   * Tagr view
   */

  tagr['view'] = {
    "getBox": function(t, ctx) {
      var box, k, v, _ref1;
      box = t._node.getBoundingClientRect();
      if (ctx != null) {
        _ref1 = ctx._node.getBoundingClientRect();
        for (k in _ref1) {
          v = _ref1[k];
          box[k] -= v;
        }
      }
      return box;
    },
    "getStyle": function(t, name) {
      return getStyleUsedValue(t._node, name);
    },
    "selection": {
      "has": function() {
        return Selection.hasSelection(window);
      },
      "getOrigin": function() {
        return convertAnchor(Selection.getOrigin(window));
      },
      "getFocus": function() {
        return convertAnchor(Selection.getFocus(window));
      },
      "getStart": function() {
        return convertAnchor(Selection.getStart(window));
      },
      "getEnd": function() {
        return convertAnchor(Selection.getEnd(window));
      },
      "set": function(origin, focus) {
        return Selection.setSelection.apply(Selection, [window].concat([].slice.call(origin.toAnchor()), [].slice.call(focus.toAnchor())));
      },
      "remove": function() {
        return Selection.clearSelection(window);
      }
    }
  };

  /**
   * Tagr utility methods
   */

  TagrElement.prototype['useWhitespace'] = function(toggle) {
    if (toggle == null) {
      toggle = true;
    }
    if (toggle) {
      return this.style({
        'white-space': ['pre', 'pre-wrap', '-moz-pre-wrap', '-pre-wrap', '-o-pre-wrap'],
        'word-wrap': 'break-word'
      });
    } else {
      return this.style(['white-space', 'word-wrap'], '');
    }
  };

  TagrElement.prototype['setSelectable'] = function(toggle) {
    if (toggle == null) {
      toggle = true;
    }
    return this.style([
      '-webkit-touch-callout', '-webkit-user-select', '-khtml-user-select',
      '-moz-user-select', '-ms-user-select', 'user-select'
    ], toggle ? '' : 'none');
  };

  tagr._setEnvironment = function (win) {
    window = win;
    document = win.document;
    head = document.getElementsByTagName('head')[0];
    body = document.body;
    findBySelector = getQuerySelector();
  }

  return tagr;

})();

// Expose module.

if (typeof module !== 'undefined') {
  module.exports = tagr;
} else {
  this.tagr = tagr;
  if (this.self) {
    tagr._setEnvironment(this.self);
  }
}
