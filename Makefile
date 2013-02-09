LIB=glsl.min.js

all: clean $(LIB) doc

%.min.js: %.js
	@curl -d compilation_level=SIMPLE_OPTIMIZATIONS -d output_format=text -d output_info=compiled_code --data-urlencode "js_code@$<" http://closure-compiler.appspot.com/compile > $@

doc:
	mkdir docs; jsdoc glsl.js -t=jsdoc_template -d=docs -D="noGlobal:true"

clean:
	@rm -rf $(LIB) docs/
