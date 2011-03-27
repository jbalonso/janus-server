
// auth.js -- authentication system for Janus/doorman

var crypto = require('crypto'),
    DoormanPacket = require('./packet').DoormanPacket;

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
    this.max_msg_age_ms = kwargs.max_msg_age_ms || 500; // 0.5 seconds
    this.max_rekey_age_ms = kwargs.max_rekey_age_ms || 5000; // 5 seconds
    this.max_session_age_ms = kwargs.max_session_age_ms || (7*24*60*60*1000); // 7 days 
    this.alg_accept = kwargs.alg_accept || {sha1: true};

    // Initialize session
    this.session_secret = null;
    this.session_name = null;
    this.alg = null;
    this.time_shift = 0;

    // Operation Complete!
}

DoormanAuth.prototype.parse = function( line ) {
    // Create a packet from the line
    var pkt = new DoormanPacket( line );

    // Operation Complete!
    return this.authenticate(pkt);
};

DoormanAuth.prototype.authenticate = function( pkt ) {
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
    var time_shift = this.time_shift;
    var age_limit = this.max_msg_age_ms;
    if( is_rekey ) { time_shift = 0; age_limit = this.max_rekey_age_ms; }
    var pkt_age = pkt.packet_age_ms(time_shift);
    if( Math.abs(pkt_age) > age_limit )
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

    // Dynamically adjust time shift
    this.time_shift = time_shift + pkt_age;

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
    // Construct a DoormanPacket object
    var pkt = new DoormanPacket();

    // Load session parameters into it
    pkt.session = this.session_name;
    pkt.parse_session();

    // Load command packet
    pkt.cmd = cmd;
    pkt.args = arg_lst.join(' ');

    // Timestamp
    pkt.timestamp = new Date();
    pkt.compute_offset();
    pkt.offset -= this.time_shift;

    // Sign
    this.sign( pkt );

    // Operation Complete!
    return pkt;
};

DoormanAuth.prototype.issue_cmd = function( cmd ) {
    // Extract arguments
    var arg_lst = [];
    for( var i = 1; i < arguments.length; i++ )
        arg_lst.push(arguments[i]);

    // Operation Complete!
    return this.packet(cmd, arg_lst);
};

module.exports.DoormanAuth = DoormanAuth; 
