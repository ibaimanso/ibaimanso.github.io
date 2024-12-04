let dinero;
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
let users = JSON.parse(localStorage.getItem('users')) || [];

if (currentUser) {
    // Encontrar el índice del usuario en el arreglo
    const userIndex = users.findIndex(user => user.username === currentUser.username);

    if (userIndex !== -1) {
        dinero = users[userIndex].dinero;

        // Actualizar el usuario actual y el arreglo de usuarios en localStorage
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(users[userIndex]));
    }
}

const initialMoney = dinero;
document.getElementById("initial-money").value = initialMoney + " €";

var userHand, dealerHand;
var currentBet = 0;

function Card(s, n) {
    this.suit = s;
    this.number = n;
    this.getValue = function () {
        if (this.number > 10) return 10;
        else if (this.number === 1) return 11;
        else return this.number;
    };
    this.getCardImage = function () {
        const suits = ["S", "H", "D", "C"];
        const numbers = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
        return `../Imagenes/cartas/${numbers[this.number - 1]}${suits[this.suit - 1]}.png`;
    };
}

var deal = function () {
    var suit = Math.floor(Math.random() * 4) + 1;
    var number = Math.floor(Math.random() * 13) + 1;
    return new Card(suit, number);
};

function Hand() {
    var cards = [deal(), deal()];
    this.getHand = function () {
        return cards;
    };
    this.score = function () {
        var myScore = 0;
        for (var i = 0; i < cards.length; i++) myScore += cards[i].getValue();
        for (var a = 0; a < cards.length && myScore > 21; a++) {
            if (cards[a].getValue() === 11) myScore -= 10;
        }
        return myScore;
    };
    this.addCard = function () {
        cards.push(deal());
    };
}

var startGame = function () {
    // Solicitar cantidad de apuesta
    let bet = prompt("¿Cuánto quieres apostar? (debe ser menor que " + dinero + " €)");
    bet = parseInt(bet);
    if (isNaN(bet) || bet <= 0 || bet > dinero) {
        alert("Apuesta no válida. Inténtalo de nuevo.");
        return;
    }
    currentBet = bet;

    // Actualizar el dinero inicial
    dinero -= currentBet;
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let users = JSON.parse(localStorage.getItem('users')) || [];

    if (currentUser) {
        // Encontrar el índice del usuario en el arreglo
        const userIndex = users.findIndex(user => user.username === currentUser.username);

        if (userIndex !== -1) {
            users[userIndex].dinero = dinero;

            // Actualizar el usuario actual y el arreglo de usuarios en localStorage
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', JSON.stringify(users[userIndex]));
        }
    }
    document.getElementById("initial-money").value = dinero + " €";

    document.getElementById("winner").textContent = '';
    document.getElementById("user-score").textContent = '';
    document.getElementById("dealer-score").textContent = '';
    document.getElementById("user-hand").innerHTML = '';
    document.getElementById("dealer-hand").innerHTML = '';

    userHand = new Hand();
    dealerHand = new Hand();
    renderHand(userHand, "user-hand");
    document.getElementById("user-score").textContent = userHand.score();

    document.getElementById("hit-button").style.display = "inline";
    document.getElementById("stand-button").style.display = "inline";
    document.getElementById("start-button").style.display = "none"; // Oculta el botón de inicio
};

var renderHand = function (hand, containerId) {
    var container = document.getElementById(containerId);
    container.innerHTML = '';
    hand.getHand().forEach(card => {
        var img = document.createElement("img");
        img.src = card.getCardImage();
        img.alt = `${card.number} de ${card.suit}`;
        img.className = "card-image";
        container.appendChild(img);
    });
};

var askForCard = function () {
    if (userHand.score() <= 21) {
        userHand.addCard();
        renderHand(userHand, "user-hand");
        document.getElementById("user-score").textContent = userHand.score();

        if (userHand.score() > 21) {
            alert("Te pasaste de 21. ¡Perdiste!");
            finishGame();
        }
    }
};

var stand = function () {
    finishGame();
};

function incrementarVictorias() {
    // Verificar si el usuario ha iniciado sesión
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let users = JSON.parse(localStorage.getItem('users')) || [];

    if (currentUser) {
        // Encontrar el índice del usuario en el arreglo
        const userIndex = users.findIndex(user => user.username === currentUser.username);

        if (userIndex !== -1) {
            // Incrementar la cantidad de victorias
            users[userIndex].victorias = (users[userIndex].victorias || 0) + 1;

            // Obtener la fecha y hora actual
            const now = new Date();
            const formattedDate = now.toLocaleString(); // Formato: "dd/mm/yyyy, hh:mm:ss"
            users[userIndex].fechaYHora = formattedDate; // Actualiza la fecha y hora

            // Actualizar el usuario actual y el arreglo de usuarios en localStorage

            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', JSON.stringify(users[userIndex]));

            alert(`¡Felicidades! Ahora tienes ${users[userIndex].victorias} victorias.`);
        }
    } else {
        alert("No hay usuario logeado.");
    }
}


var finishGame = function () {
    dealerHand = playAsDealer();
    renderHand(dealerHand, "dealer-hand");
    document.getElementById("dealer-score").textContent = dealerHand.score();
    var winner = declareWinner(userHand, dealerHand);
    document.getElementById("winner").textContent = winner;

    document.getElementById("hit-button").style.display = "none";
    document.getElementById("stand-button").style.display = "none";

    // Ajustar dinero en caso de ganar o perder
    if (winner === "¡Ganaste!") {
        dinero += currentBet * 2;
        incrementarVictorias();
    } else if (winner == "¡Es un empate!"){
        dinero += currentBet;
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let users = JSON.parse(localStorage.getItem('users')) || [];

    if (currentUser) {
        // Encontrar el índice del usuario en el arreglo
        const userIndex = users.findIndex(user => user.username === currentUser.username);

        if (userIndex !== -1) {
            users[userIndex].dinero = dinero;

            // Actualizar el usuario actual y el arreglo de usuarios en localStorage
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', JSON.stringify(users[userIndex]));
        }
    }
    document.getElementById("initial-money").value = dinero + " €";

    if (dinero > 0) {
        document.getElementById("start-button").style.display = "inline";
    } else {
        alert("Te has quedado sin dinero. Fin del juego.");
    }
};


var playAsDealer = function () {
    var dealerHand = new Hand();
    while (dealerHand.score() < 17) {
        dealerHand.addCard();
    }
    return dealerHand;
};

var declareWinner = function (userHand, dealerHand) {
    if (userHand.score() > 21) {
        return "¡Perdiste!";
    } else if (dealerHand.score() > 21) {
        return "¡Ganaste!";
    } else {
        if (userHand.score() > dealerHand.score()) return "¡Ganaste!";
        else if (userHand.score() === dealerHand.score()) return "¡Es un empate!";
        else return "¡Perdiste!";
    }
};

// Se añaden los event listeners para cargar el juego una vez que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("start-button").onclick = startGame;
    document.getElementById("hit-button").onclick = askForCard; // Enlace al botón "Pedir Carta"
    document.getElementById("stand-button").onclick = stand; // Enlace al botón "Plantarse"
});

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