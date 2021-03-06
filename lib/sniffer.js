(function () {
    var esprima = require('esprima'),
        escodegen = require('escodegen'),
        estraverse = require('estraverse'),
        EventEmitter = require('events').EventEmitter,
        traverse = estraverse.traverse;

    var JsSniffer = function() {
        this.path = [];
        this.plugins = [];
        this.errors = [];

        this.on('error', function(msg) {
            console.error(msg);
        });
    };
    JsSniffer.prototype = Object.create(EventEmitter.prototype);

    JsSniffer.prototype.sniff = function (content, options) {
        options = options || {};
        var tree = esprima.parse(content, {
                comment: true,
                range: true,
                tokens: true,
                loc: true,
                raw: true
            }),
            commentedTree = escodegen.attachComments(tree, tree.comments, tree.tokens);

        this.traverse(commentedTree, content);
    };

    JsSniffer.prototype.traverse = function(tree, code) {
        var sniffer = this
            ;
        traverse(tree, {
            cursor: 0,
            enter: function (node) {
                sniffer.path.push(node);
                this.cursor += 1;

                sniffer.emit('traverse:enter', node, sniffer.path, code);
            },
            leave: function (node) {
                sniffer.path.pop();
                this.cursor -= 1;
                sniffer.emit('traverse:leave', node, sniffer.path, code);
            }
        });
    };

    JsSniffer.prototype.plugin = function(plugin) {
        var event;
        for (event in plugin.events) {
            this.on(event, plugin.events[event]);
        }
        // TODO change to a different event emitter not the sniffer instance
        plugin.plug(this);  // add a event emitter for backward communication
    };


    exports.Sniffer = JsSniffer;
})();
