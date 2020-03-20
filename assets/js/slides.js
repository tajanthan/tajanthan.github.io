
setInterval(function() {
  $('#slideshow > div:first')
    .fadeOut()
    .next()
    .fadeIn()
    .end()
    .appendTo('#slideshow');
}, 3000);
