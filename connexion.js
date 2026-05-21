// Affiche le message de confirmation si l'email vient d'être validé
window.onload = function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get("confirmed") === "true") {
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
    alert("Email ou mot de passe incorrect.");
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

    await db.from("utilisateurs").insert(nouveauProfil);
    localStorage.setItem("connecte", "true");
    localStorage.setItem("utilisateur", JSON.stringify(nouveauProfil));
    window.location.href = "dashboard.html";
    return;
  }

  localStorage.setItem("connecte", "true");
  localStorage.setItem("utilisateur", JSON.stringify(profil));
  window.location.href = "dashboard.html";
}