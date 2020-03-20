$("#slideshow > img:gt(0)").hide();
setInterval(function() {
  $('#slideshow > img:first')
    .fadeOut()
    .next()
    .fadeIn()
    .end()
    .appendTo('#slideshow');
}, 3000);

$("#slideshow2 > img:gt(0)").hide();
setInterval(function() {
  $('#slideshow2 > img:first')
    .fadeOut()
    .next()
    .fadeIn()
    .end()
    .appendTo('#slideshow2');
}, 3000);

$("#slideshow3 > img:gt(0)").hide();
setInterval(function() {
  $('#slideshow3 > img:first')
    .fadeOut()
    .next()
    .fadeIn()
    .end()
    .appendTo('#slideshow3');
}, 3000);

$("#slideshow4 > img:gt(0)").hide();
setInterval(function() {
  $('#slideshow4 > img:first')
    .fadeOut()
    .next()
    .fadeIn()
    .end()
    .appendTo('#slideshow4');
}, 3000);

$("#slideshow5 > img:gt(0)").hide();
setInterval(function() {
  $('#slideshow5 > img:first')
    .fadeOut()
    .next()
    .fadeIn()
    .end()
    .appendTo('#slideshow5');
}, 3000);

$("#slideshow6 > img:gt(0)").hide();
setInterval(function() {
  $('#slideshow6 > img:first')
    .fadeOut()
    .next()
    .fadeIn()
    .end()
    .appendTo('#slideshow6');
}, 3000);
