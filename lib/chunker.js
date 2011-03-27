// chunker.js -- Read a stream line by line

var sys = require('sys'),
    events = require('events'),
    logging = require('./logging');

function Chunker(stream) {
    var self = this;
    
    events.EventEmitter.call(this);

    this._buf = "";

    // Forward basic stream events
    stream.on('end', function() { self.emit('end'); });
    stream.on('error', function(err) { self.emit('error', err); });
    stream.on('close', function(had_error) { self.emit('close', had_error); });
    stream.on('timeout', function() { self.emit('timeout'); });
    stream.on('drain', function() { self.emit('drain'); });

    // Forward timeout configuration to stream
    this.setTimeout = function(timeout) { return stream.setTimeout.call(stream, arguments); };

    // Prepare logging prefixes
    var in_prefix = "\n" + stream.remoteAddress + " >> ";
    var out_prefix = stream.remoteAddress + " << ";

    // Chunk input stream into lines
    stream.on('data', function(data) {
            self._buf += data.toString('utf8');
            var lines = self._buf.split('\n');
            self._buf = lines.pop();
            for( var i in lines ) {
                self.emit('log', logging.VERBOSE, in_prefix + lines[i]);
                self.emit('data', lines[i] + '\n');
            }
    });

    // Offer method to write data
    this.write = function(str) {
        // Extract arguments
        var arg_lst = [];
        for( var i = 1; i < arguments.length; i++ )
            arg_lst.push(arguments[i]);

        // Add line ending
        str += '\n';
        arg_lst.unshift(str);

        // Send and log data
        stream.write.call(stream, arg_lst);
        self.emit('log', logging.VERBOSE, out_prefix + str);
    };
}

sys.inherits(Chunker, events.EventEmitter);
module.exports = Chunker;
