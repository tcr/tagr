// TagrTodo
// A demo using Tagr, HTML manipulation library
// Copyright (c) 2012 Tim Cameron Ryan
// MIT Licensed

// Closure.
(function () {

// Write out a new context element to use. We can also
// load a context element from the loaded document, waiting
// using tagr.ready() then tagr.getContext(domnode). This
// method doesn't require waiting for the document finish loading.
var ctx = tagr.writeContext()
	.useWhitespace(true)
	.setSelectable(false)
	.style.set({
		'border': '1px outset #aaa',
		'background': '#ccc',
		'padding': '10px'
	})

// Buttons to control the TODO list. Add these later.
var addButton, removeButton, upButton, downButton;
// Create a list element
var list = tagr('div').appendSelf(ctx)
	.style.set({
		'height': '300px',
		'background': '#777',
		'border': '1px inset #aaa',
		'overflow': 'auto'
	})

// Live styles -and- events can be set on tag selections.
// Here, we define a .selected class which is assigned
// to the last element to be clicked. Note that none of these
// elements have been inserted yet.
list.select('div')
	.on('click', function () {
		select(this);
	})
	.style.set({
		'background': '#eee',
		'cursor': 'pointer',
		'padding': '3px 5px',
		'margin-bottom': '1px',
		'overflow': 'auto'
	});
list.select('div.selected')
	.style.set({
		'border-left': '5px solid #fc0',
		'font-weight': 'bold'
	});

// Create the control panel.
ctx.append(
	tagr('div').append(
		addButton = tagr('button').append('Add Item')
			.on('click', function () {
				var val = prompt('Add a TODO item:', 'New Item');
				if (val) select(addItem(val));
			}),
		removeButton = tagr('button').append('Remove Item')
			.on('click', function () {
				if (!selected) return;
				removeItem(deselect());
			}),
		upButton = tagr('button').append('Move Up')
			.on('click', function () {
				if (!selected) return;
				moveUp(selected);
				updateControls();
			}),
		downButton = tagr('button').append('Move Down')
			.on('click', function () {
				if (!selected) return;
				moveDown(selected);
				updateControls();
			})
	)
	.style.set('margin-top', '10px')
)
.select('button').style.set('font-size', 'inherit');

// Now we've populated the markup, we can begin describing our logic.
// Let's add items, remove items, select, deselect, and reorder.

// Selected/deselected handlers.
var selected = null;
function select(elem) {
	if (selected) deselect();
	(selected = elem).classes.set('selected');
	updateControls();
}
function deselect() {
	if (!selected) return;
	console.log(selected.classes.remove)
	selected.classes.remove('selected');
	updateControls();
	var old = selected;
	selected = null;
	return old;
}
// Control panel state.
function updateControls() {
	removeButton.set('disabled', !selected);
	upButton.set('disabled', !selected || selected.index() <= 0);
	downButton.set('disabled', !selected || selected.index() >= list.length-1);
}
updateControls(); // Initial call.

// Adding/removing.
function addItem(val) {
	return tagr('div').append(val).appendSelf(list);
}
function removeItem(item) {
	item.removeSelf();
}
// Reorder items.
function moveUp(item) {
	var i = item.index();
	if (i <= 0) return;
	item.removeSelf();
	list.insert(i - 1, item);
}
function moveDown(item) {
	var i = item.index();
	if (i >= list.length - 1) return;
	item.removeSelf();
	list.insert(i + 1, item);
}

// And to start, let's add some default items.
addItem('TODO list item #1. Click me!')
addItem('TODO list item #2. No click me!')
addItem('TODO list item #3. Don\'t click me. I ain\'t even mad.')

// End closure.	
})();