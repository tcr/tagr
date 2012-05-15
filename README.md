# tagr

*HTML manipulation for web apps.*

Tagr is a clean interface to the DOM. To complement your `<canvas>` context,
create an HTML context. Never construct anything but tags and strings, and never
have to mix and match CSS selectors to target your elements.

Combine Tagr with networking libraries like Now.js, and you can compose entire widgets on the server--
styles, event handlers, and markup--and run them on the client. Tagr
serializes to HTML and CSS, so you get fast rendering times, with the
flexibility of Tagr's simple and extensible API.

Tagr is a small library, minified (10kb) and gzipped (<4kb). Supports IE6+, Firefox 3.5+, Chrome, Safari, and Opera.

## What it does

Tagr ensures you're never interact with the DOM directly. Instead, work with
JSON, define your own relative stylesheets and events, and build up widgets
to use in your application.

## Reference

### `tagr` module

* #### tagr([*tag*[, *props*])

  Create a new `TagrElement` with the given tag and properties.

  #### tagr.parse(*json*) returns TagrElement

  Parse a JSON structure into a tree of `TagrElement`s.

* #### tagr.getContext(*node*) returns TagrElement

  Get a Tagr context for the given node.

  #### tagr.writeContext(*tag*[, *props*]) returns TagrElement

  `document.write` a `TagrElement` and immediately return it. Useful for self-contained script widgets.

* #### tagr.ready(*callback*)

  Trigger the given callback once the DOM is (or has already) finished loading.

### `TagrElement` object

* #### el.get(*key*)
  #### el.set(*key*, *value*) returns `el`
  #### el.remove(*key*)

  Get, set, or reset a property (attribute) of the element.

* #### el.style.get(*key*)
  #### el.style.set(*key*, *value*) returns `el`
  #### el.style.remove(*key*)

  Get, set, or reset an element-specific style.

* #### el.classes.get(*key*)
  #### el.classes.set(*key*[, *toggle = yes*]) returns `el`
  #### el.classes.remove(*key*)

  Adds or removes a class from this element.

* #### el.on(*event*, *callback*) returns `el`

  Attach an event listener to this element.

* #### el.append(*children...*) returns `el`
  #### el.prepend(*children...*) returns `el`
  #### el.insert(*index*, *children...*) return `el`
  #### el.remove(*index*) returns `el`

  Insert or remove `children` at the given position. `Children` must be a list of Strings or `TagrElement`s.

  #### el.empty() returns `el`

  Delete all children elements.

  #### el.appendSelf(*parent*) returns `el`
  #### el.prependSelf(*parent*) returns `el`
  #### el.insertSelf(*parent*, *index*) returns `el`
  #### el.removeSelf() returns `el`

  Insert or remove self from another `TagrElement`.

  #### el.index() returns Number

  Return the index offset of this element in its parent.

* #### el.select(*selector*) returns TagrQuery

  Returns a query relative to this element matching `selector`.

  #### el.find(*selector*) returns [TagrElement]

  Returns an array of elements currently matched by `selector` relative to this element. Shorthand for `el.select(selector).find()`.

* #### el.toJSON() returns Object

  Returns a JSON serialization of this element.

* #### el.useWhitespace(*toglee = true*)
  Sets whether whitespace is significant, via CSS.

  #### el.setSelectable(*toggle = true*)
  Sets element selectability, via CSS.

### `TagrQuery` object

* #### query.on(*event*, *callback*) returns `query`

  Attach an event listener to all elements matched by this selector.

* #### query.style.set(*key*, *value*) returns `query`

  #### query.style.set(*map*) returns `query`

  Sets a style for all elements matched by 

* #### query.find() returns [TagrElement]

  Return an array of all elements currently matched by this selector.

### `tagr.view` module

* #### tagr.view.getBox(*element*[, *relativeTo*]) returns Rectangle

  Get the bounding box of the element, with properties `width`, `height`, `top`, `right`, `bottom`, `left`. If an element is provided for `relativeTo`, these coordinates are relative to this other element.

* #### tagr.view.getStyle(*element*, *name*)

  Gets the computed CSS value for `name` of `element`.

## License

MIT.