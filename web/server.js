#!/usr/bin/env node
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var log4js = require('log4js');
var cfg = require('./config.js');
var mongo  = require('mongoskin');
var fs = require('fs');
var log = log4js.getLogger('WebServer');

var answering_machine = {
    ask: function(question, cb) {
        cb(null, 'random text');
    },
    topics: [ 'test1', 'test2']
}

//-------------
// DB setup
//-------------
var db = mongo.db('mongodb://@localhost:27017/AnsweringMachine', {safe:true});

//-------------
// Server setup
//-------------
var app = express();
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
var ui = fs.readFileSync('public/ui.html', {encoding: 'utf8'});
app.get('/', function(req, res, next){
    res.send(ui);
});
//------------------------------
// REST API
//------------------------------
app.get('/:user/qas', function(req, res, next){
    var skip = parseInt(req.query.skip) || 0;
    var number = Math.min(parseInt(req.query.number) || 10, 100);
    req.collection.find({},{skip: skip, limit:number, sort: [['_id',-1]]}).toArray(
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
        topic: req.body.topic,
        text: req.body.question
    };
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
            res.send(result);
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
    app.use(function(err, req, res, next) {
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

