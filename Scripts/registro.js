document.getElementById('registrationForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const email = document.getElementById('email').value;
    const dni = document.getElementById('dni').value;
    const profileImage = document.getElementById('profileImage').files[0];

    if (password !== confirmPassword) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    // Obtenemos el usuario actual y el array de usuarios
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let users = JSON.parse(localStorage.getItem('users')) || [];

    // Verifica si es un nuevo usuario o una actualización
    const isNewUser = !currentUser;

    if (isNewUser) {
        // Verificar si el nombre de usuario ya está en uso solo para nuevos registros
        const existingUser = users.find(user => user.username === username);
        if (existingUser) {
            alert("El nombre de usuario ya está en uso. Por favor, elige otro.");
            return;
        }
    }

    // Si hay una imagen de perfil, la convertimos a base64
    if (profileImage) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const imageBase64 = event.target.result;

            // Si es nuevo usuario, creamos un objeto con sus datos y lo añadimos a users
            if (isNewUser) {
                const newUser = {
                    username,
                    password,
                    email,
                    dni,
                    profileImage: imageBase64,
                    victorias: 0,
                    fechaYHora: 0,
                    dinero: 0
                };
                users.push(newUser);
                localStorage.setItem('users', JSON.stringify(users));
                localStorage.setItem('currentUser', JSON.stringify(newUser));
                alert("Usuario registrado con éxito!");
                window.location.href = "login.html";
            } else {
                // Si es actualización, modificamos el usuario actual y actualizamos en users
                currentUser.username = username;
                currentUser.password = password;
                currentUser.email = email;
                currentUser.dni = dni;
                currentUser.profileImage = imageBase64;

                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateUsersArray(users, currentUser);
                alert("Usuario actualizado con éxito!");
            }
        };
        reader.readAsDataURL(profileImage);
    } else {
        // Si no hay imagen seleccionada, el flujo es similar al anterior
        if (isNewUser) {
            const newUser = {
                username,
                password,
                email,
                dni,
                profileImage: null,
                victorias: 0,
                fechaYHora: 0,
                dinero: 0
            };
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            alert("Usuario registrado con éxito!");
            window.location.href = "login.html";
        } else {
            currentUser.username = username;
            currentUser.password = password;
            currentUser.email = email;
            currentUser.dni = dni;

            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUsersArray(users, currentUser);
            alert("Usuario actualizado con éxito!");
        }
    }
});

// Función para actualizar el usuario en el array de usuarios
function updateUsersArray(users, updatedUser) {
    const userIndex = users.findIndex(user => user.username === updatedUser.username);
    if (userIndex !== -1) {
        users[userIndex] = updatedUser;
    }
    localStorage.setItem('users', JSON.stringify(users));
}

// Carga los datos del usuario actual cuando la página está lista
document.addEventListener('DOMContentLoaded', function () {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (isLoggedIn === 'true' && currentUser) {
        document.getElementById('username').value = currentUser.username;
        document.getElementById('password').value = currentUser.password;
        document.getElementById('confirmPassword').value = currentUser.password;
        document.getElementById('email').value = currentUser.email;
        document.getElementById('dni').value = currentUser.dni;

        if (currentUser.profileImage) {
            document.getElementById('profilePreview').src = currentUser.profileImage;
        }

        const updateUserInLocalStorage = (key, value) => {
            currentUser[key] = value;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        };

        document.getElementById('username').addEventListener('input', (e) => updateUserInLocalStorage('username', e.target.value));
        document.getElementById('password').addEventListener('input', (e) => {
            updateUserInLocalStorage('password', e.target.value);
            document.getElementById('confirmPassword').value = e.target.value;
        });
        document.getElementById('confirmPassword').addEventListener('input', (e) => updateUserInLocalStorage('password', e.target.value));
        document.getElementById('email').addEventListener('input', (e) => updateUserInLocalStorage('email', e.target.value));
        document.getElementById('dni').addEventListener('input', (e) => updateUserInLocalStorage('dni', e.target.value));
        
        document.getElementById('profileImage').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    currentUser.profileImage = event.target.result;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    document.getElementById('profilePreview').src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

       /*
             * Script para limitar el tamaño de la imagen que envias a 3mb
             * porque si no, no se puede almacenar en local storage
             */
       function validateFileSize() {
        const fileInput = document.getElementById("profileImage");
        const maxSizeInMB = 3; 
        const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    
        if (fileInput.files.length > 0) {
          const file = fileInput.files[0];
    
          if (file.size > maxSizeInBytes) {
            alert(`El archivo es demasiado grande. El tamaño máximo es ${maxSizeInMB} MB.`);
            return false;
          }
        }
    
        return true; 
      }