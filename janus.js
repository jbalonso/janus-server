
var auth = require('./auth');
var repl = require('repl').start( 'janus> ' );
repl.context.auth = auth;
repl.context.doorman = new auth.DoormanAuth({
    secret: "1234567890123456789012345678901234567890123456789012345678901234",
    max_msg_age_ms: 60*60000,
    max_session_age_ms: (7*24*60*60*1000),
    alg_accept: {sha1: true, sha256: true},
});

