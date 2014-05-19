var util = require('util');
var os = require('os');
var stream = require('stream');

util.inherits(StringStreamSplitter, stream.Writable);

function StringStreamSplitter(cb, separator) {
    stream.Writable.call(this, {decodeStrings: false});
    this.separator = separator || os.EOL;
    this.line_cb = cb;
    this.buf = '';
}

StringStreamSplitter.prototype._write = function(str, _, done) {
    if(!str) return done();
    this.buf+=str;
    var parts = this.buf.split(this.separator);
    if(parts.length==1) return done();
    var last = parts.length - 1;
    for(var i = 0; i<last; ++i) {
        this.line_cb(parts[i]);
    }
    this.buf = parts[last];
    if(this.buf.length > 1024)
        return done(new Error('Input line is too long'));
    done();
}

function TestStringStreamSplitter() {
    var input = ['line1', 'line 2'].join(os.EOL) + os.EOL;
    var output = '';
    
    var rs = new stream.Readable();
    rs._read = function(){}
    rs.setEncoding('utf8');

    var splitter = new StringStreamSplitter(function(line){ 
        output+=(line+os.EOL); 
    });
    
    rs.pipe(splitter);
    rs.push(input);
    rs.push(null);

    splitter.on('finish', function(){ 
        console.log('StringStreamSplitter Test -', output===input ? 'OK' : 'ERROR')
    });
}

if(require.main === module) {
    TestStringStreamSplitter();
}

module.exports = {
    StringStreamSplitter : StringStreamSplitter
}

for(var i in util) {
    module.exports[i] = util[i];
}


