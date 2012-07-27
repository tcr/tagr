# tagr

*Solid HTML manipulation for web apps.*

The DOM is a messy place. Tagr is a concise interface to the DOM: work with only elements and strings, and manipulate their events, styles, and properties. Tagr is not a "rapid" web development library, but instead a solid foundation for manipulating HTML with a consistent API on which other tools can be built.

Tagr's biggest advantage is portability: Like a `<canvas>` context, tagr creates HTML context where all styles and events are relative and sandboxed. Documents can be built procedurally, or built with JSON or HTML. You can even construct entire widgets on the server and send them to the client, serializing them as HTML to take advantage of fast parsing times.

Tagr is a small library, minified (15kb) and gzipped (5kb). Supports IE6+, Firefox 3.5+, Chrome, Safari, and Opera.

## Works well with...

* [Sizzle](https://github.com/jquery/sizzle) &mdash; Including this adds support for complex CSS3 queries using the Sizzle engine.
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

Attach elements to a document by creating a context, from an existing element or writing one directly:

    > tagr.getContext(document.body)
    > tagr.writeContext('div#contents', {}, 'Great for inline widgets!')

## API Reference

### `tagr` module

You can create elements with the method `tagr.create()`, or parse a JSON tree or HTML with `tagr.parse()` to return a `TagrElement`.

* **tagr.create([_tag_[, _properties_[, _children..._]]) returns TagrElement** &mdash; Create a new `TagrElement` with the given tag and properties, and optionally children.
* **tagr.parse(_json_) returns TagrElement** &mdash; Parses a JSON structure or HTML string into a `TagrElement`.

Your entry point to the DOM is a Tagr "context". The DOM inside a context is mirrored by Tagr and must only be modified with Tagr commands. You can either load an existing element and its children, or write one into the DOM directly:

* **tagr.getContext(_node_) returns TagrElement** &mdash; Get a Tagr context for the given DOM node.
* **tagr.writeContext(_tag_[, _properties_[, children...]]) returns TagrElement** &mdash; `document.write` a `TagrElement` and immediately return it. Useful for self-contained scripts.

And the obligatory DOMContentLoaded polyfill:

* **tagr.ready(_callback_)** &mdash; Trigger the given callback once the DOM is (or has already) finished loading.

### `TagrElement` class

A Tagr element object can be created using `tagr.create()` or parsing JSON or HTML using `tagr.parse()`. It has the following read-only properties:

* **el.tag**
* **el.id**
* **el.parent**

Tagr includes a `classList` property, similar to the DOM property, which lets you add or remove classes easily.

* **el.classList.contains(_key_)**  
* **el.classList.add(_key_)**  
* **el.classList.remove(_key_)**  
* **el.classList.toggle(_key_)**  

#### Element properties

Tagr supports modifying built-in DOM properties using `.get(key)` and `.set(key, value)` methods, similar to the Backbone.js API. 

* **el.get(_key_)**  
* **el.set(_key_, _value_ | _properties_) returns `el`**  
* **el.remove(_key_)**  
* **el.call(_key_, _arguments..._)**  
* **el.properties() returns `map`**  

When a property is set on an element, a `change:[property name]` event is emitted on the element. This includes when the user modifies an input field, so `.on('change:value', function () { ... })` works as advertised for inputs and textareas!

Only properties and attributes that are unique to an element are exposed. For instance, you can modify the `href` of a link or the `currentTime` of a video, but `parentNode` and other DOM manipulation methods are not exposed. In this way, you can leverage the HTML JavaScript API without inadvertantly modifying the DOM.

Custom properties are allowed on elements, and provide a powerful way to create widgets:

    > ctx.query('.progress').on('change:level', function () { /* set progress bar level */ })
    > var prog = tagr.create('.progress', {level: 50})
    > prog.set('level', 75) // etc

Custom properties are kept separate from built-in HTML attributes, and are serialized as `data-*` attributes to HTML and JSON. See **Serialization** below.

#### Element styles

You can manipulate an element's styles and individual style rules simply:

* **el.style(_key_, _value_ | _styles_) returns `el`**  
* **el.addRule(_key_, _value_)**  
* **el.removeRule(_key_)**  
* **el.rules() returns `map`**  

#### Element events

Tagr elements support the familiar [EventEmitter](http://nodejs.org/api/events.html) API from Node.js. All listeners are attached to the DOM element themselves:

* **el.on(_type_, _callback_) returns `el`**  
* **el.once(_type_, _callback_) returns `el`**  
* **el.addListener(_type_, _callback_) returns `el`**  
* **el.removeListener(_type_)**  
* **el.listeners([_type_])**  
* **el.removeAllListeners()**  
* **el.emit(_type_, _args..._)**  
* **el.setMaxListeners(_count_)**  

Note that Tagr does not have a mechanism to propagate an event to itself and its ancestors. (It probably should.)
  
#### Element children

Tagr elements act like arrays, and inherit the array prototype. You can iterate over them by index, though array access is read-only:

* **el.length**  
* **el[0...length]**

Tagr elements implement array methods to manipulate and all elements and text in place. You can pass in other tagr elements or raw strings as children:
  
* **el.push(_children..._)**  
* **el.pop() returns `object`**  
* **el.unshift(_children..._)**  
* **el.shift() returns `object`**  
* **el.splice(_index_, _deleteCount_, _insert_...)**
* **el.sort([_compare_])**
* **el.reverse()**

In addition, Tagr provides all ES5 array utility methods and supports `slice`, `sort`, `reverse`, `indexOf`, `forEach`, `map`, `every`, `lastIndexOf`, `filter`, `some`, `reduce`, and `reduceRight`. Note that arrays returned by these methods are not instances of `TagrElement`.

Tagr provides its own chainable methods to manipulate an element's children in-place:
  
* **el.insert(_index_, _children..._)** returns `el` &mdash; Inserts the children at the given index. The index can be negative; -1 inserts at the end of the array.
* **el.remove(_index_[, _count_])** returns `el` &mdash; Removes children at the given index. The index can be negative; -1 removes from the end of the array.
* **el.children(_children...)** returns `el` &mdash; Overwrites all children with the given list.

As well as methods to manipulate a child itself:

* **el.insertSelf(_parent_, _index_)** returns `el`
* **el.removeSelf()**   returns `el`
* **el.indexOfSelf()**   returns `el`

Since text nodes are represented in Tagr as regular strings, Tagr elements provide methods to split or splice text directly:

* **el.spliceText(_index_, _spliceIndex_, _deleteCount_, _insertString_)**  
* **el.splitText(_index_, _splitIndex_)**  

#### Relative queries

A `TagrQuery` can be generated relative to any Tagr element:

* **el.query(_selector_) returns TagrQuery**  

See the API for **`TagrQuery`** below. As an additional shorthand on elements, you can directly request the first or an array of elements matching a query selector.

* **el.find(_selector_) returns TagrElement** &mdash; Shorthand for `el.select(selector).findAll()`.
* **el.findAll(_selector_) returns [TagrElement]** &mdash; Shorthand for `el.select(selector).findAll()`.

#### Serialization

A `TagrElement` can be serialized to valid JSON or HTML. (The preferred serialization format is JSON.) Either format can be reconstructed as a tree using `tagr.parse()`.

* **el.toJSON() returns Object** &mdash; Returns a [JSONML](http://www.jsonml.org/) formatted tree. 
* **el.toHTML() returns String** 

By default, properties are not persisted as JSON or HTML unless they are built-in element attributes (like `value`, `src`, `rowspan`, etc.) You can define that custom attributes be persisted or HTML elements should not be persisted by specifying them manually:

* **el.persist(_name_)**  
* **el.stopPersisting(_name_)**  

If a custom property is persisted, it is serialized to JSON and set as a data attribute (prefixed with `data-`). These attributes are properly read by `tagr.parse()` and the data- prefix is removed.

#### Convenience

Tagr is for web apps, so a few convenience functions are included to get you started:

* **el.useWhitespace(_toggle = true_)** &mdash; Sets that whitespace should be significant. Since you aren't dealing with a markup language, you can have your non-breaking cake and eat it, too.
* **el.setSelectable(_toggle = true_)** &mdash; Sets that element text should not be selectable by the cursor.

### `TagrQuery` class

A Tagr query encapsulates a base element and a selector to match elements below it. A query can be created using `TagrElement::query()`, and the query contains a reference to the base element:

* **query.base** &mdash; The Element context for this TagrQuery.

Many of the same actions you can perform on a `TagrElement` can be done for a dynamic query. You can listen for and emit events, or create styles and rules:

    > ctx.query('.tooltip').on('mouseover', function () { /* display tooltip */ })
    > ctx.query('.btn').style({'background': 'blue'})

Additionally, at any point you can return a static array of elements which match the query at the time it was invoked:

* **query.find() returns TagrElement**  
* **query.findAll() returns [TagrElement]**

### `tagr.view` namespace

_(This is a work in progress.)_

* **tagr.view.getBox(_element_[, _relativeTo_]) returns Rectangle** &mdash; Get the bounding box of the element, with properties `width`, `height`, `top`, `right`, `bottom`, `left`. If an element is provided for `relativeTo`, these coordinates are relative to this other element.
* **tagr.view.getStyle(_element_, _key_)**  &mdash; Gets the computed CSS value for `key` of `element`.

The selection API is available when [selection.js](http://github.com/timcameronryan/selection.js) is included. All elements are TagrElements:

* **tagr.view.selection.has(_window_)**  
* **tagr.view.selection.getOrigin(_window_)**  
* **tagr.view.selection.getFocus(_window_)**  
* **tagr.view.selection.getStart(_window_)**  
* **tagr.view.selection.getEnd(_window_)**  
* **tagr.view.selection.set(_window_, _origin_, _focus_)**

## License

MIT.