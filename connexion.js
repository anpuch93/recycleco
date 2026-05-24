window.onload = async function () {
  const params = new URLSearchParams(window.location.search);

  // Gère la confirmation email via token Supabase
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  if (tokenHash && type) {
    const { error } = await db.auth.verifyOtp({
      token_hash: tokenHash,
      type: type
    });

    if (!error) {
      document.getElementById("msg-confirmation").style.display = "block";
    } else {
      console.error("Erreur vérification token:", error);
    }
  } else if (params.get("confirmed") === "true") {
    document.getElementById("msg-confirmation").style.display = "block";
  }
};

async function seConnecter() {
  const email = document.getElementById("email").value.trim();
  const mdp = document.getElementById("mdp").value.trim();

  if (!email || !mdp) {
    alert("Merci de remplir tous les champs.");
    return;
  }

  const { data, error } = await db.auth.signInWithPassword({
    email: email,
    password: mdp
  });

  if (error) {
    if (error.message.includes("Email not confirmed")) {
      alert("Votre email n'est pas encore confirmé. Vérifiez votre boite mail.");
    } else {
      alert("Email ou mot de passe incorrect.");
    }
    return;
  }

  // Récupère le profil depuis la table utilisateurs
  const { data: profil } = await db
    .from("utilisateurs")
    .select("*")
    .eq("id", data.user.id)
    .single();

  // Si profil introuvable, on le crée depuis les métadonnées Supabase Auth
  if (!profil) {
    const meta = data.user.user_metadata;
    const nouveauProfil = {
      id: data.user.id,
      type: meta.type || "particulier",
      nom: meta.nom || null,
      email: data.user.email,
      ville: meta.ville || null,
      societe: meta.societe || null,
      siret: meta.siret || null,
      secteur: meta.secteur || null,
      telephone: meta.telephone || null
    };

    const { error: insertError } = await db.from("utilisateurs").insert(nouveauProfil);
    if (insertError) {
      console.error("Erreur insertion profil:", insertError);
    }

    localStorage.setItem("connecte", "true");
    localStorage.setItem("utilisateur", JSON.stringify(nouveauProfil));
    window.location.href = "dashboard.html";
    return;
  }

  localStorage.setItem("connecte", "true");
  localStorage.setItem("utilisateur", JSON.stringify(profil));
  window.location.href = "dashboard.html";
}
async function motDePasseOublie() {
  const email = document.getElementById("email").value.trim();

  if (!email) {
    alert("Merci d'entrer votre email d'abord.");
    return;
  }

  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: "https://recycle-co.fr/reset-password.html"
  });

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  alert("Un email de réinitialisation a été envoyé à " + email + " ✅");
}