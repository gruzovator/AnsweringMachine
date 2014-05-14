window.onload = Init;

function Init() {
    function MakeQA(qa) {
        var e = $('#qa_template').clone().attr('id',qa._id);
        $('.timestamp',e).text(new Date(qa.timestamp * 1000));
        $('.topic',e).text(qa.question.topic);
        $('.question',e).text(qa.question.text);
        $('.answer',e).text(qa.answer);
        var rate_elem = $('.rate', e);
        rate_elem.text(qa.rate);
        $('.link', e).attr('href', '/?qa='+qa._id).on('click',function(e){
            e.preventDefault();
            ActivateTab('answer', qa._id);
        });
        $('.btn_rate', e).on('click',function(e){
            $.ajax({ type:'PUT', url:'/default/qas/'+qa._id, 
                success: function(){ rate_elem.text(++qa.rate) }
            });
        });
        return e.show();
    }

    function UpdateTopics(){
        $.get('default/topics', function(topics) {
            var e = $('#ask select');
            e.empty();
            topics.forEach(function(topic){
                e.append('<option value="'+topic+'">' + topic + '</option>');// TODO
            });
        });
    }

    function ActivateTab(title, args) {
        $('.tab').hide();
        var f = tabs[title];
        if(!history.state)
             history.replaceState({tab:title, args:args}, title);
        else 
        if(history.state.tab!==title)
            history.pushState({tab:title, args:args}, title);
        tabs[title](args);
    }

    var tabs={};

    tabs.ask = (function(){
        UpdateTopics();
        var tab = $('#ask');
        var ctrl = {
            btn_ask : $('button.ask', tab),
            cbx_topics: $('select.topics', tab),
            txt_question: $('textarea.question', tab)
        };
        ctrl.btn_ask.on('click', function(){
            $.ajax({type:'POST', url:'/default/qas/', 
                data: {
                    topic: ctrl.cbx_topics.val(), 
                    question: ctrl.txt_question.val() },
                success: function(reply){ ActivateTab('answer', reply); }
            });
        });
        return function() {
            tab.show();
            ctrl.txt_question.val('');
        }
    }());

    tabs.answer = (function(){
        $('#qa_template').hide();
        var tab = $('#answer');
        return function(qa) {
            if(typeof(qa)==='object') {
                tab.empty();
                tab.append(MakeQA(qa));
                tab.show();
            }
            else {
                var id = qa;
                $.ajax({
                    type:'GET',
                    url:'/default/qas/'+id,
                    success: function(qa){ ActivateTab('answer', qa) },
                    error:function(xhr, error_type, error){ ActivateTab('ask') }
                });
            }
        }
    }());

    tabs.qas = (function(){
        var tab = $('#qas');
        var qas_list = $('#qas_list');

        var skip = 0;
        var number = 5;
        var ctrl ={
            btn_prev: $('.btn_prev', tab),
            btn_next: $('.btn_next', tab),
            cbx_sort: $('.cbx_sort', tab),
        }

        ctrl.btn_next.on('click', function(){
            skip+=number;
            ShowQas();
        });

        ctrl.btn_prev.on('click', function(){
            skip-=number;
            ShowQas();
        });

        ctrl.cbx_sort.on('change', function(){
            skip = 0;
            ShowQas();
        })

        function ShowQas() {
            tab.show();
            if(skip<=0) {
                ctrl.btn_prev.hide();
                skip = 0;
            }
            else
                ctrl.btn_prev.show();
            var url = 'default/qas?skip='+skip+'&number='+number;
            if(ctrl.cbx_sort.val()=='rate')
                url+='&sort=1'
            $.get(url, function(qas){
                qas_list.empty();
                qas.forEach(function(qa){ qas_list.append(MakeQA(qa)) });
                if(qas.length<number)
                    ctrl.btn_next.hide();
                else
                    ctrl.btn_next.show();
            });
        }
        return ShowQas;
    }());

    tabs.about = function() { $('#about').show(); };

    $('a').on('click', function(e){e.preventDefault();});
    $('a.tab_link').on('click', function(e){
        var title = e.target.getAttribute('title');
        $('#menu a').removeClass('active');
        $(e.target).addClass('active');
        ActivateTab(title);
    });

    $(window).on('popstate', function(e) {
        var state = e.state;
        if(state && state.tab)
            ActivateTab(state.tab, state.args);
    });

    if(window.location.search.length > 1) {
        var qa_id = window.location.search.substr(1).split("=")[1];
    }
    if(qa_id) {
        history.replaceState({tab:'qas'}, 'qas','/');
        ActivateTab('answer', qa_id);
    }
    else ActivateTab('ask');
}



