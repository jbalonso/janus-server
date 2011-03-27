// chunker.js -- Read a stream line by line

var sys = require('sys'),
    events = require ('events');

function Chunker(stream) {
    var self = this;
    
    events.EventEmitter.call(this);

    this._buf = "";

    stream.on('data', function(data) {
            self._buf += data.toString('utf8');
            var lines = self._buf.split('\n');
            self._buf = lines.pop();
            for( var i in lines )
                self.emit('data', lines[i] + '\n');
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

        // Send data
        stream.write.call(stream, arg_lst);
    };
}

sys.inherits(Chunker, events.EventEmitter);
module.exports = Chunker;
