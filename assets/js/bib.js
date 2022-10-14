function showHideBib(event) {
    event.preventDefault();
    $(this).next('pre').slideToggle(500);
}

$(document).ready(function() {
    $('.bibLink').click(showHideBib);
});

$(document).ready(function(){
   $(".read").click(function(){
      $(this).prev().toggle();
      $(this).siblings('.dots').toggle();
      if($(this).text()=='>>'){
	$(this).text('<<');
      }
      else{
	$(this).text('>>');
      }
   });
});

