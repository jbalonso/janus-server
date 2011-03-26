
// Load the secret
var secret_hex = require('./secret');
secret_hex = secret_hex.split(' ').join('').toLowerCase();
var secret_len = secret_hex.length / 2;
var secret = new Buffer(secret_len);
for(var i=0; i<secret_len; i++ ) {
    var high_nyb = "0123456789abcdef".indexOf(secret_hex[2*i]);
    var  low_nyb = "0123456789abcdef".indexOf(secret_hex[2*i+1]);
    secret[i] = (high_nyb << 4) + low_nyb;
}

var auth = require('./auth');
var doorman = new auth.DoormanAuth({
    secret: secret.toString('binary'),
    max_msg_age_ms: 500,
    max_session_age_ms: (7*24*60*60*1000),
    alg_accept: {sha1: true, sha256: true},
});

var repl = require('repl').start( 'janus> ' );
repl.context.auth = auth;
repl.context.doorman = doorman;

var Chunker = require('./chunker');
var net = require('net');
var cmd = function() {};
var server = net.createServer(function(socket) {
        var in_prefix = "\n" + socket.remoteAddress + " >> ";
        var out_prefix = socket.remoteAddress + " << ";
        repl.context.cmd = function(cmd) { 
            // Extract arguments
            var arg_lst = [];
            for( var i = 1; i < arguments.length; i++ )
                arg_lst.push(arguments[i]);

            // Prepare packet
            var pkt_str = doorman.packet(cmd, arg_lst).toString();

            // Send
            console.log(out_prefix + pkt_str);
            socket.write(pkt_str + '\r\n');
        }
        cmd = repl.context.cmd;

        console.log(in_prefix);

        var line_stream = new Chunker(socket);
        line_stream.on('data', function(line) {
            line = line.trimRight();
            console.log(in_prefix + line);

            var pkt = null;
            try { pkt = doorman.parse(line); }
            catch(err) { console.log('!!! rejected'); };

        });

});

// Set time
var vsprintf = require('./sprintf').vsprintf;
function update_time() {
    // Construct the timestamp 
    var d = new Date();
    var datetime = [
        d.getUTCMonth() + 1,
        d.getUTCDate(),
        d.getUTCFullYear() - 2000,
        d.getUTCHours(),
        d.getUTCMinutes(),
        d.getUTCSeconds(),
    ];
    var args = vsprintf('%02d%02d%02d%02d%02d%02d', datetime);
    cmd('TIME', args);
}
repl.context.update_time = update_time;

server.listen(4269);
