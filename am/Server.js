var net = require('net');
var fs = require('fs');
var os = require('os');
var path_join = require('path').join;
var log = require('log4js').getLogger('AmServer');
var cfg = require('../config.js').am;
var Utils = require('./Utils.js');
var DirWatcher = require('./DirWatcher.js');
var MarkovChains = require('./MarkovChains.js');

var clients = {};
var topics = {};

function OnConnect(sock) {
    sock.Write = function(json) {
        this.write(JSON.stringify(json)+os.EOL);
    }
    var remote_end = sock.remoteAddress+':'+sock.remotePort;
    log.debug('Connect start:', remote_end);
    clients[remote_end] = sock;
    sock.Write({topics: Object.keys(topics)});

    sock.on('error', function() {
        log.error('Connect', remote_end, 'error', err);
    });
    sock.on('end', function() {
        delete clients[remote_end];
        log.debug('Connect end:', remote_end);
    });
    sock.setEncoding('utf8');
    sock.pipe(new Utils.StringStreamSplitter(function(line) {
        try {
            var json = JSON.parse(line);
        }
        catch(err) {
            log.error('Input command decode error:', err);
            return;
        }
        log.debug('Request', line, 'from', remote_end);
        var topic = json.topic;
        var text = json.text;
        if(!topic) {
            sock.Write({error: 'Empty topic'});
        }
        else if(!text) {
            sock.Write({error: 'Empty text'});
        }
        else if(! (topic in topics) ) {
            sock.Write({error: 'Unknown topic'});
        }
        else {
            var answer = topics[topic].markov_chains.GetAnswer(text);
            log.debug('answer', answer);
            sock.Write({answer : answer});
        }
    }));
}

// run API server
var server = net.createServer(OnConnect);
server.listen(cfg.port||9090, cfg.host||'localhost');
server.on('error', function(err) {
    log.error('Server error:', err);
    process.exit(1);
})

// run topics watcher
var topics_dir = cfg.topics_dir || path_join(__dirname,'topics');
var topics_watcher = new DirWatcher(topics_dir, null, true);
topics_watcher
    .on(DirWatcher.EVENTS.NEW_ITEM, function(name, path) {
        log.debug('+ Topic:', name, path);
        var w = new DirWatcher(path_join(path,name), /.*\.txt$/)
            .on(DirWatcher.EVENTS.NEW_ITEM, function(i,p){ 
                log.debug('+ Text', i, 'for topic', name);
                fs.readFile(path_join(p,i), {encoding:'utf8'}, function(err, text){
                    if(err)
                        log.error('Text', i, 'read error', err);
                    else
                        topics[name].markov_chains.AddText(text);
                });
            })
            .on(DirWatcher.EVENTS.ITEM_REMOVED, function(i,p){ 
                log.debug('- Text', i, 'for topic', name)
            })
            .on(DirWatcher.EVENTS.ERROR, function(err){
                log.error('Topic', name, err);
                w.close();
            });
        topics[name] = { watcher: w, markov_chains: new MarkovChains({prefix_length: cfg.prefix_length || 3}) };
        for(var i in clients) {
            clients[i].write(JSON.stringify({topics: Object.keys(topics)})+os.EOL);
        }
    })
    .on(DirWatcher.EVENTS.ITEM_REMOVED, function(name, path) {
        log.debug('- Topic', name, path);
        topics[name].watcher.Stop();
        delete topics[name];
        for(var i in clients) {
            clients[i].write(JSON.stringify({topics: Object.keys(topics)})+os.EOL);
        }
    })
    .on(DirWatcher.EVENTS.ERROR, function(err) {
        log('Topics watcher error', err);
        for(name in topics) {
            topics[name].Stop();
            delete topics[name];
            process.exit(1);
        }
    });
