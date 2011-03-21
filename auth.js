
// auth.js -- authentication system for Janus/doorman
//
// Packet format:
//   SESSION;OFFSET;ROLE;CMD;ARGS;SIGNATURE
//   SESSION = "YYYY-MMDD-HHMM.SS" string in GMT of last/current rekey packet)
//   OFFSET = time from SESSION in milliseconds
//   ROLE = "M"/"S" for master/slave role of sender
//   CMD = "REKEY"/"PING"/"OPEN"
//   ARGS = space-delimited list of CMD parameters
//   SIGNATURE = HMAC signature of remaining packet (algorithm given in rekey
//                                                   packet)

var crypto = require('crypto');

function hextobin(hexstr) {
    buf = new Buffer(hexstr.length / 2);

    for(var i = 0; i < hexstr.length/2 ; i++)
        buf[i] = (parseInt(hexstr[i * 2], 16) << 4) + (parseInt(hexstr[i * 2 + 1], 16));
    
    return buf.toString('binary');
}

function DoormanAuth( kwargs ) {
    var self = this;

    // Save parameters
    this.secret = kwargs.secret;
    this.max_msg_age_ms = kwargs.max_msg_age_ms || 5000; // 5 seconds
    this.max_session_age_ms = kwargs.max_session_age_ms || (7*24*60*60*1000); // 7 days 
    this.alg_accept = kwargs.alg_accept || {sha1: true};

    // Initialize session
    this.session_secret = null;
    this.session_name = null;
    this.alg = null;

    // Operation Complete!
}

DoormanAuth.prototype.parse = function( line ) {
    // Create a packet from the line
    var pkt = new Packet( line );
    var is_rekey = false;
    var secret = this.session_secret;
    var alg = this.alg;
    var hmac = null;

    // Handle rekey
    if( pkt.cmd == 'REKEY' ) {
        // Determine the new algorithm
        var args = pkt.args.split(' ');
        alg = args[0].toLowerCase();

        // The nonce can be ignored

        // Make sure the algorithm can be accepted
        if( !this.alg_accept[alg] ) throw 'Cannot accept proposed hash algorithm.';

        // Determine the proposed new session key
        hmac = crypto.createHmac( alg, this.secret );
        secret = hextobin( pkt.sign( hmac )  );
        is_rekey = true;
    }

    // Verify session
    if( !is_rekey && pkt.session != this.session_name )
        throw 'Invalid session.';

    // Accept only slave-role messages
    if( pkt.role != 'S' ) throw 'Invalid sender role.';

    // Determine if the signature age is acceptible
    if( Math.abs(pkt.packet_age_ms()) > this.max_msg_age_ms )
        throw 'Replay attack warning: packet too old.';

    // Determine if the session age is acceptible
    if( Math.abs(pkt.session_age_ms()) > this.max_session_age_ms )
        throw 'Key expired.';

    // Verify signature
    hmac = crypto.createHmac( alg, secret );
    var signature = pkt.sign( hmac );
    if( signature != pkt.signature ) {
        console.log( 'Expected: ' + signature );
        console.log( '     Got: ' + pkt.signature );
        throw 'Invalid signature.';
    }

    // Save session secret if rekeyed
    if( is_rekey ) {
        this.session_secret = secret;
        this.session_name = pkt.session;
        this.alg = alg;
    }

    // Operation Complete!
    return pkt;
};

DoormanAuth.prototype.sign = function( pkt ) {
    // Sign the packet using a properly-initialized HMAC
    var hmac = crypto.createHmac( this.alg, this.session_secret );
    pkt.signature = pkt.sign( hmac );
    
    // Operation Complete!
    return pkt;
};

DoormanAuth.prototype.packet = function( cmd, arg_lst ) {
    // Construct a Packet object
    var pkt = new Packet();

    // Load session parameters into it
    pkt.session = this.session_name;
    pkt.parse_session();

    // Load command packet
    pkt.cmd = cmd;
    pkt.args = arg_lst.join(' ');

    // Timestamp
    pkt.timestamp = new Date();
    pkt.compute_offset();

    // Sign
    this.sign( pkt );

    // Operation Complete!
    return pkt;
};

DoormanAuth.prototype.issue_cmd = function( cmd ) {
    // Extract arguments
    var arg_lst = [];
    for( var i = 0; i < arguments.length; i++ )
        arg_lst.push(arguments[i]);

    // Operation Complete!
    return this.packet(cmd, arg_lst);
};

function Packet( line ) {
    // Initialize packet fields 
    this.session = '';
    this.offset = 0;
    this.role = 'M';
    this.cmd = '';
    this.args = '';
    this.signature = '';
    this.session_timestamp = new Date();
    this.timestamp = new Date();

    // Parse if appropriate
    if( line ) this.parse( line );

    // Operation Complete!
}

Packet.prototype.parse_session = function() {
    // Parse session timestamp
    if( this.session.length != 17 ) throw 'Invalid session timestamp.';
    var time_parts = this.session.split('-');
    var year   = time_parts[0];
    var month  = time_parts[1].substr(0,2);
    var day    = time_parts[1].substr(2,2);
    var hour   = time_parts[2].substr(0,2);
    var minute = time_parts[2].substr(2,2);
    var second = time_parts[2].substr(5,2);
    var time_str = [month, day, year].join('/') + ' ' + [hour, minute, second].join(':') + ' UTC';

    // Operation Complete!
    this.session_timestamp = new Date(time_str);
};

Packet.prototype.compute_offset = function() {
    // Operation Complete!
    this.offset = Number(this.timestamp) - Number(this.session_timestamp);
};

Packet.prototype.session_age_ms = function() {
    // Operation Complete!
    return Number(new Date()) - Number(this.session_timestamp);
};

Packet.prototype.packet_age_ms = function() {
    // Operation Complete!
    return Number(new Date()) - Number(this.timestamp);
};

Packet.prototype.parse = function( line ) {
    // Split the line into its requisite fields
    var fields = line.split(';');
    if( fields.length != 6 ) throw 'Invalid Doorman packet.';

    // Read fields
    this.session = fields.shift();
    this.offset = Number(fields.shift());
    this.role = fields.shift();
    this.cmd = fields.shift();
    this.args = fields.shift();
    this.signature = fields.shift();

    // Compute packet timestamp
    this.parse_session();
    this.timestamp = new Date(this.offset + Number(this.session_timestamp));

    // Operation Complete!
};

Packet.prototype.sign = function( hmac ) {
    // Load the HMAC with packet data
    hmac.update(this.session);
    hmac.update(';');
    hmac.update(this.offset.toString());
    hmac.update(';');
    hmac.update(this.role);
    hmac.update(';');
    hmac.update(this.cmd);
    hmac.update(';');
    hmac.update(this.args);

    // Operation Complete!
    return hmac.digest('hex').toLowerCase();
};

Packet.prototype.toString = function() {
    // Operation Complete!
    return [this.session, this.offset, this.role, this.cmd, this.args, this.signature].join(';');
};

module.exports.DoormanAuth = DoormanAuth; 
module.exports.Packet = Packet; 
