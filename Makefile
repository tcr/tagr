build: tagr.coffee
	coffee -c tagr.coffee
	closure --js tagr.js --js_output_file tagr.min.js --compilation_level ADVANCED_OPTIMIZATIONS