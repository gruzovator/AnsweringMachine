#!/usr/bin/env node
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var log4js = require('log4js');
var cfg = require('./config.js');
var mongo  = require('mongoskin');
var log = log4js.getLogger('WebServer');

var answering_machine = {
    _seed: 0,
    ask: function(question, cb) {
        cb(null, 'random text ' + (++this._seed));
    },
    topics: [ 'topic 1', 'topic 2']
}

function escape(html){
    var result = String(html)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    if (result === '' + html) return html;
    else return result;
};


//-------------
// DB setup
//-------------
var db = mongo.db('mongodb://@localhost:27017/AnsweringMachine', {safe:true});

//-------------
// Server setup
//-------------
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(log4js.connectLogger(log4js.getLogger('Web')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser());
app.param('user', function(req, res, next, collection_name){
    if(collection_name!=='default')
        return res.send(404);
    req.collection = db.collection(collection_name, {strict: true}, function(err){
        return next(err);
    });
});

//------------------------------
// WEB UI
//------------------------------
app.get('/', function(req, res, next){
    res.render('ui');
});
//------------------------------
// REST API
//------------------------------
app.get('/:user/qas', function(req, res, next){
    var skip = parseInt(req.query.skip) || 0;
    var number = Math.min(parseInt(req.query.number) || 10, 100);
    var sort = [['_id',-1]];
    if(req.query.sort)
        sort=[['rate', -1]];
    req.collection.find({},{skip: skip, limit:number, sort: sort}).toArray(
        function(err, results) {
            if (err) return next(err);
            res.send(results);
        });
});

app.get('/:user/topics', function(req, res, next){
    res.send(answering_machine.topics);
});

app.post('/:user/qas', function(req, res, next){
    var q = {
        topic: escape(req.body.topic),
        text: escape(req.body.question)
    };
    if(answering_machine.topics.indexOf(q.topic)==-1){
        return res.send(400, 'unknown topic');
    }
    if(q.text.length==0)
        return res.send(400, 'empty text');
    answering_machine.ask(q, function(err, answer){
        if(err) return next(err);
        var qa = {
            timestamp: Date.now()/1000 | 0,
            question: q,
            answer: answer,
            rate: 0
        }
        req.collection.insert(qa, {}, function(err, result){
            if(err) return next(err);
            res.send(result[0]);
        });
    });
})

app.get('/:user/qas/:id', function(req, res, next) {
    req.collection.findById(req.params.id, function(err, result){
        if(err) return next(err);
        res.send(result);
    });
});

app.put('/:user/qas/:id', function(req, res, next) {
    req.collection.updateById(req.params.id, {$inc:{rate: 1}}, {safe:true, multi:false}, 
        function(err, result){
            if (err) return next(err);
            if(result===1)
                res.send('OK');
            else
                res.send(404);
        });
});

app.del('/:user/qas/:id', function(req, res, next) {
    req.collection.removeById(req.params.id, function(err, result){
        if (err) return next(err);
        if(result===1)
            res.send('OK');
        else
            res.send(404);
    });
});

//------------------------------
// Not found and errors handling
//------------------------------
app.use(function(req,res, next) {
    next({status: 404, message: 'Not found'});
});
if (app.get('env') === 'development') {
    app.locals.pretty = true;
    app.use(function(err, req, res, next) {
        log.error(err);
        res.send(err.status || 500, { msg: err.message, err:err });
    });
}
app.use(function(err, req, res, next) {
        res.send(err.status || 500);
});

//----------------------------------
// Run server
//----------------------------------
app.listen(cfg.port || 3000)

