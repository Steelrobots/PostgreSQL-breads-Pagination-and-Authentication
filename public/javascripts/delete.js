function opendialog(id, title){
    document.getElementById('deleteConfirm').style.display = 'block'
    document.getElementById('dialog').innerHTML = `Are you sure you want to delete '${title}'?`
    document.getElementById('confirmed').setAttribute("href" , `/users/delete/${id}`)
}

function closeDialog() {
    document.getElementById('deleteConfirm').style.display = 'none';
}