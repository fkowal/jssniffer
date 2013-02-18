(function() {

    var broadcast = null;
    var error = function(errmsg) {
        console.error;
        broadcast.emit('error', errmsg);
    }

    function defineFound(defineNode) {
        var callback, args, namedDefine,
            codeComment,
            defineArguments = defineNode['arguments'],
            x, funcArgs;
        switch (defineArguments.length) {
            case 1:
                callback = defineArguments[0];
                break;
            case 2:
                args = defineArguments[0];
                callback = defineArguments[1];
                break;
            case 3:
                namedDefine = defineArguments[0];
                args = defineArguments[1];
                callback = defineArguments[2];
        }
        funcArgs = callback.params;
        if (funcArgs.length !== args.elements.length) {
            // TODO show dependency values with function arguments names
            error("function argument count doesn't match dependency count");
        }
        codeComment = callback.leadingComments;
        if (!codeComment) {
            error('expected a comment block for define callback on line: ' + defineNode.loc.start.line);
        } else if (codeComment.length > 1) {
            error('2 many comments');
        } else if (codeComment.length === 1) {
            var block = codeComment[0];
            if (block.type !== 'Block') {
                error('expected a block comment');
            } else {
                var lines = block.value.split("\n");
                var m = block.value.match(/\@param\s(\{.*\})?(.*)/g);
                if (m && m.length) {
                    if (m.length !== funcArgs.length) {
                        error("annotation @param count doesn't match function argument count");
                    }
                    for (x = 0; x < m.length; x++) {
                        var arg = funcArgs[x];
                        var y = m[x].match(/@param\s+(\{[a-z0-9_$]+\})?\s?([a-z09_$]+)?/i);
                        if (y && y[1] === undefined) {
                            error('line ' + arg.loc.start.line + ": " + y[0] + ": missing {type} hint ");
                        }
                        if (y && y[2] !== arg.name) {
                            error('line ' + arg.loc.start.line + ": " + y[0] + " name doesn't match argument name: " + arg.value);
                        }
                    }
                }
                //for(x = 0; x < lines.length)
            }
        }
    }

    var listener = function(node, path) {
        var callee;
        if (node.type === 'CallExpression') {
            callee = node.callee;
            if (callee && callee.type === 'Identifier' &&
                callee.name === 'define') {
                defineFound(node);
            }
        }
    };

    exports.plugin = {
        events: {
            'traverse:enter': listener
        },
        plug: function(notifier) {
            broadcast = notifier;
        }
    };
})();
