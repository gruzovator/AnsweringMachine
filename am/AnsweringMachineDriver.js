var path_join = require('path').join;
var DirWatcher = require('./DirWatcher.js');

var cfg = {};
var log = console.log;

function MarkovChains() {
}
MarkovChains.prototype.AddFile = function(fname) {
}
MarkovChains.prototype.Answer = function(question) {
    return 'answer';
}


function main() {
    var topics_dir = cfg.topics_dir || path_join(__dirname,'topics');
    var topics = {};
    var topics_watcher = new DirWatcher(topics_dir, null, true);
    topics_watcher
        .on(DirWatcher.EVENTS.NEW_ITEM, function(name, path) {
            log('+topic', name, path);
            topics[name].watcher = new DirWatcher(path_join(path,name), /.*\.txt$/)
                .on(DirWatcher.EVENTS.NEW_ITEM, function(i,p){ log('+text', i, p)})
                .on(DirWatcher.EVENTS.ITEM_REMOVED, function(i,p){ log('-text', i, p)})
                .on(DirWatcher.EVENTS.ERROR, function(e, p){ log('topic watcher error', e, p)});
            topics[name].markov_chains = new MarkovChains();
        })
        .on(DirWatcher.EVENTS.ITEM_REMOVED, function(name, path) {
            log('-topic', name, path);
            topics[name].watcher.Stop();
            delete topics[name];
        })
        .on(DirWatcher.EVENTS.ERROR, function(err) {
            log('topics watcher error', err);
            for(name in topics) {
                topics[name].Stop();
                delete topics[name];
            }
        });
}

if(require.main === module)
    main();