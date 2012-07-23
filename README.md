# tagr

*Sane HTML manipulation for web apps.*

The DOM is a messy place. Tagr is a clean interface to markup: its concise API is broken down into elements, strings, events, styles, and properties. Tagr is not a replacement for jQuery or "expressive" HTML libraries, nor does it polyfill prefixed CSS properties or HTML5 support. It is instead a solid foundation for manipulating HTML with a consistent, simple API, on which other tools can be built.

Like a `<canvas>` context, tagr lets you create an HTML context where all styles and events are relative and sandboxed. Tagr can be built procedurally, with JSON, or HTML. You can even construct entire widgets on the server and send them to the client, serializing them as HTML to take advantage of fast parsing times.

Tagr is a small library, minified (15kb) and gzipped (5kb). Supports IE6+, Firefox 3.5+, Chrome, Safari, and Opera.

## Works well with...

* [Sizzle](https://github.com/jquery/sizzle) &mdash; Including this runs CSS queries through the Sizzle engine rather than the browser's built-in engine.
* [selection.js](https://github.com/timcameronryan/selection.js) &mdash; Including this enables the Selection API.
* [store.js](https://github.com/marcuswestin/store.js) by marcuswestin &mdash; Easy client-side storage. 

### Getting started

Elements are instantiated by `tagr.create()`, and text are simple strings.

    > var div = tagr.create('div.alert');
    > div.push('Hello world!')
    > div.toHTML()
    
    <div class="alert">Hello world!</div>

You can manipulate or index children like an array:

    > div[0]
    
    "Hello world!"
    
    > div.splice(0, 1, 'Such ', tagr.create('b', {}, 'bold'), ' moves!')
    > div.toJSON()
    
    ['div', {}, 'Such ', ['b', {}, 'bold'], ' moves!']

## API Reference

### `tagr` module

* **tagr.create([_tag_[, _properties_[, _children..._]]) returns TagrElement**  

  Create a new `TagrElement` with the given tag and properties, and optionally children.

* **tagr.parse(_json_) returns TagrElement**  

  Parses a JSON structure or HTML string into a `TagrElement`.

* **tagr.getContext(_node_) returns TagrElement**  

  Get a Tagr context for the given node.

* **tagr.writeContext(_tag_[, _properties_]) returns TagrElement**  

  `document.write` a `TagrElement` and immediately return it. Useful for self-contained scripts.

* **tagr.ready(_callback_)**  

  Trigger the given callback once the DOM is (or has already) finished loading.

### `TagrElement` object

* **el.get(_key_)**  
  **el.set(_key_, _value_ | _properties_) returns `el`**  
  **el.remove(_key_)**  
  **el.call(_key_, _arguments..._)**  
  **el.properties() returns `map`**  

  Manipulate the properties of the lement.

* **el.style(_key_, _value_ | _styles_) returns `el`**  
  **el.addRule(_key_, _value_)**  
  **el.removeRule(_key_)**  
  **el.rules() returns `map`**  

  Manipulate element styles.

* **el.classList.contains(_key_)**  
  **el.classList.add(_key_)**  
  **el.classList.remove(_key_)**  
  **el.classList.toggle(_key_)**  

  Manipulate element classes.

* **el.on(_type_, _callback_) returns `el`**  
  **el.once(_type_, _callback_) returns `el`**  
  **el.addListener(_type_, _callback_) returns `el`**  
  **el.removeListener(_type_)**  
  **el.listeners([_type_])**  
  **el.removeAllListeners()**  
  **el.emit(_type_, _args..._)**  
  **el.setMaxListeners(_count_)**  

  Manipulates element events.

* **el.splice(_index_, _deleteCount_, _insert_...)**  
  **el.push(_children..._)**  
  **el.pop() returns `object`**  
  **el.unshift(_children..._)**  
  **el.shift() returns `object`**  
  **el.indexOf(_child_)**  
  **el.length**  
  **el[0...length]**  

  Array-like manipulation. Where available, tagr will also use Array methods for `slice`, `sort`, `reverse`, `forEach`, `map`, `every`, `lastIndexOf`, `filter`, `some`, `reduce`, `reduceRight`.

  **el.insert(_index_, _children..._)**  
  **el.remove(_index_)**  
  **el.removeAll()**  

* **el.insertSelf(_parent_, _index_)**  
  **el.removeSelf()**  
  **el.index(_parent_)**  

  Convenience methods for elements to act on their parents.

* **el.insertSelf(_parent_, _index_)**  
  **el.removeSelf()**  
  **el.index(_parent_)**  

  Convenience methods for elements to act on their parents.

* **el.spliceText(_index_, _spliceIndex_, _deleteCount_, _insertString_)**  
  **el.splitText(_index_, _splitIndex_)**  

  Methods for a parent to manipulate string children.

* **el.query(_selector_) returns TagrQuery**  

  Returns a query relative to this element matching `selector`.

  **el.find(_selector_) returns TagrElement**  
  **el.findAll(_selector_) returns [TagrElement]**  

  Returns the first or an array of elements currently matched by `selector` relative to this element. Shorthand for `el.select(selector).find[All]()`.

* **el.persist(_name_)**  
  **el.stopPersisting(_name_)**  

  Instruct the element whether or not to persist certain properties when it is serialized. By default, custom properties are not persisted.

* **el.toJSON() returns Object**  
  **el.toHTML() returns String**  

  Serializes the element. Can be rebuilt into a duplicate tree using `tagr.parse()`, sans the event handlers.

* **el.useWhitespace(_toggle = true_)**  
  **el.setSelectable(_toggle = true_)**  

  Convenience methods to enable significant whitespace and disable selectability via CSS.

### `TagrQuery` object

* **query.base**  

  The Element context for this TagrQuery.

* **query.on(_event_, _callback_) returns `query`**  
  **(other EventEmitter methods)**  

  Manipulates event handlers for elements matching this query.

* **query.style(_key_, _value_ | _styles_) returns `query`**  
  **query.addRule(_key_, _value_)**  
  **query.removeRule(_key_)**  
  **query.addRule(_key_, _value_)**  

  Manipulates styles for this selector.

* **query.find() returns TagrElement**  
  **query.findAll() returns [TagrElement]**  

  Return the first or an array of all elements currently matched by this selector.

### `tagr.view` module

* **tagr.view.getBox(_element_[, _relativeTo_]) returns Rectangle**  

  Get the bounding box of the element, with properties `width`, `height`, `top`, `right`, `bottom`, `left`. If an element is provided for `relativeTo`, these coordinates are relative to this other element.

* **tagr.view.getStyle(_element_, _key_)**  

  Gets the computed CSS value for `key` of `element`.

* **tagr.view.selection.has(_window_)**  
  **tagr.view.selection.getOrigin(_window_)**  
  **tagr.view.selection.getFocus(_window_)**  
  **tagr.view.selection.getStart(_window_)**  
  **tagr.view.selection.getEnd(_window_)**  
  **tagr.view.selection.set(_window_, _origin_, _focus_)**  

  Manipulates the window selection when `selection.js` is included.

## License

MIT.