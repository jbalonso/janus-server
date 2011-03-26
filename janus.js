
var auth = require('./auth');
var doorman = new auth.DoormanAuth({
    secret: "1234567890123456789012345678901234567890123456789012345678901234",
    max_msg_age_ms: 60*60000,
    max_session_age_ms: (7*24*60*60*1000),
    alg_accept: {sha1: true, sha256: true},
});

var repl = require('repl').start( 'janus> ' );
repl.context.auth = auth;
repl.context.doorman = doorman;

var Chunker = require('./chunker');
var net = require('net');
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

        socket.write("\n");
        console.log(out_prefix);

        var line_stream = new Chunker(socket);
        line_stream.on('data', function(line) {
            line = line.trimRight();
            console.log(in_prefix + line);

            var pkt = null;
            try { pkt = doorman.parse(line); }
            catch(err) { console.log('!!! rejected'); };

        });

});

server.listen(4269);
