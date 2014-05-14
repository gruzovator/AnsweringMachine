window.onload = Init;

function Init() {
    $('button.rate', '.qa').on('click', function(){
        $.ajax({ type:'PUT', url:'/qas/'+$(this).attr('qa_id'),
            success: function(){ console.log('1') }
        })
    });
}
//     }
//         }));


//     var tabs={};

//     tabs.ask = (function(){
//         UpdateTopics();
//         var c = '#ask';
//         $('button', c).on('click', function(){
//             var data = {
//                 topic: $('select', c).val(),
//                 question: $('textarea', c).val()
//             };
//             $.post('/default/qas', data, function(reply){
//                 $(c).hide();
//                 tabs.answer(reply);
//             });
//         });
//         return function() {
//             $(c).show();
//             $('textarea', c).val('');
//         }
//     }());

//     tabs.answer = (function(){
//         var c = '#answer';
//         var current_qa;
//         $('#btn_rate', c).on('click',function(e){
//             if(current_qa) {
//                 $.ajax({
//                     type:'PUT',
//                     url:'/default/qas/'+current_qa._id,
//                     success: function(){ tabs.answer(current_qa._id); }
//                 });
//             }
//         });
//         return function(qa) {
//             $(c).show();
//             if(typeof(qa)==='object') {
//                 current_qa = qa;
//                 FillQA($('#qa', c), qa);
//             }
//             else {
//                 var id = qa;
//                 $.get('/default/qas/'+id, function(qa){
//                     tabs.answer(qa);
//                 });
//             }
//         }
//     }());

//     tabs.qas = (function(){
//         var c = '#qas';
//         var skip = 0;
//         var number = 5;
//         var sort_by_rate = false;
//         var sort_by_date_elem = $('[title="sort_by_date"]', c);
//         var sort_by_rate_elem = $('[title="sort_by_rate"]', c);

//         $('[title="next"]', c).on('click', function(){
//             skip+=number;
//             ShowQas();
//         });

//         $('[title="prev"]', c).on('click', function(){
//             skip-=number;
//             ShowQas();
//         });

//         sort_by_date_elem.on('click', function(e){
//             if(sort_by_rate===false) return;
//             sort_by_rate = false;
//             skip = 0;
//             sort_by_date_elem.hide();
//             sort_by_rate_elem.show();
//             ShowQas();
//         })
//         sort_by_date_elem.hide();

//         sort_by_rate_elem.on('click', function(){
//             if(sort_by_rate===true) return;
//             sort_by_rate = true;
//             skip = 0;
//             sort_by_rate_elem.hide();
//             sort_by_date_elem.show();
//             ShowQas();
//         });
//         sort_by_rate_elem.show();

//         function ShowQas() {
//             $(c).show();
//             if(skip<=0) {
//                 $('[title="prev"]', c).hide();
//                 skip = 0;
//             }
//             else
//                 $('[title="prev"]', c).show();

//             var url = 'default/qas?skip='+skip+'&number='+number;
//             if(sort_by_rate)
//                 url+='&sort=1'
//             $.get(url, function(qas){
//                 var e = $('#qas_list');
//                 e.empty();
//                 qas.forEach(function(qa){ 
//                     var qa_div = $('#qa').clone().removeAttr('id');
//                     FillQA(qa_div, qa);
//                     var link = '<a href="/?qa='+qa._id.toString()+'"> &gt;&gt; </a>';
//                     qa_div.append(link);
//                     qa_div.on('click', function(e){
//                         ActivateTab('answer',[qa._id]);
//                     });
//                     e.append(qa_div);
//                 });
//                 if(qas.length<number)
//                     $('[title="next"]', c).hide();
//                 else
//                     $('[title="next"]', c).show();
//             });

//         }
//         return ShowQas;
//     }());

//     tabs.about = function() { $('#about').show(); };

//     function ActivateTab(title, args) {
//         $('.tab').hide();
//         tabs[title].apply(window, args);
//     }
//     $('a').on('click', function(e){e.preventDefault();});
//     $('button').on('click', function(e){e.preventDefault();});

//     $('a.tab_link').on('click', function(e){
//         var title = e.toElement.getAttribute('title');
//         ActivateTab(title);
//     });

//     // history handling
//     for(i in tabs) {
//         (function(title){
//             var f = tabs[title];
//             tabs[title] = function() {
//                 var args = Array.prototype.slice.call(arguments);
//                 if(!history.state)
//                     history.replaceState({tab:title, args:args});
//                 else 
//                 if(history.state.tab!==title)
//                     history.pushState({tab:title, args:args});
//                 f.apply(window,args);
//             }
//         }(i));
//     }
//     $(window).on('popstate', function(e) {
//         var state = e.state;
//         if(state && state.tab)
//             ActivateTab(state.tab, state.args);
//     });

//     ActivateTab('ask');
// }

// function UpdateTopics(){
//     $.get('default/topics', function(topics) {
//         var e = $('#ask select');
//         e.empty();
//         topics.forEach(function(topic){
//             e.append('<option value="'+topic+'">' + topic + '</option>');// TODO
//         });
//     });
// }

// function FillQA(e,qa) {
//     $('.timestamp',e).text(new Date(qa.timestamp * 1000));
//     $('.topic',e).text(qa.question.topic);
//     $('.question',e).text(qa.question.text);
//     $('.answer',e).text(qa.answer);
//     $('.rate',e).text(qa.rate);
// }

