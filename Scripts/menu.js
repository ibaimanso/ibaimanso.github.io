function juego(){
    window.location.href = "blackjack.html";
}

function ajustes(){
    window.location.href = "registro.html";
} 

function estadisticas(){
    window.location.href = "resultados.html";
}
function toggleMenu() {
    const navbar = document.getElementById('navbar');
    navbar.classList.toggle('active'); // Alterna la clase 'active' para mostrar/ocultar
}

function cerrarSesion() {
const confirmacion = confirm("¿Estás seguro de que deseas cerrar sesión?");

switch (confirmacion) {
    case true:
        // Si el usuario confirma, realiza el cierre de sesión
        localStorage.removeItem("currentUser");
        localStorage.removeItem("isLoggedIn");
        window.location.href = "index.html";
        break;
        
    case false:
        // Si el usuario cancela, no hacer nada
        break;

    default:
        break;
}
}
/*
Script para recoger la imagen de perfil del CurrentUser, es decir
el usuario loggeado actualmente
*/
document.addEventListener('DOMContentLoaded', function () {

    // Cargar el usuario actual desde localStorage

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    // Verificar si hay un usuario actual y una imagen de perfil
    if (currentUser && currentUser.profileImage) {
        // Asignar la imagen de perfil al <img> en el header
        const userImg = document.getElementById('user-profile-img');
        userImg.src = currentUser.profileImage;
    }
});