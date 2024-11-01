// auth.js
if (!sessionStorage.getItem('rol')) {
    // Si no hay rol en sessionStorage, redirige al login
    window.location.href = "login.html";
}
