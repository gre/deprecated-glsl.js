LIB=glsl.min.js
DOC=docs

all: clean $(LIB) doc

%.min.js: %.js
	@echo "/*!" > $@
	@cat LICENCE >> $@
	@echo "*/" >> $@
	@echo "Minimizing Javascript remotely..."
	@curl -s -d compilation_level=SIMPLE_OPTIMIZATIONS -d output_format=text -d output_info=compiled_code --data-urlencode "js_code@$<" http://closure-compiler.appspot.com/compile >> $@ && echo "'$@' minimized."

jslint:
	jsl -conf jsl.default.conf -process glsl.js

doc:
	@mkdir $(DOC)
	@jsdoc glsl.js -t=jsdoc_template -d=$(DOC) -D="noGlobal:true"
	@echo "Documentation generated in '$(DOC)'"

clean:
	@rm -rf $(LIB) docs/

.PHONY: test
