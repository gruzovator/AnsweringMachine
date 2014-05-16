var fs = require('fs');
var path = require('path');
var util = require('util');
var events = require('events');

// touch - gives to events REMOVED , ADDED
function DirWatcher(dir, file_pattern, subdirs_flag) {
    events.EventEmitter.call(this);
    var self = this;
    self.path = dir;
    self.pattern = file_pattern;
    self.files = {};
    self.is_subdirs = subdirs_flag;
    self.Start();
}
util.inherits(DirWatcher, events.EventEmitter);

DirWatcher.EVENTS = { NEW_ITEM: '+', ITEM_REMOVED: '-', ERROR: 'e' };

DirWatcher.prototype.Start = function() {
    var self = this;
    if(self.IsRunning()) return;
    fs.stat(self.path, function(err, stat){
        if(err) return self._OnError(err);
        if(!stat.isDirectory()) return self._OnError(new Error('Path to watch "' + self.path + '" is not a directory'));
        if(self.IsRunning()) return;
        self.fs_watcher = fs.watch(self.path, function() { self._Scan() });
        self._Scan();
    });
}

DirWatcher.prototype.ForceScan = function() {
    var self = this;
    if(!self.IsRunning())
        return self._OnError(new Error('Watcher is stopped'));
    self._Scan();
}

DirWatcher.prototype.Stop = function() {
    var self = this;
    if(!self.IsRunning()) return;
    self.fs_watcher.close();
    delete self.fs_watcher;
    for(var file_name in self.files)
        self.emit(DirWatcher.EVENTS.ITEM_REMOVED, file_name, self.path);
    self.files = {};
}

DirWatcher.prototype.IsRunning = function() {
    var self = this;
    return !!self.fs_watcher;
}

DirWatcher.prototype._Scan = function() {
    var self = this;
    fs.readdir(self.path, function(err, files){
        if(!self.IsRunning()) return;
        if(err) {
            self._OnError(err);
            return;
        }
        if(!files) {
            self.Stop();
            return;
        }
        var ff = {};
        for(var i=0; i<files.length; ++i) {
            var fpath = path.join(self.path,files[i]);
            var stat = fs.statSync(fpath);
            if(stat.isFile() && !files[i].match(self.pattern)) continue;
            if(stat.isDirectory() && !self.is_subdirs) continue;
            // file data
            ff[files[i]] = { 
                path: fpath, 
                mtime:stat.mtime.getTime(),
            };
        }
        // removed files
        for(var f in self.files) {
            if(f in ff && self.files[f].mtime===ff[f].mtime) continue;
            self.emit(DirWatcher.EVENTS.ITEM_REMOVED, f, self.path);
            delete self.files[f];
        }
        // new files
        for(var f in ff) {
            if(f in self.files) continue; 
            self.files[f] = ff[f];
            self.emit(DirWatcher.EVENTS.NEW_ITEM, f, self.path);
        }
    });
}

DirWatcher.prototype._OnError = function(err) {
    var self = this;
    if(err.code === 'ENOENT')
        err = new Error('Path to watch "' + self.path + '" doesn\'t exist');
    self.emit(DirWatcher.EVENTS.ERROR, err, self.path);
    self.Stop();
}

function Test() {
    var dir = process.argv[2] || '/tmp/test';
    var w = new DirWatcher(dir, /.*\.txt$/, true); //txt file + subdirs
    var log = console.log;
    w.on(DirWatcher.EVENTS.NEW_ITEM, function(name, path) {log('+', name, path)});
    w.on(DirWatcher.EVENTS.ITEM_REMOVED, function(name, path) {log('-', name, path)});
    w.on(DirWatcher.EVENTS.ERROR, function(err) {log('e', err)});
}

if(require.main === module)
    Test();

module.exports = DirWatcher;