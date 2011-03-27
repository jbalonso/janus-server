
// packet.js -- packet format for Janus/doorman
//
// DoormanPacket format:
//   SESSION;OFFSET;ROLE;CMD;ARGS;SIGNATURE
//   SESSION = "YYYY-MMDD-HHMM.SS" string in GMT of last/current rekey packet)
//   OFFSET = time from SESSION in milliseconds
//   ROLE = "M"/"S" for master/slave role of sender
//   CMD = "REKEY"/"PING"/"OPEN"/"PANIC"/"TIME"/"CLOSE"
//   ARGS = space-delimited list of CMD parameters
//   SIGNATURE = HMAC signature of remaining packet (algorithm given in rekey
//                                                   packet)

function DoormanPacket( line ) {
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

DoormanPacket.prototype.parse_session = function() {
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

DoormanPacket.prototype.compute_offset = function() {
    // Operation Complete!
    this.offset = Number(this.timestamp) - Number(this.session_timestamp);
};

DoormanPacket.prototype.session_age_ms = function() {
    // Operation Complete!
    return Number(new Date()) - Number(this.session_timestamp);
};

DoormanPacket.prototype.packet_age_ms = function(time_shift) {
    time_shift = time_shift || 0;

    // Operation Complete!
    return Number(new Date()) - Number(this.timestamp) - time_shift;
};

DoormanPacket.prototype.parse = function( line ) {
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

DoormanPacket.prototype.sign = function( hmac ) {
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

DoormanPacket.prototype.toString = function() {
    // Operation Complete!
    return [this.session, this.offset, this.role, this.cmd, this.args, this.signature].join(';');
};

module.exports.DoormanPacket = DoormanPacket; 
