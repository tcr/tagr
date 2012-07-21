// TagrTodo
// A demo using Tagr, HTML manipulation library
// Copyright (c) 2012 Tim Cameron Ryan
// MIT Licensed

(function () {

  var App = {}

  // Selection.

  App.selected = null;

  App.select = function (elem) {
    if (App.selected) {
      App.deselect();
    }
    (App.selected = elem).classes.set('selected');
    App.refreshControls();
  };

  App.deselect = function () {
    if (App.selected) {
      App.selected.classes.remove('selected');
      App.refreshControls();
      var last = App.selected;
      App.selected = null;
      return last;
    }
  };

  App.refreshControls = function () {
    App.ctx.find('#remove').set('disabled', !App.selected);
    App.ctx.find('#up').set('disabled', !App.selected || App.selected.index() <= 0);
    App.ctx.find('#down').set('disabled', !App.selected || App.selected.index() >= App.list.length-1);
  };

  // Manipulation.

  App.addItem = function (val) {
    var item = tagr('.entry', {}, val);
    App.list.append(item);
  };

  App.removeItem = function () {
    if (App.selected) {
      App.deselect().removeSelf();
      App.refreshControls();
    }
  };

  // Reordering.
  
  App.moveUp = function () {
    if (App.selected) {
      var i;
      if ((i = App.selected.index()) > 0) {
        App.selected.removeSelf();
        App.list.insert(i - 1, App.selected);
      }
      App.refreshControls();
    }
  };
  
  App.moveDown = function (item) {
    if (App.selected) {
      var i;
      if ((i = App.selected.index()) < App.list.length - 1) {
        App.selected.removeSelf();
        App.list.insert(i + 1, App.selected);
      }
      App.refreshControls();
    }
  };

  // Create a list container.
  // Define a .selected class which is assigned
  // to the last element to be clicked. Note that none of these
  // elements have been inserted yet.

  App.list = tagr('.list');

  App.list
    .style({
      'height': '300px',
      'background': '#777',
      'border': '1px inset #aaa',
      'overflow': 'auto'
    })
    .query('.entry')
      .style({
        'background': '#eee',
        'cursor': 'pointer',
        'padding': '3px 5px',
        'margin-bottom': '1px',
        'overflow': 'auto'
      })
      .base
    .query('.entry.selected')
      .style({
        'border-left': '5px solid #fc0',
        'font-weight': 'bold'
      });

  // Create the control panel.

  App.controls = tagr('div', {},
    tagr('button#add', {}, 'Add Item'),
    tagr('button#remove', {}, 'Remove Item'),
    tagr('button#up', {}, 'Move Up'),
    tagr('button#down', {}, 'Move Down')
  );

  App.controls
    .style('margin-top', '10px')
    .query('button').style('font-size', 'inherit');

  // Write out a new context element to use. We can also
  // load a context element from the loaded document, waiting
  // using tagr.ready() then tagr.getContext(domnode). This
  // method doesn't require waiting for the document finish loading.

  App.ctx = tagr.writeContext('#todo', {}, App.list, App.controls)
    .useWhitespace(true)
    .setSelectable(false)
    .style({
      'border': '1px outset #aaa',
      'background': '#ccc',
      'padding': '10px'
    });

  // Setup our events.

  App.list.query('.entry').on('click', function () {
    App.select(this);
  });
  App.controls.find('#add').on('click', function () {
    var val;
    if (val = prompt('Add a TODO item:', 'New Item')) {
      App.addItem(val);
    }
  });
  App.controls.find('#remove').on('click', App.removeItem);
  App.controls.find('#up').on('click', App.moveUp),
  App.controls.find('#down').on('click', App.moveDown);

  // Entry point. Initialize and setup some items.

  App.refreshControls();
  App.addItem('TODO list item #1. Click me!')
  App.addItem('TODO list item #2. No click me!')
  App.addItem('TODO list item #3. Don\'t click me. I ain\'t even mad.')

})();