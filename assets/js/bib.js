function showHideBib(event) {
    event.preventDefault();
    $(this).next('pre').slideToggle(500);
}

$(document).ready(function() {
    $('.bibLink').click(showHideBib);
});

