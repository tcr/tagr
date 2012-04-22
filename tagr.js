// Generated by CoffeeScript 1.3.1

/*

Tagr, HTML manipulation for webapps.
*/


(function() {
  var DomMap, EventEmitter, Script, Stylesheet, Tagr, TagrList, TagrQuery, addDomReadyListener, fromCamelCase, getElementUUID, n, tagr, toCamelCase, _fn, _i, _len, _ref,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  fromCamelCase = function() {
    return name.replace(/([A-Z])/g, "-$1").toLowerCase();
  };

  toCamelCase = function() {
    return name.toLowerCase().replace(/\-[a-z]/g, (function(s) {
      return s[1].toUpperCase();
    }));
  };

  EventEmitter = (function() {

    EventEmitter.name = 'EventEmitter';

    function EventEmitter() {}

    EventEmitter.prototype.listeners = function(type) {
      if (this.hasOwnProperty.call((this._events != null ? this._events : this._events = {}), type)) {
        return this._events[type];
      } else {
        return this._events[type] = [];
      }
    };

    EventEmitter.prototype.on = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.addListener.apply(this, args);
    };

    EventEmitter.prototype.once = function(type, f) {
      var g;
      return this.on(type, g = function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        f.apply(this, args);
        return this.removeListener(type, g);
      });
    };

    EventEmitter.prototype.addListener = function(type, f) {
      if ((this.listeners(type).push(f)) > this._maxListeners && this._maxListeners !== 0) {
        if (typeof console !== "undefined" && console !== null) {
          console.warn("Possible EventEmitter memory leak detected. " + this._events[type].length + " listeners added. Use emitter.setMaxListeners() to increase limit.");
        }
      }
      this.emit("newListener", type, f);
      return this;
    };

    EventEmitter.prototype.removeListener = function(type, f) {
      var i;
      if ((i = this.listeners(type).indexOf(f)) !== -1) {
        this.listeners(type).splice(i, 1);
      }
      return this;
    };

    EventEmitter.prototype.removeAllListeners = function(type) {
      var k, v, _ref;
      _ref = this._events || {};
      for (k in _ref) {
        v = _ref[k];
        if (!(type != null) || type === k) {
          v.splice(0, v.length);
        }
      }
      return this;
    };

    EventEmitter.prototype.emit = function() {
      var args, f, type, _i, _len, _ref;
      type = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      _ref = this.listeners(type);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        f = _ref[_i];
        f.apply(this, args);
      }
      return this.listeners(type).length > 0;
    };

    EventEmitter.prototype._maxListeners = 10;

    EventEmitter.prototype.setMaxListeners = function(_maxListeners) {
      this._maxListeners = _maxListeners;
    };

    return EventEmitter;

  })();

  addDomReadyListener = (function() {
    var flush, fn, fns, loaded;
    loaded = /^loade|c/.test(document.readyState);
    fns = [];
    flush = function(f) {
      var _results;
      loaded = true;
      _results = [];
      while (f = fns.shift()) {
        _results.push(f());
      }
      return _results;
    };
    if (document.documentElement.doScroll) {
      document.attachEvent("onreadystatechange", fn = function() {
        if (/^c/.test(document.readyState)) {
          document.detachEvent("onreadystatechange", fn);
          return flush();
        }
      });
      return function(fn) {
        if (self !== top) {
          if (loaded) {
            return fn();
          } else {
            return fns.push(fn);
          }
        } else {
          return (function() {
            try {
              testEl.doScroll("left");
            } catch (e) {
              return setTimeout((function() {
                return ready(fn);
              }), 50);
            }
            return fn();
          })();
        }
      };
    }
    if (document.addEventListener != null) {
      document.addEventListener("DOMContentLoaded", fn = function() {
        document.removeEventListener("DOMContentLoaded", fn, false);
        return flush();
      }, false);
      return function(fn) {
        if (loaded) {
          return fn();
        } else {
          return fns.push(fn);
        }
      };
    }
  })();

  this.Stylesheet = Stylesheet = function(media) {
    var s;
    if (media == null) {
      media = 'all';
    }
    s = document.createElement('style');
    s.type = 'text/css';
    s.media = media;
    document.getElementsByTagName('head')[0].appendChild(s);
    return s;
  };

  this.Script = Script = function() {
    var s;
    s = document.createElement('script');
    s.src = 'about:blank';
    document.getElementsByTagName('head')[0].appendChild(s);
    return s;
  };

  getElementUUID = (function() {
    var uuid;
    uuid = 0;
    return function(elem) {
      var _ref;
      return (_ref = elem.uniqueId) != null ? _ref : (elem.uniqueId = uuid++);
    };
  })();

  DomMap = (function() {
    var isEmptyObject;

    DomMap.name = 'DomMap';

    isEmptyObject = function(obj) {
      var key;
      for (key in obj) {
        return false;
        return true;
      }
    };

    function DomMap() {
      this.cache = {};
    }

    DomMap.prototype.set = function(elem, name, value) {
      var _base, _name, _ref;
      return ((_ref = (_base = this.cache)[_name = getElementUUID(elem)]) != null ? _ref : _base[_name] = {})[name] = value;
    };

    DomMap.prototype.get = function(elem, name) {
      var data;
      if ((data = this.cache[getElementUUID(elem)]) != null) {
        return data[name];
      } else {
        return null;
      }
    };

    DomMap.prototype.remove = function(elem, name) {
      var obj;
      if (obj = this.cache[getElementUUID(elem)]) {
        delete obj[name];
        if (isEmptyObject(obj)) {
          delete this.cache[getElementUUID(elem)];
        }
      }
      return null;
    };

    DomMap.prototype.clean = function(elem) {
      return delete this.cache[getElementUUID(elem)];
    };

    return DomMap;

  })();

  this.tagr = tagr = function() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return tagr.create.apply(tagr, args);
  };

  tagr.IGNORE_ATTRS = ['data-tagr'];

  tagr.ATTR_PROPS = {
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

  tagr.ATTR_WATCH = {
    value: function(t) {
      var update;
      update = function() {
        return t.attrs.value = t._node.value;
      };
      t.on('input', update);
      return t.on('propertychange', function(e) {
        if (e.propertyName === 'value') {
          return update();
        }
      });
    },
    checked: function(t) {
      return t.on('change', function() {
        return t.attrs.checked = t._node.checked;
      });
    }
  };

  tagr.create = function(tag, attrs) {
    var e, k, v;
    if (attrs == null) {
      attrs = {};
    }
    e = document.createElement(tag);
    for (k in attrs) {
      v = attrs[k];
      e.setAttribute(k, v);
    }
    return new Tagr(e);
  };

  tagr.parse = function(str) {
    var arg, args, attrs, e, tag;
    if (typeof str === 'string') {
      return str;
    }
    tag = str[0], attrs = str[1], args = 3 <= str.length ? __slice.call(str, 2) : [];
    e = tagr.create(tag, attrs);
    e.append.apply(e, (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = args.length; _i < _len; _i++) {
        arg = args[_i];
        _results.push(tagr.parse(arg));
      }
      return _results;
    })());
    return e;
  };

  tagr.ready = addDomReadyListener;

  tagr._map = new DomMap();

  tagr.getContext = function(node) {
    var obj;
    if (node.nodeType !== 1) {
      throw new Error('Cannot create Tagr context from non-element');
    }
    if ((obj = tagr._map.get(node, 'tagr')) == null) {
      tagr._map.set(node, 'tagr', (obj = new Tagr(node)));
    }
    return obj;
  };

  tagr.getWrapper = function(node) {
    var obj;
    if (node.nodeType !== 1) {
      throw new Error('Cannot create Tagr context of non-element');
    }
    if ((obj = tagr._map.get(node, 'tagr')) == null) {
      throw new Error('No Tagr wrapper exists for this element.');
    }
    return obj;
  };

  tagr.writeContext = function(tag, attrs) {
    var list;
    if (tag == null) {
      tag = 'div';
    }
    if (attrs == null) {
      attrs = {};
    }
    document.write("<" + tag + "></" + tag + ">");
    list = document.getElementsByTagName('*');
    return tagr.getContext(list[list.length - 1]).setAttrs(attrs);
  };

  tagr.Tagr = Tagr = (function(_super) {

    __extends(Tagr, _super);

    Tagr.name = 'Tagr';

    function Tagr(_node, parent) {
      var attr, c, i, k, v, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _ref3, _ref4;
      this._node = _node;
      this.parent = parent;
      this.tag = this._node.nodeName.toLowerCase();
      this.attrs = {};
      _ref = this._node.attributes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        attr = _ref[_i];
        if (__indexOf.call(tagr.IGNORE_ATTRS, attr) < 0) {
          this.attrs[attr.name] = attr.value;
        }
      }
      _ref1 = tagr.ATTR_WATCH;
      for (k in _ref1) {
        v = _ref1[k];
        if (this._node[(_ref2 = tagr.ATTR_PROPS[k]) != null ? _ref2 : k] != null) {
          v(this);
        }
      }
      this.classes = this._node.className.match(/\S+/g) || [];
      this.style = {};
      _ref3 = this._node.style;
      for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
        k = _ref3[_j];
        this.style[k] = this._node.style[k];
      }
      this.length = this._node.childNodes.length;
      _ref4 = this._node.childNodes;
      for (i = _k = 0, _len2 = _ref4.length; _k < _len2; i = ++_k) {
        c = _ref4[i];
        this[i] = (c.nodeType === 1 ? new Tagr(c, this) : c._nodeValue);
      }
    }

    Tagr.prototype._attach = function(parent) {
      this.parent = parent;
      return tagr._map.set(this._node, 'tagr', this);
    };

    Tagr.prototype._detach = function() {
      this.parent = null;
      return tagr._map.remove(this._node, 'tagr');
    };

    Tagr.prototype._ensureAttrUuid = function() {
      if (!this._node.hasAttribute('data-tagr')) {
        this._node.setAttribute('data-tagr', getElementUUID(this._node));
      }
      return this._node.getAttribute('data-tagr');
    };

    Tagr.prototype.splice = function() {
      var add, c, del, i, j, n, ret, right, _i, _j, _k, _len, _ref, _ref1, _ref2;
      i = arguments[0], del = arguments[1], add = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      if (i < 0 || isNaN(i)) {
        throw 'Invalid index';
      }
      if (del) {
        ret = (function() {
          var _i, _results;
          _results = [];
          for (j = _i = 0; 0 <= del ? _i < del : _i > del; j = 0 <= del ? ++_i : --_i) {
            c = this[i + j];
            this._node.removeChild(this._node.childNodes[i]);
            if (typeof c === 'object') {
              c._detach();
            }
            delete this[i + j];
            _results.push(c);
          }
          return _results;
        }).call(this);
      }
      if (del > add.length) {
        for (j = _i = _ref = i + del, _ref1 = this.length; _ref <= _ref1 ? _i < _ref1 : _i > _ref1; j = _ref <= _ref1 ? ++_i : --_i) {
          this[j - del] = this[j];
        }
      }
      if (add.length > del) {
        for (j = _j = _ref2 = this.length + add.length - 1; _ref2 <= i ? _j < i : _j > i; j = _ref2 <= i ? ++_j : --_j) {
          this[j] = this[j - add.length];
        }
      }
      if (add.length) {
        right = this._node.childNodes[i];
        for (j = _k = 0, _len = add.length; _k < _len; j = ++_k) {
          c = add[j];
          if (typeof c === 'object' && (c != null ? c.constructor : void 0) === Array) {
            c = tagr.parse(c);
            n = c._node;
          } else if (typeof c === 'string') {
            n = document.createTextNode(c);
          } else {
            n = c._node;
          }
          if (n.parentNode) {
            throw new Error('Must remove element before appending elsewhere.');
          }
          this._node.insertBefore(n, right);
          if (typeof c === 'object') {
            c._attach(this);
          }
          this[i + j] = c;
        }
      }
      this.length += (-del) + add.length;
      return ret;
    };

    Tagr.prototype.append = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      this.splice.apply(this, [this.length, 0].concat(__slice.call(args)));
      return this;
    };

    Tagr.prototype.prepend = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      this.splice.apply(this, [0, 0].concat(__slice.call(args)));
      return this;
    };

    Tagr.prototype.remove = function(i) {
      this.splice(i, 1);
      return this;
    };

    Tagr.prototype.insert = function(i, e) {
      this.splice(i, 0, e);
      return this;
    };

    Tagr.prototype.empty = function() {
      this.splice(0, this.length);
      return this;
    };

    Tagr.prototype.appendSelf = function(e) {
      e.append(this);
      return this;
    };

    Tagr.prototype.prependSelf = function(e) {
      e.prepend(this);
      return this;
    };

    Tagr.prototype.removeSelf = function() {
      this.parent.remove(this.parent.indexOf(this));
      return this;
    };

    Tagr.prototype.insertSelf = function(parent, i) {
      parent.insert(i, this);
      return this;
    };

    Tagr.prototype.index = function() {
      return this.parent.indexOf(this);
    };

    Tagr.prototype.select = function(match) {
      return new TagrQuery(this, match);
    };

    Tagr.prototype.find = function(match) {
      return this.select(match).find();
    };

    Tagr.prototype.setAttr = function(name, v) {
      var _ref;
      if (name === 'class') {
        this.classes = v.match(/\S+/g) || [];
      }
      this._node[(_ref = tagr.ATTR_PROPS[name]) != null ? _ref : name] = this.attrs[name] = v;
      return this;
    };

    Tagr.prototype.setAttrs = function(map) {
      var k, v;
      for (k in map) {
        v = map[k];
        this.setAttr(k, v);
      }
      return this;
    };

    Tagr.prototype.setClass = function(name, toggle) {
      var c;
      if (toggle == null) {
        toggle = true;
      }
      if (toggle) {
        if (__indexOf.call(this.classes, name) < 0) {
          this.classes = this.classes.concat([name]);
        }
        this.setAttr('class', this.classes.join(' '));
      } else {
        this.classes = (function() {
          var _i, _len, _ref, _results;
          _ref = this.classes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            c = _ref[_i];
            if (c !== name) {
              _results.push(c);
            }
          }
          return _results;
        }).call(this);
        this.setAttr('class', this.classes.join(' '));
      }
      return this;
    };

    Tagr.prototype.setClasses = function(map) {
      var k, v;
      for (k in map) {
        v = map[k];
        this.setClass(k, v);
      }
      return this;
    };

    Tagr.prototype.setStyle = function(k, v) {
      var val, _i, _len, _ref;
      if (v == null) {
        throw new Exception('setStyle must be called with a value. Call using an empty string.');
      }
      _ref = (typeof v === 'object' ? v : [v]);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        val = _ref[_i];
        this.style[k] = this._node.style[k] = val;
      }
      return this;
    };

    Tagr.prototype.setStyles = function(map) {
      var k, v;
      for (k in map) {
        v = map[k];
        this.setStyle(k, v);
      }
      return this;
    };

    Tagr.prototype.addListener = function(type, f) {
      var _base, _base1,
        _this = this;
      if (typeof (_base = this._node).addEventListener === "function") {
        _base.addEventListener(type, (function(e) {
          return _this.emit(type, e);
        }), false);
      }
      if (typeof (_base1 = this._node).attachEvent === "function") {
        _base1.attachEvent('on' + type((function() {
          return _this.emit(type, window.event);
        })));
      }
      return Tagr.__super__.addListener.call(this, type, f);
    };

    Tagr.prototype.toJSON = function() {
      var x;
      return [this.tag, this.attrs].concat(__slice.call((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = this.length; _i < _len; _i++) {
            x = this[_i];
            _results.push(typeof x === 'string' ? x : x.toJSON());
          }
          return _results;
        }).call(this)));
    };

    Tagr.prototype.useWhitespace = function(toggle) {
      if (toggle == null) {
        toggle = true;
      }
      if (toggle) {
        return this.setStyles({
          'white-space': ['pre', 'pre-wrap', '-moz-pre-wrap', '-pre-wrap', '-o-pre-wrap'],
          'word-wrap': 'break-word'
        });
      } else {
        return this.setStyles({
          'white-space': '',
          'word-wrap': ''
        });
      }
    };

    Tagr.prototype.setSelectable = function(toggle) {
      var val;
      if (toggle == null) {
        toggle = true;
      }
      val = toggle ? '' : 'none';
      return this.setStyles({
        '-webkit-touch-callout': val,
        '-webkit-user-select': val,
        '-khtml-user-select': val,
        '-moz-user-select': val,
        '-ms-user-select': val,
        'user-select': val
      });
    };

    return Tagr;

  })(EventEmitter);

  _ref = ['forEach', 'slice', 'map', 'indexOf'];
  _fn = function(n) {
    return Tagr.prototype[n] = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return Array.prototype[n].apply(this, args);
    };
  };
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    n = _ref[_i];
    _fn(n);
  }

  tagr.TagrQuery = TagrQuery = (function(_super) {
    var getStylesheet, sCache;

    __extends(TagrQuery, _super);

    TagrQuery.name = 'TagrQuery';

    sCache = {};

    getStylesheet = function(media) {
      var s;
      if (media == null) {
        media = 'all';
      }
      if (sCache[media] != null) {
        return sCache[media];
      }
      s = new Stylesheet(media);
      return sCache[media] = s.sheet || s.styleSheet;
    };

    function TagrQuery(ctx, match) {
      this.ctx = ctx;
      this.match = match;
    }

    TagrQuery.prototype.find = function() {
      var el, _j, _len1, _ref1, _results;
      _ref1 = Sizzle(match, this.ctx._node);
      _results = [];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        el = _ref1[_j];
        _results.push(new Tagr(el));
      }
      return _results;
    };

    TagrQuery.prototype.addListener = function(type, f) {
      var _this = this;
      this.ctx._node.addEventListener(type, (function(e) {
        var matches, _results;
        matches = Sizzle("" + _this.match, _this.ctx._node);
        n = e.target;
        _results = [];
        while (n !== _this.ctx._node && n) {
          if (__indexOf.call(matches, n) >= 0) {
            f.call(tagr.getWrapper(n), e);
          }
          _results.push(n = n.parentNode);
        }
        return _results;
      }), false);
      return TagrQuery.__super__.addListener.call(this, type, f);
    };

    TagrQuery.prototype.setStyle = function(k, v) {
      var s, selector;
      if (!v) {
        throw new Exception('setStyle must be called with a value.');
      }
      selector = "[data-tagr='" + (this.ctx._ensureAttrUuid()) + "'] " + this.match;
      s = getStylesheet();
      s.insertRule("" + selector + " { " + k + ": " + v + " }", s.cssRules.length);
      return this;
    };

    TagrQuery.prototype.setStyles = function(map) {
      var k, v;
      for (k in map) {
        v = map[k];
        this.setStyle(k, v);
      }
      return this;
    };

    return TagrQuery;

  })(EventEmitter);

  tagr.TagrList = TagrList = (function() {

    TagrList.name = 'TagrList';

    function TagrList() {
      var args, i, _j, _len1;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      this.length = args.length;
      for (_j = 0, _len1 = args.length; _j < _len1; _j++) {
        i = args[_j];
        this[i] = args[i];
      }
    }

    TagrList.prototype.setAttr = function() {
      var args, t, _j, _len1, _results;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      _results = [];
      for (_j = 0, _len1 = this.length; _j < _len1; _j++) {
        t = this[_j];
        _results.push(t.setAttr.apply(t, args));
      }
      return _results;
    };

    TagrList.prototype.setAttrs = function() {
      var args, t, _j, _len1, _results;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      _results = [];
      for (_j = 0, _len1 = this.length; _j < _len1; _j++) {
        t = this[_j];
        _results.push(t.setAttrs.apply(t, args));
      }
      return _results;
    };

    TagrList.prototype.setStyle = function() {
      var args, t, _j, _len1, _results;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      _results = [];
      for (_j = 0, _len1 = this.length; _j < _len1; _j++) {
        t = this[_j];
        _results.push(t.setStyle.apply(t, args));
      }
      return _results;
    };

    TagrList.prototype.setStyles = function() {
      var args, t, _j, _len1, _results;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      _results = [];
      for (_j = 0, _len1 = this.length; _j < _len1; _j++) {
        t = this[_j];
        _results.push(t.setStyles.apply(t, args));
      }
      return _results;
    };

    return TagrList;

  })();

  tagr.list = function() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args), t = typeof result;
      return t == "object" || t == "function" ? result || child : child;
    })(TagrList, args, function(){});
  };

  tagr.view = {
    getBox: function(t) {
      return t._node.getBoundingClientRect();
    },
    getStyle: function(t, name) {
      var computedStyle, left, rsLeft, val, _ref1, _ref2, _ref3;
      if (window.getComputedStyle) {
        computedStyle = t._node.ownerDocument.defaultView.getComputedStyle(t._node, null);
        val = computedStyle != null ? computedStyle.getPropertyValue(name) : void 0;
        return (name === "opacity" && val === "" ? "1" : val);
      } else if (t._node.currentStyle) {
        val = (_ref1 = t._node.currentStyle[name]) != null ? _ref1 : t._node.currentStyle[toCamelCase(name)];
        if (!/^\d+(?:px)?$/i.test(ret) && /^\d/.test(ret)) {
          _ref2 = [t._node.style.left, t._node.runtimeStyle.left], left = _ref2[0], rsLeft = _ref2[1];
          t._node.runtimeStyle.left = t._node.currentStyle.left;
          t._node.style.left = (name === "font-size" ? "1em" : val || 0);
          val = t._node.style.pixelLeft + "px";
          _ref3 = [left, rsLeft], t._node.style.left = _ref3[0], t._node.runtimeStyle.left = _ref3[1];
        }
        return val;
      }
    }
  };

  Tagr.prototype.getSize = function(i) {
    var j, o, _j, _ref1;
    if (typeof this[i] === 'string') {
      return this[i].length;
    } else {
      o = 2;
      for (j = _j = 0, _ref1 = this[i].length; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; j = 0 <= _ref1 ? ++_j : --_j) {
        o += this[i].getSize(j);
      }
      return o;
    }
  };

  Tagr.prototype.getOffset = function() {
    var i, o, p;
    p = this.parent;
    i = this.index();
    o = 0;
    while (true) {
      while (i >= 0) {
        o += p.getSize(i);
        i--;
      }
      if (p.parent == null) {
        break;
      }
      i = p.index();
      p = p.parent;
    }
    return o;
  };

}).call(this);
