window.hoodie  = new Hoodie()

function openDialog() {
  Avgrund.show( "#default-popup" )
}

function closeDialog() {
  Avgrund.hide()
}

$('.open-menu').click(openDialog)