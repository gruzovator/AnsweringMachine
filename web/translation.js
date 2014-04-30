var cfg = require('./config.js');

module.exports = function(text, dict, lang) {
    
}

(function(){
    var lang = cfg.lang || 'RU';
    lang = lang.toUpperCase();
    var dict = translations[lang];
    if(lang == 'EN' || !dict)
        return function(text) { return text; }
    else 
        return function(text, tr) {
            return dict[text.toLowerCase()] || text;
        }
}());

