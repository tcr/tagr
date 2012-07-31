/**
 * @license Tagr, Solid HTML manipulation for webapps. MIT Licensed.
 */

/**
 * EventEmitter implementation
 * http://nodejs.org/api/events.html
 */

if (typeof EventEmitter === 'undefined' && typeof module === 'undefined') {
  function EventEmitter () { }

  EventEmitter.prototype['listeners'] = function (type) {
    this._events = (this._events || {});
    if (hasOwnProperty(this._events, type)) {
      return this._events[type];
    } else {
      return this._events[type] = [];
    }
  };

  EventEmitter.prototype['on'] = function () {
    return this.addListener.apply(this, arguments);
  };

  EventEmitter.prototype['once'] = function (type, f) {
    var g = function() {
      f.apply(this, arguments);
      return this.removeListener(type, g);
    };
    return this.on(type, g);
  };

  EventEmitter.prototype['addListener'] = function(type, f) {
    if ((this.listeners(type).push(f)) > this._maxListeners && this._maxListeners !== 0) {
      if (typeof console !== "undefined") {
        console.warn("Possible EventEmitter memory leak detected. " + this._events[type].length + " listeners added. Use emitter.setMaxListeners() to increase limit.");
      }
    }
    this.emit("newListener", type, f);
    return this;
  };

  EventEmitter.prototype['removeListener'] = function (type, f) {
    var i = this.listeners(type).indexOf(f);
    if (i !== -1) {
      this.listeners(type).splice(i, 1);
    }
    return this;
  };

  EventEmitter.prototype['removeAllListeners'] = function (type) {
    var k, v, events = this._events || {};
    for (k in events) {
      v = events[k];
      if (type == null || type === k) {
        v.splice(0, v.length);
      }
    }
    return this;
  };

  EventEmitter.prototype['emit'] = function (type) {
    for (var i = 0, listeners = this.listeners(type); i < listeners.length; i++) {
      listeners[i].apply(this, slice(arguments, 1));
    }
    return this.listeners(type).length > 0;
  };

  EventEmitter.prototype['_maxListeners'] = 10;

  EventEmitter.prototype['setMaxListeners'] = function (_maxListeners) {
    this._maxListeners = _maxListeners;
  };
  
} else {
  // Node.js import.
  var EventEmitter = require('events').EventEmitter;
}

/**
 * Tagr code
 */

var tagr = (function () {

  var isBrowser = typeof document !== 'undefined';

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
    return str.replace(/^\s+|\s+$/g, '');
  };

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
      if (typeof k === 'object') {
        for (var mk in k) {
          fn.call(this, mk, k[mk]);
        }
        return this;
      }
      return fn.call(this, k, v);
    };
  };
  
  function expandKeys (fn) {
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

  function expandValues (fn) {
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
          if (!ret.props.classes) {
            ret.props.classes = '';
          }
          ret.props.classes += ' ' + chunks[i].substr(1);
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
      that.push.apply(that, value.length ? trim(value).split(/\s+/) : []);
    });
  }

  extend(TagrClassList, []);

  TagrClassList.prototype['item'] = function (i) {
    return this[i] || null;
  };

  TagrClassList.prototype['contains'] = function (token) {
    return indexOf(this, String(token)) !== -1;
  };

  TagrClassList.prototype['add'] = function (token) {
    if (!this.contains(token)) {
      this.el.set('class', this.concat([token]).join(' '));
    }
  };

  TagrClassList.prototype['remove'] = function (token) {
    var ret = [];
    for (var i = 0; i < this.length; i++) {
      if (this[i] != String(token)) {
        ret.push(this[i]);
      }
    }
    this.el.set('class', ret.join(' '));
  };

  TagrClassList.prototype['toggle'] = function (token) {
    if (this.contains(String(token))) {
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

  TagrElement.prototype['remove'] = function (key) {
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

  TagrElement.prototype['insert'] = chainable(function (i, args) {
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

  TagrElement.prototype['style'] = chainable(mappable(expandKeys(expandValues(function (k, v) {
    this.addRule(k, v);
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
    return new tagr['TagrQuery'](this, match);
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

  /**
   * class TagrQuery
   */

  // A dynamic query matching a CSS selector. Listeners and styles can be
  // set to the dynamic list, or we can .find() the current list of
  // matches.

  var TagrQuery = function TagrQuery () {
  };

  /**
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

  var getElementUniqueId = (function() {
    var uuid = 1;
    return function(elem) {
      return elem.uniqueId || (elem.uniqueId = uuid++);
    };
  })();

  // DOM arbitrary value binding.
  // Nodes must be removed manually, as this does not garbage collect.

  var DOMMap = {
    _cache: {},
    set: function (elem, value) {
      return DOMMap._cache[getElementUniqueId(elem)] = value;
    },
    get: function (elem) {
      return DOMMap._cache[getElementUniqueId(elem)];
    },
    remove: function (elem) {
      return delete DOMMap._cache[getElementUniqueId(elem)];
    }
  };

  // DOM TagrElement implementation.

  var DOMTagrElement = function (node) {
    this._node = node;
    TagrElement.call(this, node.tagName.toLowerCase());
  };

  inherits(DOMTagrElement, TagrElement.prototype);

  // Associate TagrElement object with its DOM node.
  // We only need this association for querying, and thus, only when
  // elements are attached to the document.

  DOMTagrElement.prototype._attach = function(parent) {
    this.parent = parent;
    return tagr._map.set(this._node, this);
  };

  DOMTagrElement.prototype._detach = function() {
    delete this.parent;
    return tagr._map.remove(this._node);
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

  DOMTagrElement.prototype["get"] = function (k) {
    return (HTML_DOM_PROPS[k] || k) in this._node
      ? this._node[HTML_DOM_PROPS[k] || k]
      : this._props[k];
  };

  DOMTagrElement.prototype["set"] = chainable(mappable(expandKeys(expandValues(function(key, value) {
    this.emit('change:' + key, value);
    (HTML_DOM_PROPS[key] || key) in this._node
      ? this._node[HTML_DOM_PROPS[key] || key] = value
      : this._props[key] = value;
  }))));

  DOMTagrElement.prototype["remove"] = function (key) {
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
    }
    var right = parent.childNodes[i];
    for (var j = 0; j < arguments.length - 2; j++) {
      var arg = arguments[j + 2], node;
      if (typeof arguments[j + 2] == 'string') {
        node = document.createTextNode(arg);
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
    return Array.prototype.slice.apply(this, arguments);
  };

  TagrElement.prototype['push'] = function () {
    return this.insert.apply(this, [this.length].concat(slice(arguments)));
  };

  TagrElement.prototype['pop'] = function () {
    return this.remove(this.length - 1);
  };

  TagrElement.prototype['unshift'] = function () {
    return this.insert.apply(this, [0].concat(arguments));
  };

  TagrElement.prototype['shift'] = function () {
    return this.remove(0);
  };

  TagrElement.prototype['sort'] = function () {
    // TODO
  };

  TagrElement.prototype['reverse'] = function () {
    // TODO
  };

  // Text Manipulation.

  TagrElement.prototype['spliceText'] = function (c, i, del, add) {
    this._node.childNodes[c].replaceData(i, del, add || '');
    return TagrElement.prototype['spliceText'].apply(this, arguments);
  };

  TagrElement.prototype['splitText'] = function (c, i) {
    this._node.childNodes[c].splitText(i);
    return TagrElement.prototype['splitText'].apply(this, arguments);
  };

  // Serialization.

  // TODO support data-* attributes
  DOMTagrElement.prototype["toHTML"] = function () {
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
   * TagrQuery
   */

  // A dynamic query matching a CSS selector. Listeners and styles can be
  // set to the dynamic list, or we can .find() the current list of
  // matches.

  var TagrQuery = (function () {

    var sCache = {};
    function getStylesheet (media) {
      media = media || 'all';
      if (sCache[media] == null) {
        sCache[media] = new Stylesheet(media);
      }
      return sCache[media];
    };

    function TagrQuery (ctx, selector) {
      this.base = this.ctx = ctx;
      this.selector = selector;
    }

    extend(TagrQuery, EventEmitter.prototype);

    TagrQuery.prototype['style'] = chainable(mappable(expandKeys(expandValues(function(k, v) {
      var s = getStylesheet();
      if (s.insertRule != null) {
        s.insertRule("." + (this.ctx._ensureUuidClass()) + " " + this.selector + " { " + k + ": " + v + " }", s.cssRules.length);
      } else {
        s.addRule("." + (this.ctx._ensureUuidClass()) + " " + this.selector, "" + k + ": " + v);
      }
      return this;
    }))));

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

  function ElementAnchor (par, i) {
    this.par = par;
    this.i = i;
  }

  ElementAnchor.prototype.toAnchor = function() {
    return [this.par._node, this.i];
  };

  function TextAnchor (par, child, i) {
    this.par = par;
    this.child = child;
    this.i = i;
  }

  TextAnchor.prototype.toAnchor = function() {
    return [this.par._node.childNodes[this.child], this.i];
  };

  /**
   * Tagr view
   */

  convertAnchor = function(arg) {
    var node = arg[0], offset = arg[1], el;
    if (node.nodeType === 1) {
      if (!(el = tagr._getWrapper(node))) {
        return;
      }
      return new ElementAnchor(el, offset);
    } else {
      if (!(el = tagr._getWrapper(node.parentNode))) {
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

  // Creates a view object, which exposes aspects of how the DOM is being 
  // rendered or the user is interacting with the DOM.

  function createView (win) {
    win = win || window;

    return {
      'getBox': function (el, ctx) {
        var box = el._node.getBoundingClientRect();
        if (ctx != null) {
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
        "remove": function () {
          return Selection.clearSelection(win);
        }
      }
    }
  }

  /**
   * module tagr
   */

  // Default namespace.
  var tagr = {
    'TagrElement': TagrElement,
    'TagrQuery': TagrQuery,
    'ElementAnchor': ElementAnchor,
    'TextAnchor': TextAnchor,
    'view': createView
  };

  // tagr.create(...) is the public method to create new TagrElements.
  tagr['create'] = function (simple) {
    var sel = parseSimpleSelector(simple || '');
    var props = isBareObject(arguments[1]) ? arguments[1] : {};
    var children = slice(arguments, isBareObject(arguments[1]) ? 2 : 1);

    return new TagrElement(sel.tag)
      .set(props).set(sel.props)
      .children(children);
  }

  // Parse a JSON tree into a map of Tagrelements.
  tagr['parse'] = function (format) {
    if (typeof format == 'string') {
      // Parse HTML.
      // aaaaaaand.... TODO

    } else {
      // Parse JSON. Mostly, pass arguments to tagr.create();
      var props = isBareObject(format[1]) ? format[1] : {};
      var children = format.slice(isBareObject(format[1]) ? 2 : 1);
      for (var i = 0; i < children.length; i++) {
        if (isArray(children[i])) {
          children[i] = tagr['parse'](children[i]);
        }
      }
      return tagr['create'](format[0], props)['children'](children);
    }
  };

  return tagr;

})();

console.log(tagr.create('div', 'Hey mom!', tagr.create('b', 'Bold text.')));