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

  // Récupère le profil complet depuis la table utilisateurs
  const { data: profil } = await db
    .from("utilisateurs")
    .select("*")
    .eq("id", data.user.id)
    .single();

console.log("Profil récupéré:", profil); // ← AJOUTE ICI
    
  // Sauvegarde en local pour le header et les pages
  localStorage.setItem("connecte", "true");
  localStorage.setItem("utilisateur", JSON.stringify(profil));

  window.location.href = profil.type === "pro" ? "dashboard.html" : "dashboard.html";
}