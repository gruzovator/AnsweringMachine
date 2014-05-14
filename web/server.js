#!/usr/bin/env node
var path = require('path');
var express = require('express');
var BodyParser = require('body-parser');
var log4js = require('log4js');
var cfg = require('./config.js');
var mongo  = require('mongoskin');
var log = log4js.getLogger('WebServer');
var util = require('util')

//-------------
// Stub
//-------------
var answering_machine = {
    _seed: 0,
    ask: function(question, cb) {
        cb(null, 'random text ' + (++this._seed));
    },
    topics: function(){ return [ 'topic 1', 'topic 2'] }
};

//-------------
// Utils
//-------------
function escape(html){
    var result = String(html)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    if (result === '' + html) return html;
    else return result;
}

function IsString(smth) {
    return typeof(smth) == 'string' || smth instanceof String;
}

var ERRORS = {
    BAD_REQUEST : 400,
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    NOT_ACCEPTABLE: 406,
    INTERNAL: 500,
};

function MakeError(code, msg) {
    var err = new Error(msg);
    err.status = code;
    return err;
}

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
app.use(BodyParser());

//------------------------------
// API
//------------------------------
app.use(function(req, res, next){
    req.collection = db.collection('default', {strict: true}, function(err){ return next(err) });
});

app.route('/qas')
    .get(function(req, res, next){
        var skip = parseInt(req.query.skip) || 0;
        var number = Math.min(parseInt(req.query.number) || 10, 100);
        var sort = req.query.sort ? [['rate', -1]] : [['_id',-1]];
        req.collection.find({},{skip: skip, limit:number, sort: sort}).toArray(
            function(err, qas) {
                if (err) return next(err);
                res.format({
                    html: function(){ res.render('qas', {qas:qas}) },
                    json: function(){ res.send(qas) }
                });
            });
    })
    .post(function(req, res, next){
        var q = {
            topic: escape(req.body.topic),
            text: escape(req.body.question)
        };
        if(!IsString(q.topic) || q.topic.length==0 )
            return next(MakeError(ERRORS.BAD_REQUEST, 'Wrong topic'));
        if(!IsString(q.text) || q.text.length==0 )
            return next(MakeError(ERRORS.BAD_REQUEST, 'Wrong text type or empty text'));
        answering_machine.ask(q, function(err, answer){
            if(err) return next(err);
            var qa = {
                timestamp: Date.now()/1000 | 0,
                question: q,
                answer: answer,
                rate: 0
            }
            req.collection.insert(qa, {}, function(err, results){
                if(err) return next(err);
                var qa = results[0];
                if(!qa)
                    return next(MakeError(ERRORS.INTERNAL, 'QAs Storage Error'));
                res.format({
                    html: function(){ res.render('qa', {qa:qa}) },
                    json: function(){ res.send(qa) }
                });
            });
        });
    });

app.route('/qas/:id')
    .get(function(req, res, next){
        req.collection.findById(req.params.id, function(err, qa){
            if(err) return next(err);
            if(!qa) return next(MakeError(ERRORS.NOT_FOUND));
            res.format({
                html: function(){ res.render('qa', {qa:qa}) },
                json: function(){ res.send(qa) }
            });
        });
    })
    .put(function(req, res, next){ //TODO: only once per session
        req.collection.updateById(req.params.id, {$inc:{rate: 1}}, {safe:true, multi:false}, 
            function(err, result){
                if (err) return next(err);
                if(result!==1) return next(MakeError(ERRORS.NOT_FOUND));
                res.format({
                    json: function(){ res.send() }
                });
            });
    })
    .delete(function(req, res, next) {
        req.collection.removeById(req.params.id, 
            function(err, result){
                if (err) return next(err);
                if(result!==1) return next(MakeError(ERRORS.NOT_FOUND));
                res.format({
                    html: function(){ res.redirect('../') },
                    json: function(){ res.send() }
                });
            });
    });

app.get('/ask', function(req, res, next){
    res.format({
        html: function(){ res.render('ask', {topics: answering_machine.topics()}) }
    });
});

app.get('/about', function(req, res, next){
    res.format({
        html: function(){ res.render('about') }
    });
});

//------------------------------
// Not found and errors handling
//------------------------------
app.use(function(req,res, next) {
    next(MakeError(ERRORS.NOT_FOUND,'Path ' + req.url + ' not found'));
});

if(app.get('env') === 'development') {
    app.locals.pretty = true;
    app.use(function(err, req, res, next) {
        err.status = err.status || 500;
        res.format({
            html: function(){ res.status(err.status).render('error', {err:err}) },
            default: function(){ res.send(err.status, err)}
        });
    });
}

app.use(function(err, req, res, next) {
    err.status = err.status || 500;
    res.format({
        html: function(){ res.status(err.status).render('error', {err: {status : err.status}}) },
        default: function(){ res.send(err.status) }
    });
});

//----------------------------------
// Run 
//----------------------------------
app.listen(cfg.port || 3000)
