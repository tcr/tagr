build: ./src/tagr.coffee
	coffee -c -o ./lib/tagr.js ./src/tagr.coffee 
	closure --js ./resources/sizzle.js --js ./lib/tagr.js --js_output_file ./lib/tagr.min.js --compilation_level ADVANCED_OPTIMIZATIONS
	@ gzip -c ./lib/tagr.min.js > ./lib/tagr.min.js.gz
	@ echo ""
	@ ls -l ./lib/tagr.js | awk '{ printf "tagr.js file size: %s bytes\n", $$5 }'
	@ ls -l ./lib/tagr.min.js | awk '{ printf "minified file size: %s bytes\n", $$5 }'
	@ ls -l ./lib/tagr.min.js.gz | awk '{ printf "gzipped file size: %s bytes\n", $$5 }'
	@ rm ./lib/tagr.min.js.gz