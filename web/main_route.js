var express = require('express');
var router = express.Router();
var qa_storage = require('./qa_storage.js');

var answering_machine = {
    ask: function(question, cb) {
        cb(null, 'random text');
    },
    topics: [ 'test1', 'test2']
}

router.get('/',function(req, res) { res.redirect('ask'); });

router.route('/ask')
.get(function(req, res) { 
    res.render('ask', {topics: answering_machine.topics}); 
})
.post(function(req, res) {
    var q = {
        topic: req.body.topic,
        text: req.body.question
    };
    if(!q.topic || !q.text) {
        res.redirect(req.path)
    }
    else {
        answering_machine.ask(q, function(err, answer){
            if(err) throw err;
            qa_storage.add(
                {topic: q.topic, question:q.text, answer:answer}, 
                function(err, id){
                    if(err) throw err;
                    res.redirect('/qas/'+id);
                });
        });      
    }
});

router.route('/qas')
.get(function(req, res) {
    var records_n = 5;
    var offset = parseInt(req.query.offset) || 0;
    if(offset<0) offset = 0;
    var prev = offset-records_n;
    if(prev<0) prev = 0;
    var prev_link = prev<offset ? req.path + '?offset='+ prev : null;
    var next_link = req.path + '?offset='+(offset+records_n);

    var f = 'get_n';
    if(req.query.sort!==undefined) {
        if(prev_link) prev_link+='&sort';
        next_link+='&sort';
        f = 'get_n_by_rate';
    }
    qa_storage[f].call(qa_storage, offset, records_n, function(err,qas){
        if(err) qas = [];
        if(qas.length<records_n)
            next_link = null;
        res.render('qas', {qas:qas, prev_link:prev_link, next_link:next_link});
    });
});

router.route('/qas/:id')
.get(function(req, res) {
    qa_storage.get(req.params.id, function(err, qa){
        if(err) throw err;
        res.render('qa', {qa:qa});
    });
})
.post(function(req, res) {
    qa_storage.increment_rate(req.body.id, function(err, qa){
        if(err) throw err;
        res.render('qa', {qa:qa});
    });
});

router.get('/about', function(req,res){
    res.render('about');
});


module.exports = router;
