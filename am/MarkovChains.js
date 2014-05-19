function TextToWords(text)
{
    var ww = text.split(/[\n\t\s,()?!\[\]"«»]+/);
    var words = [];
    ww.forEach(function(word){
        if(word.length>0) {
            if(word.charAt(word.length-1)=='.')
                words.push(word.substring(0,word.length-1).toLowerCase(), '.');
            else
                words.push(word.toLowerCase())
        }
    });
    return words;
}

function MarkovChains(options)
{
    var self = this;
    options = options || {};
    self.prefix_length = options.prefix_length || 3;
    self.chains_n = 0;
    self.chains = {};
    self.MAX_SENTENCE_WORDS = 48;
}

MarkovChains.prototype.AddText = function(text)
{
    var self = this;
    var words = TextToWords(text);
    var prefix = [];
    for(var i=0; i<self.prefix_length; ++i) {
        prefix.push('');
    }
    for(var i=0, max=words.length; i<=max; ++i) { //last chain contains [undefined]
        var w = words[i];
        if(self.chains[prefix])
            self.chains[prefix].push(w);
        else {
            self.chains[prefix] = [w];
            ++self.chains_n;
        }
        prefix.push(w);
        prefix.shift();
    }
}

MarkovChains.prototype.GetRandomSentence = function() 
{
    var self = this;
    var rand_prefix_idx = Math.random()*self.chains_n | 0;
    var i=0;
    for(var prefix in self.chains) {
        if(i==rand_prefix_idx) {
            //log('start prefix', prefix)
            return self._GetRandomSentence(prefix.split(','));
        }
        ++i;
    }
    return '';
}

MarkovChains.prototype._GetRandomSentence = function(start_prefix_array)
{
    var self = this;
    var prefix = start_prefix_array;
    var words = [];
    var capital = true;
    while(true) {
        var chain = self.chains[prefix] || [];
        var w = chain[chain.length*Math.random() | 0];
        prefix.push(w);
        w = prefix.shift();
        if(w===undefined || words.length >= self.MAX_SENTENCE_WORDS)
            break;
        if(w==='--' || w === '•')
            continue;
        if(w==='.' || w==='?' || w==='!') {
            if(words.length)
                words[words.length-1]+=w;
            capital = true;
            continue;
        }
        if(w.length>0) {
            if(capital) {
                w = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                capital = false;
            }
            words.push(w);
        }
    }
    var s = words.join(' ');
    if(words.length==0)
        return '';
    return s + '.';
}

MarkovChains.prototype.GetAnswer = function(question)
{
    var self = this;

    var start_prefixes = {};
    var qwords = TextToWords(question);

    for(var prefix in self.chains) {
        for(var i = qwords.length-1; i>=0; --i) {
            var w = qwords[i];
            if(w.length<3) break;
            if(prefix.indexOf(w)!=-1)
                if(start_prefixes.hasOwnProperty(prefix))
                    start_prefixes[prefix]+=1;
                else
                    start_prefixes[prefix]=1;
        }
    }
    var max = 0;
    var max_prefixes = [];
    for(prefix in start_prefixes) {
        var weight = start_prefixes[prefix]
        if(weight > max) {
            max = weight;
            max_prefixes = [prefix];
        }
        if(weight==max) {
            max_prefixes.push(prefix);
        }
    }
    //console.log(max_prefixes);
    if(max_prefixes.length == 0 ) {
        return self.GetRandomSentence();
    }
    return self._GetRandomSentence(max_prefixes[ max_prefixes.length * Math.random() | 0 ].split(','));
}

module.exports = MarkovChains;

if(require.main === module) {
    Test();
}

MarkovChains.prototype.GetFullAnswer = function(question)
{
    var self = this;
    var words = TextToWords(question);
    var ss = [self.GetAnswer(question)];
    var n = 1 + (Math.random()*3 | 0);
    for(var i=0; i<n; ++i) {
        var w = words[words.length*Math.random()|0];
        ss.push(self.GetAnswer(w));
    }
    return ss.join(' ');
}

function Test() {
    var fs = require('fs');
    fs.readFile('./tests/text.txt', {encoding: 'utf8'}, function(err, text){
        if(err) throw err;
        var chains = new MarkovChains({prefix_length:3});
        chains.AddText(text);
        var text = chains.GetRandomSentence();
        console.log('Random Sentence:');
        console.log(text);
        var question = 'где был ростов';
        console.log('Question:', question);
        text = chains.GetFullAnswer(question);
        console.log('Answer:', text);
    });
}
