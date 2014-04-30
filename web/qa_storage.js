var crypto = require('crypto');
var fs = require('fs');
var log = require('log4js').getLogger('qas');

var qas = {};
var ids_creation = [];
var ids_rated = [];

(function ReadQA() 
{
    fs.readFile('./tmp/qa.txt', function(err, data){
        try{
            res = JSON.parse(data);
            qas = res.qas;
            ids_creation = res.ids_creation || [];
            ids_rated = res.ids_rated || [];
        }
        catch(e) {
            qas = {};
        }
    });
}());

function WriteQA()
{
    fs.writeFile('./tmp/qa.txt', JSON.stringify({
        qas:qas,
        ids_creation:ids_creation,
        ids_rated:ids_rated,
    }));
}

function UniqueId() 
{
    var id;
    do {
        id = crypto.randomBytes(4).toString('hex');
    } 
    while(id in qas);
    return id;
}

module.exports = {
    add: function(qa, cb) {
        log.debug('add', qa);
        var id = UniqueId();
        var new_qa = qa;
        new_qa.rate = 0;
        new_qa.id = id;
        new_qa.timestamp = Date.now();
        qas[id] = new_qa;
        ids_creation.push(id);
        ids_rated.push(id);
        cb(null, id);
        WriteQA();
    },
  
    get: function(id, cb) {
        var res = qas[id];
        if(res) {
            log.debug('get', id, res);
            cb(null, res)
        }
        else {
            log.error('get', id, 'wrong id');
            cb({message:{en:'Unknown question', ru: 'Неизвестный вопрос'}});
        }
    },

    increment_rate: function(id, cb) {
        var res = qas[id];
        if(res) {
            res.rate += 1;
            ids_rated.sort( function(id1,id2){ 
                return qas[id2].rate - qas[id1].rate;
            });
            cb(null, res);
            WriteQA();
        }
        else {
            cb({message:{en:'Unknown question', ru: 'Неизвестный вопрос'}});
        }
    },

    _get_n: function(offset, n, idx, cb) {
        var res = [];
        var ids = idx.slice(offset, offset+n);
        ids.forEach( function(id) {
            res.push(qas[id]);
        });
        log.debug('_get_n', offset, n, ids);
        cb(null, res);
    },

    get_n : function(offset, n, cb) { this._get_n(offset, n, ids_creation, cb); },

    get_n_by_rate : function(offset, n, cb) { this._get_n(offset, n, ids_rated, cb); }
};
