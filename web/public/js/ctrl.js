window.onload = Init;

function Init() {
    var tabs={};

    tabs.ask = (function(){
        UpdateTopics();
        var c = '#ask';
        $('button', c).on('click', function(){
            var data = {
                topic: $('select', c).val(),
                question: $('textarea', c).val()
            };
            $.ajax({type:'POST', url:'/default/qas/', data: data,
                success: function(reply){ ActivateTab('answer', [reply]); }
            });
        });
        return function() {
            $(c).show();
            $('textarea', c).val('');
        }
    }());

    tabs.answer = (function(){
        var c = '#answer';
        return function(qa) {
            if(typeof(qa)==='object') {
                FillQA($('#qa', c), qa);
                $(c).show();
            }
            else {
                var id = qa;
                $.ajax({
                    type:'GET',
                    url:'/default/qas/'+id,
                    success: function(qa){ tabs.answer(qa) },
                    error:function(xhr, error_type, error){ ActivateTab('ask') }
                });
            }
        }
    }());

    tabs.qas = (function(){
        var c = '#qas';
        var skip = 0;
        var number = 5;
        var sort_by_rate = false;
        var sort_by_date_elem = $('[title="sort_by_date"]', c);
        var sort_by_rate_elem = $('[title="sort_by_rate"]', c);

        $('[title="next"]', c).on('click', function(){
            skip+=number;
            ShowQas();
        });

        $('[title="prev"]', c).on('click', function(){
            skip-=number;
            ShowQas();
        });

        sort_by_date_elem.on('click', function(e){
            if(sort_by_rate===false) return;
            sort_by_rate = false;
            skip = 0;
            sort_by_date_elem.hide();
            sort_by_rate_elem.show();
            ShowQas();
        })
        sort_by_date_elem.hide();

        sort_by_rate_elem.on('click', function(){
            if(sort_by_rate===true) return;
            sort_by_rate = true;
            skip = 0;
            sort_by_rate_elem.hide();
            sort_by_date_elem.show();
            ShowQas();
        });
        sort_by_rate_elem.show();

        function ShowQas() {
            $(c).show();
            if(skip<=0) {
                $('[title="prev"]', c).hide();
                skip = 0;
            }
            else
                $('[title="prev"]', c).show();

            var url = 'default/qas?skip='+skip+'&number='+number;
            if(sort_by_rate)
                url+='&sort=1'
            $.get(url, function(qas){
                var e = $('#qas_list');
                e.empty();
                qas.forEach(function(qa){ 
                    var qa_div = $('#qa').clone().removeAttr('id');
                    FillQA(qa_div, qa);
                    e.append(qa_div);
                });
                if(qas.length<number)
                    $('[title="next"]', c).hide();
                else
                    $('[title="next"]', c).show();
            });

        }
        return ShowQas;
    }());

    tabs.about = function() { $('#about').show(); };

    function ActivateTab(title, args) {
        $('.tab').hide();
        tabs[title].apply(window, args);
    }
    $('a').on('click', function(e){e.preventDefault();});
    $('button').on('click', function(e){e.preventDefault();});

    $('a.tab_link').on('click', function(e){
        var title = e.toElement.getAttribute('title');
        ActivateTab(title);
    });

    // history handling
    for(i in tabs) {
        (function(title){
            var f = tabs[title];
            tabs[title] = function() {
                var args = Array.prototype.slice.call(arguments);
                if(!history.state)
                    history.replaceState({tab:title, args:args});
                else 
                if(history.state.tab!==title)
                    history.pushState({tab:title, args:args});
                f.apply(window,args);
            }
        }(i));
    }
    $(window).on('popstate', function(e) {
        var state = e.state;
        if(state && state.tab)
            ActivateTab(state.tab, state.args);
    });

    if(window.location.search.length > 1) {
        var qa_id = window.location.search.substr(1).split("=")[1];
    }
    if(qa_id) ActivateTab('answer', [qa_id.toString()]);
    else ActivateTab('ask');
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

function FillQA(e,qa) {
    if(qa._id) {
        e.show();
        $('.timestamp',e).text(new Date(qa.timestamp * 1000));
        $('.topic',e).text(qa.question.topic);
        $('.question',e).text(qa.question.text);
        $('.answer',e).text(qa.answer);
        var rate_elem = $('.rate',e);
        rate_elem.text(qa.rate);
        $('.link',e).attr('href', '/?qa='+qa._id);
        $('.btn_rate', e).on('click',function(e){
            $.ajax({ type:'PUT', url:'/default/qas/'+qa._id, 
                success: function(){ rate_elem.text(++qa.rate); }
            });
        });
    }
    else {
        e.hide();
    }
}

