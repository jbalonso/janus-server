
var events = require('events'),
    util = require('util'),
    Chunker = require('./chunker'),
    Packet = require('./packet').Packet;

function Connection( stream ) {
    // Initialize the Chunker 
    Chunker.call(this, stream);

    // Begin with no authenticator
    this.authenticator = null;

    // Parse input lines
    this.on('data', function(data) {
        try {
            // FIXME: detect REKEY, signal for authenticator, etc.
            var pkt = new Packet(data);
            self.emit('rawpacket', pkt);
        } catch(err) { self.emit('error', err); };
    });
}
util.inherits(Connection, Chunker);

Connection.prototype.cmd = function(cmd) {
    // Extract arguments
    var arg_lst = [];
    for( var i = 1; i < arguments.length; i++ )
        arg_lst.push(arguments[i]);

    // Prepare packet
    var pkt_str = doorman.packet(cmd, arg_lst).toString();

    // Send
    this.write(pkt_str);
};

Connection.prototype.set_authenticator = function( authenticator ) {
    // Store the authenticator
    this.authenticator = authenticator;
};

module.exports = Connection;
