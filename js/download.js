function getUrl() {
    chrome.tabs.getSelected(null, function (tab) {
        tablink = tab.url;
    });
    return tablink;
}

$('#points').click(function(){
    this.blur();
    var url = getUrl();
    if(url.search("//www.youtube.com/watch") != -1){
        chrome.tabs.create({url:"http://www.convert2mp3.net/?url="+url});
    }
});


chrome.identity.getAuthToken({ 'interactive': true }, function(token) {console.log(token)});