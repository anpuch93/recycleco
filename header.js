function mettreAJourHeader() {
  const connecte = localStorage.getItem("connecte");
  const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));
  const headerDroite = document.querySelector(".header-droite");

  if (!headerDroite) return;

  if (connecte && utilisateur) {
    const nom = utilisateur.type === "pro" ? utilisateur.societe : utilisateur.nom.split(" ")[0];
    headerDroite.innerHTML = `
      <a href="comment-ca-marche.html" class="btn-connexion">Comment ça marche</a>
      <span style="font-size:14px;color:#555;">👤 ${nom}</span>
      <a href="dashboard.html" class="btn-connexion">Mon espace</a>
      <button class="btn-connexion" onclick="seDeconnecter()">Se déconnecter</button>
    `;
  } else {
    headerDroite.innerHTML = `
      <a href="comment-ca-marche.html" class="btn-connexion">Comment ça marche</a>
      <a href="connexion.html" class="btn-connexion">Se connecter</a>
      <a href="inscription.html" class="btn-post">S'inscrire</a>
    `;
  }
}

function seDeconnecter() {
  localStorage.removeItem("connecte");
  window.location.href = "index.html";
}

mettreAJourHeader();