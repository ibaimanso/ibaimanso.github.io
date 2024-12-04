// Obtener los usuarios de localStorage
let users = JSON.parse(localStorage.getItem('users')) || [];

// Filtrar los usuarios con más de 0 victorias, luego ordenar por victorias de forma descendente
users = users.filter(user => user.victorias > 0).sort((a, b) => (b.victorias || 0) - (a.victorias || 0));

// Limitar la lista a los mejores 10 resultados
let topUsers = users.slice(0, 10);

// Crear la tabla de ranking dinámicamente
function renderRanking() {
    const container = document.createElement('div');
    container.innerHTML = `
        <h1>Ranking de los Mejores 10 Jugadores</h1>
        <table class="tabla">
            <thead>
                <tr>
                    <th>Posición</th>
                    <th>Nombre de Usuario</th>
                    <th>Imagen de Usuario</th>
                    <th>Victorias</th>
                    <th>Fecha y Hora</th>
                </tr>
            </thead>
            <tbody id="ranking-body">
            </tbody>
        </table>
        <button class="papelera" onclick="reiniciarResultados()">Reiniciar Tabla</button>
    `;
    document.body.appendChild(container);

    const rankingBody = document.getElementById('ranking-body');

    // Rellenar la tabla con los datos de los usuarios en topUsers
    topUsers.forEach((user, index) => {
        const row = document.createElement('tr');

        const posicionCell = document.createElement('td');
        posicionCell.textContent = index + 1;

        const nombreCell = document.createElement('td');
        nombreCell.textContent = user.username;

        const imagenCell = document.createElement('td');
        const imagen = document.createElement('img');
        imagen.src = user.profileImage || 'default-avatar.png'; // Cambiar a un avatar por defecto si no hay imagen
        imagen.alt = `Avatar de ${user.username}`;
        imagen.className = 'user-image';
        imagenCell.appendChild(imagen);

        const victoriasCell = document.createElement('td');
        victoriasCell.textContent = user.victorias || 0;

        const fechaCell = document.createElement('td');
        fechaCell.textContent = user.fechaYHora || 'N/A';
        /*var clase = document.createAttribute("class");
        clase.value = "celdas";
        fechaCell.setAttributeNode(clase);
        posicionCell.setAttributeNode(clase);
        nombreCell.setAttributeNode(clase);
        imagenCell.setAttributeNode(clase);
        victoriasCell.setAttributeNode(clase);
     */
        

        row.appendChild(posicionCell);
        row.appendChild(nombreCell);
        row.appendChild(imagenCell);
        row.appendChild(victoriasCell);
        row.appendChild(fechaCell);

        rankingBody.appendChild(row);
    });
}

// Llamar a la función para renderizar la tabla al cargar el script
document.addEventListener('DOMContentLoaded', renderRanking);

function reiniciarResultados() {
    // Obtener el arreglo de usuarios del localStorage
    let users = JSON.parse(localStorage.getItem('users')) || [];

    // Poner el valor de victorias en 0 para cada usuario
    users = users.map(user => {
        user.victorias = 0; // Reiniciar victorias a 0
        user.fechaYHora = "";
        return user;
    });

    // Guardar el array actualizado en localStorage
    localStorage.setItem('users', JSON.stringify(users));

    // Volver a calcular los top 10 y renderizar el ranking
    location.reload(); // Recargar la página para actualizar la vista
}

function toggleMenu() {
    const navbar = document.getElementById('navbar');
    navbar.classList.toggle('active'); // Alterna la clase 'active' para mostrar/ocultar
}

function cerrarSesion() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("isLoggedIn");
    window.location.href = "index.html";

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