ctx = tagr.writeContext()
	.useWhitespace(true)

content = tagr().appendSelf(ctx)
	.append(
		['h1', {}, 'Teh heading']
		['p', {}, 'One paragraphs']
		['hr', {}]
		['p', {}, 'Two paragraphs']
		['ul', {}, 
			['li', {}, 'List element 1']
			['li', {}, 'List element 2']
		]
		['p', {}, 'Two paragraphs']
	)
	.style.set border: '1px solid red', padding: '10px'

class Cursor
	toOpen: (@el) ->
		@type = 'open'
		@tag = @el.tag
		@props = {}
		for k, v of @el.props then @props[k] = v
		delete @character

	toClose: (@el) ->
		@type = 'close'
		delete @tag
		delete @props
		delete @character

	toEmpty: (@el) ->
		@type = 'empty'
		@tag = @el.tag
		@props = {}
		for k, v of @el.props then @props[k] = v
		delete @character

	toCharacter: (@el, @child, @index) ->
		@type = 'character'
		delete @tag
		delete @props
		@character = @el[@child].charAt @index

	next: ->
		switch @type
			when 'character'
				if @el[@child].length > @index + 1 then @toCharacter @el, @child, @index + 1; return
				par = @el; next = @child + 1
			when 'open'
				par = @el; next = 0
			when 'close'
				if not @el.parent then @toClose @el; @type = 'end'; return
				par = @el.parent; next = @el.index() + 1
			when 'end'
				throw 'Cursor cannot exceed end of frame.'
		if typeof par[next] == 'string' then @toCharacter par, next, 0
		else if par[next] then @toOpen par[next]
		else @toClose par
		return

	prev: ->
		switch @type
			when 'character'
				if @index > 0 then @toCharacter @el, @child, @index - 1; return
				par = @el; prev = @child - 1
			when 'open'
				if not @el.parent then throw 'Cursor cannot preceed end of frame.'
				par = @el.parent; prev = @el.index() - 1
			when 'close', 'end'
				par = @el; prev = @el.length - 1
		if typeof par[prev] == 'string' then @toCharacter par, prev, par[prev].length - 1
		else if par[prev] then @toClose par[prev]
		else @toOpen par
		return


button = tagr('button').appendSelf(ctx)
	.append('Log selection')
	.on 'click', ->
		c = new Cursor

		c.toOpen(content)
		while c.type != 'end'
			console.log c.type, c.tag, c.props, c.character
			c.next()

		c.toClose(content)
		while c.type != 'open' or c.node != @el
			console.log c.type, c.tag, c.props, c.character
			c.prev()