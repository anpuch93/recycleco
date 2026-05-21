let siretValide = false;

function choisirProfil(profil) {
  document.getElementById("etape-choix").style.display = "none";
  document.getElementById("etape-" + profil).classList.remove("cache");
}

function retour() {
  document.getElementById("etape-particulier").classList.add("cache");
  document.getElementById("etape-pro").classList.add("cache");
  document.getElementById("etape-choix").style.display = "block";
}

async function inscrireParticulier() {
  const nom = document.getElementById("part-nom").value.trim();
  const email = document.getElementById("part-email").value.trim();
  const mdp = document.getElementById("part-mdp").value.trim();
  const ville = document.getElementById("part-ville").value.trim();
  const rgpd = document.getElementById("part-rgpd").checked;

  if (!nom || !email || !mdp || !ville) {
    alert("Merci de remplir tous les champs.");
    return;
  }
  if (mdp.length < 6) {
    alert("Le mot de passe doit faire au moins 6 caractères.");
    return;
  }
  if (!rgpd) {
    alert("Merci d'accepter la politique de confidentialité.");
    return;
  }

  const { data, error } = await db.auth.signUp({
    email: email,
    password: mdp,
    options: {
      data: { nom, ville, type: "particulier" }
    }
  });

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  // Sauvegarde dans la table utilisateurs seulement si user existe
if (data.user) {
  await db.from("utilisateurs").insert({
    id: data.user.id,
    type: "particulier",
    nom, email, ville
  });
}

  window.location.href = "confirmation.html";
}

async function inscrirePro() {
  const societe = document.getElementById("pro-societe").value.trim();
  const siret = document.getElementById("pro-siret").value.trim();
  const secteur = document.getElementById("pro-secteur").value;
  const email = document.getElementById("pro-email").value.trim();
  const tel = document.getElementById("pro-tel").value.trim();
  const mdp = document.getElementById("pro-mdp").value.trim();
  const certif = document.getElementById("pro-certif").checked;
  const rgpd = document.getElementById("pro-rgpd").checked;

  if (!societe || !siret || !secteur || !email || !tel || !mdp) {
    alert("Merci de remplir tous les champs.");
    return;
  }
  if (siret.length !== 14 || isNaN(siret)) {
    alert("Le SIRET doit contenir exactement 14 chiffres.");
    return;
  }
  if (mdp.length < 6) {
    alert("Le mot de passe doit faire au moins 6 caractères.");
    return;
  }
  if (!certif) {
    alert("Merci de certifier votre activité de recyclage.");
    return;
  }
  if (!rgpd) {
    alert("Merci d'accepter la politique de confidentialité.");
    return;
  }

  const { data, error } = await db.auth.signUp({
    email: email,
    password: mdp,
    options: {
      data: { societe, siret, secteur, telephone: tel, type: "pro" }
    }
  });

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  if (data.user) {
  await db.from("utilisateurs").insert({
    id: data.user.id,
    type: "pro",
    email, societe, siret, secteur,
    telephone: tel
  });
}

  window.location.href = "confirmation.html";
}