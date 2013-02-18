(function() {

    var broadcast = null;
    var error = function(errmsg) {
        broadcast.emit('error', errmsg);
    };

    function backboneExtend(node) {
        // node = BB...extend( ... )
        var proto = node['arguments'][0],
            comment = proto.leadingComments && proto.leadingComments[0];
        if (!comment) {
            error('extends missing @leads annotation');
        } else {
            var m = comment.value.match(/@lends\s+(\w+)(\.prototype)?/);
            if (!m || m.length < 3 || m[2] === undefined) {
                error('expected @lends {..}.prototype');
            } else {
                if(m && m.length > 1 && m[1]) {
                    // baseclass name specified we need to listen to @class publication event
                    // and validate that it's the same as the as provided here
                    broadcast.once('class', function(className) {
                        if (className !== m[1]) {
                            error(comment.value + ' != @class '+className); // TODO
                        }
                    });
                }
            }
        }
    }

    function initializeProp(node) {
        var comment, annotations, annotation, annonationName,
            expected = ['class', 'extends', 'constructs'], index;
        if (!node.leadingComments) {
            error('missing expected @' + expected.join(', @') + ' annotations on initialize property');
        } else {
            comment = node.leadingComments[0];  // TODO add line numbers to error messages
            annotations = comment.value.match(/\*\s@(\w+)(.*)/g);
            if (annotations) {
                for (index in annotations) {
                    annotation = annotations[index];
                    var type = annotation.match(/\*\s@(\w+)/);
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
                    error("annotations @" + expected.join(', @') + " where not found for initialize property");
                }
            } else {
                error('missing expected @' + expected.join(', @') + ' annotations in comment for initialize property');
            }
        }
    }


    function initializeListener(node) {
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
                    initializeProp(prop);
                }
                // pomijamy zawartosc podgalezi
                //return VisitorOption.Skip;
            }
        }
    }

    function extendListener(node) {
        var callee;
        if (node.type === 'CallExpression') {
            callee = node.callee;
            if (callee && callee.type === 'MemberExpression' &&
                callee.property.name === 'extend'
            //&& callee.object && callee.object.object && callee.object.object.name === 'Backbone'
                ) {
                backboneExtend(node);
                //return VisitorOption.Skip;
            }
        }
    }

    var listener = function(node, path) {
        extendListener(node);
        initializeListener(node);
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
