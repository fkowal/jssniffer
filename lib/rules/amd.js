(function() {

    var broadcast = null;
    var error = function(errmsg) {
        broadcast.emit('error', errmsg);
    };

    function getLine (node) {
        var str = 'Line '+node.loc.start.line +': ';
        return str;
    }

    function parseDefineAnnotations(commentNode, code, funcArgs) {
        var annotations = commentNode.value.match(/\@param\s(\{.*\})?(.*)/g), index, matches, arg;
        if (annotations && annotations.length) {
            if (annotations.length !== funcArgs.length) {
                error(getLine(commentNode, code) +"annotation @param count doesn't match function argument count");
            }
            for (index = 0; index < annotations.length; index++) {
                arg = funcArgs[index];
                matches = annotations[index].match(/@param\s+(\{[a-z0-9_$]+\})?\s?([a-z09_$]+)?/i);
                if (matches && matches[1] === undefined) {
                    error(getLine(commentNode, code) +'missing {type} hint for @param "' + (matches[2] ? matches[2] : matches[0]) +'"');
                }
                if (matches && matches[2] !== arg.name) {
                    error(getLine(commentNode, code) + '"' +matches[2] + '" name doesn\'t match argument name: "' + arg.name+'"');
                }
            }
        } else {
            error(getLine(commentNode, code) + "missing "+funcArgs.length+"x @param definitions");
        }
    }

    function defineFound(node, code) {
        var callback, args, namedDefine,
            codeComment,
            defineArguments = node['arguments'],
            funcArgs;
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
            error(getLine(node,code) + "define() argument count doesn't match dependency count");
        }
        codeComment = callback.leadingComments;
        if (!codeComment) {
            error(getLine(node,code) + 'missing a comment block for define callback');
        } else if (codeComment.length > 1) {
            error('2 many comments');
        } else if (codeComment.length === 1) {
            var comment = codeComment[0];
            if (comment.type !== 'Block') {
                error('expected a block comment');
            } else {
                parseDefineAnnotations(comment, code, funcArgs);
            }
        }
    }

    var listener = function(node, path, code) {
        var callee;
        if (node.type === 'CallExpression') {
            callee = node.callee;
            if (callee && callee.type === 'Identifier' &&
                callee.name === 'define') {
                defineFound(node, code);
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
