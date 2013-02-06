LIB=glsl.min.js

all: $(LIB)

%.min.js: %.js
	@curl -d compilation_level=SIMPLE_OPTIMIZATIONS -d output_format=text -d output_info=compiled_code --data-urlencode "js_code@$<" http://closure-compiler.appspot.com/compile > $@

clean:
	@rm $(LIB)
