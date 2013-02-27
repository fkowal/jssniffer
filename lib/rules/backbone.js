(function() {

    var broadcast = null;
    var error = function(errmsg) {
        broadcast.emit('error', errmsg);
    };

    function backboneExtend(node, path, code) {
        // node = BB...extend( ... )
        var proto = node['arguments'][0],
            comment = proto.leadingComments && proto.leadingComments[0];
        if (!comment) {
            error(getLine(node,code)+'extends missing @leads annotation');
        } else {
            var matches = comment.value.match(/@lends\s+(\w+)(\.prototype)?/);
            if (!matches || matches.length < 3 || matches[2] === undefined) {
                error(getLine(comment,code)+'expected @lends '+matches[1]+'.prototype');
            } else {
                if(matches && matches.length > 1 && matches[1]) {
                    // baseclass name specified we need to listen to @class publication event
                    // and validate that it's the same as the as provided here
                    broadcast.once('class', function(className) {
                        if (className !== matches[1]) {
                            error(getLine(comment,code) + 'expected "' + matches[1] + '" to equal @class "'+className+'"');
                        }
                    });
                }
            }
        }
    }

    function parseInitializeAnnotations(annotations, line) {
        var index, type, annotation, annonationName, expected = ['class', 'extends', 'constructs']
            ;
        line = line || '';
        for (index in annotations) {
            annotation = annotations[index];
            type = annotation.match(/\*\s@(\w+)/);
            annonationName = type && type[1];
            switch (annonationName) {
                case 'class':
                    // @class ClassName expected
                    type = annotation.match(/\*\s@(\w+)\s?(\w+)?/);
                    if (type[2] === undefined) {
                        error(annotation + ' missing ClassName for initialize property');
                    } else {
                        broadcast.emit(annonationName, type[2]);
                    }
                    expected.splice(expected.indexOf('class'), 1);   // 0 = indexOf 'class'
                    break;
                case 'extends':
                    // @extends ClassName expected
                    type = annotation.match(/\*\s@(\w+)\s?([a-z][a-z0-9\.]+)?/i);
                    if (type[2] === undefined) {
                        error(annotation + ' missing extended ClassName for initialize property');
                    }
                    expected.splice(expected.indexOf('extends'), 1);   // 0 = indexOf 'class'
                    break;
                case 'constructs':
                    // @constructs expected
                    expected.splice(expected.indexOf('constructs'), 1);   // 0 = indexOf 'class'
                    break;
            }
        }
        if (expected.length) {
            error(line + "annotations @" + expected.join(', @') + " where not found for initialize property");
        }
    }

    function getCode(node,code) {
        var str = '';
        if (node.type === 'Property') {
            str += code.substr(node.range[0], node.value.body.range[0]-node.range[0]);
        }
        return str;
    }
    function getLine (node) {
        var str = 'Line '+node.loc.start.line +': ';
        return str;
    }
    function initializeProp(node, path, code) {
        var comment, annotations;

        if (!node.leadingComments) {
            error(getLine(node,code)+"\nmissing expected @class, @constructs, @extends annotations on initialize property");
        } else {
            comment = node.leadingComments[0];
            annotations = comment.value.match(/\*\s@(\w+)(.*)/g);
            if (annotations) {
                parseInitializeAnnotations(annotations, getLine(comment,code));
            } else {
                error(getLine(comment,code)+'missing expected @class, @constructs, @extends annotations in comment for initialize property');
            }
        }
    }


    function initializeListener(node, path, code) {
        var properties, index;
        if (node.type === 'ObjectExpression' &&
            node.properties ) {
            properties = node.properties;
            for (index in properties) {
                var prop = properties[index];
                if (prop.type === "Property" &&
                    prop.key.name === "initialize"  // Backbone element initialize
                    ) {
                    // TODO verify is is descendant of Backbone.X.extend
                    initializeProp(prop, path, code);
                }
                // pomijamy zawartosc podgalezi
                //return VisitorOption.Skip;
            }
        }
    }

    function extendListener(node, path, code) {
        var callee;
        if (node.type === 'CallExpression') {
            callee = node.callee;
            if (callee && callee.type === 'MemberExpression' &&
                callee.property.name === 'extend'
            //&& callee.object && callee.object.object && callee.object.object.name === 'Backbone'
                ) {
                backboneExtend(node, path, code);
                //return VisitorOption.Skip;
            }
        }
    }

    var listener = function(node, path, code) {
        extendListener(node, path, code);
        initializeListener(node, path, code);
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
