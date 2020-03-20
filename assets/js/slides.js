$("#slideshow > img:gt(0)").hide();

setInterval(function() {
  $('#slideshow > img:first')
    .fadeOut()
    .next()
    .fadeIn()
    .end()
    .appendTo('#slideshow');
}, 3000);
