window.onload = Init;

function MakeDateTimeStr(dt) {
    function fw(str) {
        var size = 2;
        if(str.length >= size) return str;
        str = new Array(size+1).join('0') + str;
        return str.slice(-size);
    }
    return dt.getFullYear() + '-' + fw(dt.getMonth()+1) + '-' + fw(dt.getDate())+ ' '
        + fw(dt.getHours()) + ':' 
        + fw(dt.getMinutes()) + ':'
        + fw(dt.getSeconds());
}

function Init() {
    function OnAjaxError(xhr, error_type, error) {
        var code = 1; //connection problem
        if(error_type==='error') code = xhr.status;
            ActivateTab('error', code);            
    }

    function MakeQA(qa) {
        var e = $('#qa_template').clone().attr('id',qa._id);
        $('.timestamp .value',e).text(MakeDateTimeStr(new Date(qa.timestamp * 1000)));
        $('.topic .value',e).text(qa.question.topic);
        var qt = qa.question.text;
        if(qt.substr(-1)!=='?')
            qt+=' ?'
        $('.question .value',e).text(qt);
        $('.answer .value',e).text(qa.answer);
        $('.link a', e).attr('href', '/?qa='+qa._id).on('click',function(e){
            e.preventDefault();
            ActivateTab('answer', qa._id);
        });
        var rate_elem = $('.rate .value', e);
        rate_elem.text('+' + qa.rate);
        rate_elem.on('click',function(e){
            $.ajax({ type:'PUT', url:'/default/qas/'+qa._id, 
                success: function(){ rate_elem.text('+' + ++qa.rate) },
                error: OnAjaxError
            });
        });
        return e.show();
    }

    function UpdateTopics(){
        $.get('default/topics', function(topics) {
            var e = $('.topics select', '#ask');
            e.empty();
            topics.forEach(function(topic){
                e.append('<option value="'+topic+'">' + topic + '</option>');
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
            btn_ask : $('.question_input button', tab),
            cbx_topics: $('.topics select', tab),
            txt_question: $('.question_input textarea', tab)
        };
        ctrl.btn_ask.on('click', function(){
            var t = ctrl.cbx_topics.val();
            var q = ctrl.txt_question.val();
            if(q.length==0 || t.length==0)
                return;
            $.ajax({type:'POST', url:'/default/qas/', 
                data: { topic: t, question: q },
                success: function(reply){ ActivateTab('answer', reply); },
                error: OnAjaxError
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
        var tab_content = $('.answer_tab_content', tab);
        return function(qa) {
            if(typeof(qa)==='object') {
                tab_content.empty();
                tab_content.append(MakeQA(qa));
                tab.show();
            }
            else {
                var id = qa;
                $.ajax({
                    type:'GET',
                    url:'/default/qas/'+id,
                    success: function(qa){ ActivateTab('answer', qa) },
                    error: OnAjaxError
                });
            }
        }
    }());

    tabs.qas = (function(){
        var tab = $('#qas');
        var qas_list = $('.qas_list', tab);

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
                ctrl.btn_prev.addClass('hidden');
                skip = 0;
            }
            else
                ctrl.btn_prev.removeClass('hidden');
            var url = 'default/qas?skip='+skip+'&number='+number;
            if(ctrl.cbx_sort.val()=='rate')
                url+='&sort=1'
            $.get(url, function(qas){
                qas_list.empty();
                qas.forEach(function(qa){ qas_list.append(MakeQA(qa)) });
                if(qas.length<number)
                    ctrl.btn_next.addClass('hidden');
                else
                    ctrl.btn_next.removeClass('hidden');
            });
        }
        return ShowQas;
    }());

    tabs.about = function() { $('#about').show(); };

    tabs.error = function(code) {
        var tab = $('#error').show(); 
        $('.err_str', tab).hide();
        var i = $('.e_'+code);
        if(!i) i = $('.e_'+0);
        i.show();
    };

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
