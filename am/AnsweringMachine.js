var fs = require('fs');
var path = require('path');
var MSGS = require('../Common.js').messages;
var MarkovChains = require('./MarkovChains.js');
var log = require('log4js').get_logger('AMachine');

var _SendMessage = process.send ? 
        function() { process.send(arguments[0]) } : 
        function(msg) { log(msg) };

function SendMessage(type, value)
{
    _SendMessage({type:type, value:value});
}

var topics = {};

function Rescan(dir, cb) 
{
    fs.readdir(dir, function(err, items){
        if(err) throw err;

        // remove removed tex generators
        Object.keys(topics).forEach( function(key){
            if(items.indexOf(key)==-1) {
                delete topics[key];
                SendMessage(MSGS.TOPIC_REMOVED, key);
            }
        });

        // add or update text generators
        items.forEach(function(item) {
            MakeTextGenerator(path.join(dir, item), function(err, text_generator){
                if(err) log('ERROR making text generator', item, err);
                else if(text_generator){
                    var new_topic = true;
                    if(topics[item])
                        new_topic = false;
                    topics[item] = text_generator;
                    if(new_topic) {
                        SendMessage(MSGS.NEW_TOPIC, item);
                    }
                }
            });
        });
    });
}

function main()
{
    var topics_dir = process.argv[2] || path.join(__dirname,'topics');
    fs.stat(topics_dir, function(err, stats){
        if(err) throw err;
        if(stats.isDirectory()) {
            Rescan(topics_dir);
            fs.watchFile(topics_dir, function(curr,prev){
                Rescan(topics_dir);
            });
        }
        else {
            process.exit();
        }
    });

    // 
    process.on('message', function(msg) {
        var type = msg.type;
        if(type === MSGS.QUESTION) {
            var topic = topics[msg.value.topic];
            var question = msg.value.question;
            if(topic) {
                topic.GetAnswer(question||'', function(answer){
                    SendMessage(MSGS.ANSWER, answer);
                });
            }
            else {
                SendMessage(MSGS.ANSWER, 'RTFM');
            }
        }
    });
}

if(require.main === module)
    main();