Init();

function Init() {
    
    // handlers

    $('#menu a').on('click', function(e){
        $('.sub').hide();
        var id = e.toElement.getAttribute('href');
        switch(id) {
            case '#ask':
                ShowAsk();
                break;
            case '#qas':
                ShowQas(skip, n);
                break;
        }
        $(id).show();
    });

    $('#ask button').on('click', function(){
        var data = {
            topic: $('#ask select').val(),
            question: $('#ask textarea').val()
        };
        $.post('/default/qas', data, ShowAnswer);
    });

    // Answer page
    $('#answer button').on('click', ShowAsk);

    // Q&As page
    var skip = 0;
    var n = 5;
    $('.prev', '#qas').on('click', function(){ 
        skip-=n;
        ShowQas(skip, n);
    });
    $('.next', '#qas').on('click', function(){ 
        skip+=n;
        ShowQas(skip, n);
    });
    
    //

    UpdateTopics();
    ShowAsk();
}

function ShowAsk() {
    $('.sub').hide();
    $('#ask').show();
    $('#ask textarea').val('');
}

function UpdateTopics(){
    $.get('default/topics', function(topics) {
        var e = $('#ask select');
        e.empty();
        topics.forEach(function(topic){
            e.append('<option value="'+topic+'">' + topic + '</option>');
        });
    });
}

function ShowAnswer(qa){
    $('.sub').hide();
    $('#answer').show();
    $('.topic', '#answer').text(qa.question.topic);
    $('.question', '#answer').text(qa.question.text);
    $('.answer', '#answer').text(qa.answer);
}

function ShowQas(skip, number){
    if(skip<=0) {
        $('.prev', '#qas').hide();
        skip=0
    }
    else
        $('.prev', '#qas').show();

    $.get('default/qas?skip='+skip+'&number='+number, function(qas){
        var e = $('#qas_list');
        e.empty();
        qas.forEach(function(qa){
            var date = new Date(qa.timestamp * 1000);
            e.append('<p>'+date.toString()+'</p>');
            e.append('<p>'+qa.question.topic+'</p>');
            e.append('<p>'+qa.question.text+'</p>');
            e.append('<p>'+qa.answer+'</p>');
            e.append('<br />');
        });
        for(var i=0; i<qas.length; ++i) {
        }
        if(qas.length==0)
            $('.next', '#qas').hide();
        else
            $('.next', '#qas').show();
    });
}
