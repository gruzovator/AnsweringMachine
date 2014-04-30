#!/usr/bin/env node
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var log4js = require('log4js');
var cfg = require('./config.js');
var main_route = require('./main_route.js')

//-------------
// Server setup
//-------------
var app = express();
app.locals.lang = cfg.lang || 'ru';
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(log4js.connectLogger(log4js.getLogger('Web')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser());
app.use(main_route);

//------------------------------
// Not found and errors handling
//------------------------------

app.use(function(req,res, next){
    next({status: 404, message: 'Not found'});
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

//----------------------------------
// Run server
//----------------------------------
app.listen(cfg.port || 3000)

