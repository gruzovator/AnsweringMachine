var net = require('net');
var os = require('os');
var log = require('log4js').getLogger('AmClient');
var cfg = require('../config.js').am;
var Utils = require('./Utils.js');

var answering_machine = (function(){
    var options = {
        port: cfg.port || 9090,
        host: cfg.host || 'localhost'
    }

    var topics = [];
    var client;
    var requests_to_send = [];
    var requests_to_reply = [];

    function connect() {
        client = net.connect(options, function(){ 
            log.debug('connected');
            send_next();
        });
        client.once('error', function(err) { 
            log.error('Connection error', err);
        });
        client.once('close', function(){ 
            client = undefined;
            setTimeout(connect, 1000) 
        });
        client.setEncoding('utf8');
        client.pipe(new Utils.StringStreamSplitter(on_server_line));
    }

    connect();

    function on_server_line(line) {
        try {
            var json = JSON.parse(line);
        }
        catch(err) {
            log.error('Server line decode error', err);
            return;
        }
        if(json.answer || json.error) {
            if(requests_to_reply.length==0)  return log.error('Unexpected answer', line);
            var r = requests_to_reply.shift();
            clearTimeout(r.timer);
            if(!r.cb) return log.warn('Answer for timedout question');
            if(json.error)
                r.cb(new Error(json.error));
            else
                r.cb(null, json.answer);
            send_next();
        }
        else if(json.topics) {
            topics = json.topics;
            log.debug('Topics updated:', topics);
        }
        else {
            log.warn('Unknown server line', line);
        }
    }

    function send_next() {
        if(requests_to_send.length>0) {
            var r = requests_to_send.shift();
            if(r.cb) { //there was no timeout when waiting
                client.write(JSON.stringify(r.question)+os.EOL);
                requests_to_reply.push(r);
            }
        }
    }

    return {
        Ask: function(question, cb) {
            var request = {
                question: question,
                cb : cb,
                timer: setTimeout(function(){ 
                        cb(new Error('Answer timeout')); 
                        request.cb = null;
                    },cfg.answer_timeout || 1000)
            };
            if(requests_to_send.length > 0) {
                requests_to_send.push(request);
            }
            else {
                requests_to_reply.push(request);
                client.write(JSON.stringify(question)+os.EOL);
            }
        },
        topics : function() { return topics; }
    }
}());

module.exports = answering_machine;

function Test() {
    var topic = answering_machine.topics()[0];
    var text = 'text';
    console.log('Topic:', topic, 'Question Text:', text);
    answering_machine.Ask({topic: topic, text:text}, function(err, answer){
        if(err)
            console.error(err)
        else
            console.log('Answer:', answer);
    })
}

if(require.main === module)
    Test();

