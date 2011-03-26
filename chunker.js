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
}

sys.inherits(Chunker, events.EventEmitter);
module.exports = Chunker;
