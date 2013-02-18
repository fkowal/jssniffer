#!/usr/bin/env node

var fs = require('fs'),
    Sniffer = require('./lib/sniffer').Sniffer,
    amd = require('./lib/amd').plugin,
    bb = require('./lib/backbone').plugin,
    files = process.argv.splice(2);

if (files.length === 0) {
    console.log('Usage:');
    console.log('   jssniffer file.js');
    process.exit(1);
}

var sniffer = new Sniffer();
sniffer.plugin(amd);
sniffer.plugin(bb);

files.forEach(function (filename) {
    var content = fs.readFileSync(filename, 'utf-8');
    sniffer.sniff(content);
});
