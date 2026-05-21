let categorieActive = "Tout";
let photosSelectionnees = [];
let annonceEnModification = null;
let photosExistantes = [];
let nouvellesPhotos = [];

window.onload = async function () {
  const connecte = localStorage.getItem("connecte");
  const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));

  if (!connecte || !utilisateur) {
    alert("Vous devez être connecté pour accéder à cette page.");
    window.location.href = "connexion.html";
    return;
  }

  if (utilisateur.type === "particulier") {
    document.getElementById("dashboard-particulier").classList.remove("cache");
    document.getElementById("part-prenom").textContent = utilisateur.nom ? utilisateur.nom.split(" ")[0] : "vous";
    const headerNom = document.getElementById("header-nom");
    if (headerNom) headerNom.textContent = utilisateur.nom || "";
    await chargerMesAnnonces();

  } else if (utilisateur.type === "pro") {
    document.getElementById("dashboard-pro").classList.remove("cache");
    document.getElementById("pro-nom-societe").textContent = utilisateur.societe || "";
    const headerNomPro = document.getElementById("header-nom");
    if (headerNomPro) headerNomPro.textContent = utilisateur.societe || "";
    await chargerAnnoncesPro();
  }
};

// Déconnexion
function seDeconnecter() {
  db.auth.signOut();
  localStorage.removeItem("connecte");
  localStorage.removeItem("utilisateur");
  window.location.href = "index.html";
}

// Charger les annonces du particulier connecté
async function chargerMesAnnonces() {
  const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));
  const grille = document.getElementById("grille-mes-annonces");

  grille.innerHTML = "<p class='vide'>Chargement...</p>";

  const { data: annonces, error } = await db
    .from("annonces")
    .select("*")
    .eq("utilisateur_id", utilisateur.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur chargement annonces:", error);
    grille.innerHTML = "<p class='vide'>Erreur de chargement.</p>";
    return;
  }

  if (!annonces || annonces.length === 0) {
    grille.innerHTML = "<p class='vide'>Vous n'avez pas encore publié d'annonce.</p>";
    return;
  }

  grille.innerHTML = "";
  annonces.forEach(a => {
    let imageHtml = "";
    if (a.photos && a.photos.length > 0) {
      imageHtml = `<img src="${a.photos[0]}" style="width:100%;height:100%;object-fit:cover;" />`;
    } else {
      imageHtml = `<span style="font-size:36px;">${a.icone || "📦"}</span>`;
    }

    grille.innerHTML += `
      <div class="carte">
        <div class="carte-image" style="background:${a.couleur || '#f0f0f0'}">${imageHtml}</div>
        <div class="carte-body">
          <div class="carte-titre">${a.titre}</div>
          <div class="carte-lieu">📍 ${a.ville}</div>
          <div class="carte-footer">
            <span class="badge badge-particulier">Particulier</span>
            <span class="carte-quantite">${a.quantite || ""}</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button class="carte-contact" style="background:#185FA5;"
              onclick="event.stopPropagation();ouvrirModification('${a.id}')">✏️ Modifier</button>
            <button class="carte-contact" style="background:#e74c3c;"
              onclick="event.stopPropagation();supprimerAnnonce('${a.id}')">🗑 Supprimer</button>
          </div>
        </div>
      </div>`;
  });
}

// ============ PUBLICATION ANNONCE ============

function previsualiserPhotos(files) {
  const preview = document.getElementById("photos-preview");
  const MAX = 5;

  if (files.length > MAX) {
    alert(`Maximum ${MAX} photos autorisées.`);
    return;
  }

  photosSelectionnees = Array.from(files);
  preview.innerHTML = "";

  photosSelectionnees.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      preview.innerHTML += `
        <div class="photo-thumb" id="thumb-${index}">
          <img src="${e.target.result}" alt="Photo ${index + 1}" />
          <button class="photo-suppr" onclick="supprimerPhotoNouvelle(${index})">✕</button>
        </div>`;
    };
    reader.readAsDataURL(file);
  });
}

function supprimerPhotoNouvelle(index) {
  photosSelectionnees.splice(index, 1);
  const fakeFiles = new DataTransfer();
  photosSelectionnees.forEach(f => fakeFiles.items.add(f));
  document.getElementById("input-photos").files = fakeFiles.files;
  previsualiserPhotos(fakeFiles.files);
}

async function uploaderPhotos(utilisateurId, fichiers) {
  const urls = [];
  for (const file of fichiers) {
    const nomFichier = `${utilisateurId}/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const { error } = await db.storage
      .from("photos-annonces")
      .upload(nomFichier, file, { upsert: true });

    if (!error) {
      const { data: urlData } = db.storage
        .from("photos-annonces")
        .getPublicUrl(nomFichier);
      urls.push(urlData.publicUrl);
    } else {
      console.error("Erreur upload:", error);
    }
  }
  return urls;
}

async function publierAnnonce() {
  const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));
  const titre = document.getElementById("titre").value.trim();
  const categorie = document.getElementById("categorie").value;
  const quantite = document.getElementById("quantite").value.trim();
  const description = document.getElementById("description").value.trim();

  if (!titre) {
    alert("Merci d'entrer un titre.");
    return;
  }

  const btnPublier = document.querySelector("#modal-fond .btn-publier");
  if (btnPublier) { btnPublier.textContent = "Publication..."; btnPublier.disabled = true; }

  const icones = { Bois: "🪵", Métal: "🔩", Carton: "📦", Plastique: "♻️", Verre: "🫙", Électronique: "💻" };
  const couleurs = { Bois: "#EAF3DE", Métal: "#E6F1FB", Carton: "#FAEEDA", Plastique: "#FBEAF0", Verre: "#E1F5EE", Électronique: "#F3E8FF" };

  let photos = [];
  if (photosSelectionnees.length > 0) {
    photos = await uploaderPhotos(utilisateur.id, photosSelectionnees);
  }

  const { error } = await db.from("annonces").insert({
    utilisateur_id: utilisateur.id,
    titre, categorie,
    quantite: quantite || "Non précisé",
    description,
    ville: utilisateur.ville,
    icone: icones[categorie] || "📦",
    couleur: couleurs[categorie] || "#f0f0f0",
    photos: photos.length > 0 ? photos : null,
    urgent: false,
    active: true
  });

  if (btnPublier) { btnPublier.textContent = "Publier"; btnPublier.disabled = false; }

  if (error) {
    alert("Erreur lors de la publication : " + error.message);
    return;
  }

  fermerFormulaire();
  await chargerMesAnnonces();
  ["titre", "quantite", "description"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  alert("Annonce publiée avec succès ! ✅");
}

function ouvrirFormulaire() {
  document.getElementById("modal-fond").classList.add("ouvert");
}

function fermerFormulaire() {
  document.getElementById("modal-fond").classList.remove("ouvert");
  photosSelectionnees = [];
  const preview = document.getElementById("photos-preview");
  if (preview) preview.innerHTML = "";
}

// ============ SUPPRESSION ANNONCE ============

async function supprimerAnnonce(id) {
  if (!confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;

  const { error } = await db
    .from("annonces")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    alert("Erreur lors de la suppression.");
    return;
  }

  await chargerMesAnnonces();
}

// ============ MODIFICATION ANNONCE ============

async function ouvrirModification(id) {
  const { data: annonce } = await db
    .from("annonces")
    .select("*")
    .eq("id", id)
    .single();

  if (!annonce) return;

  annonceEnModification = id;
  photosExistantes = annonce.photos || [];
  nouvellesPhotos = [];

  document.getElementById("modif-titre").value = annonce.titre || "";
  document.getElementById("modif-categorie").value = annonce.categorie || "Bois";
  document.getElementById("modif-quantite").value = annonce.quantite || "";
  document.getElementById("modif-description").value = annonce.description || "";

  afficherPhotosModification();
  document.getElementById("modal-modification").classList.add("ouvert");
}

function afficherPhotosModification() {
  const preview = document.getElementById("modif-photos-preview");
  if (!preview) return;
  preview.innerHTML = "";

  photosExistantes.forEach((url, index) => {
    preview.innerHTML += `
      <div class="photo-thumb">
        <img src="${url}" alt="Photo ${index + 1}" />
        <button class="photo-suppr" onclick="supprimerPhotoExistante(${index})">✕</button>
      </div>`;
  });

  nouvellesPhotos.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      preview.innerHTML += `
        <div class="photo-thumb">
          <img src="${e.target.result}" alt="Nouvelle photo" />
          <button class="photo-suppr" onclick="supprimerNouvellePhoto(${index})">✕</button>
        </div>`;
    };
    reader.readAsDataURL(file);
  });

  const total = photosExistantes.length + nouvellesPhotos.length;
  const compteur = document.getElementById("modif-compteur");
  if (compteur) compteur.textContent = `${total}/5 photo(s)`;
}

function supprimerPhotoExistante(index) {
  photosExistantes.splice(index, 1);
  afficherPhotosModification();
}

function supprimerNouvellePhoto(index) {
  nouvellesPhotos.splice(index, 1);
  afficherPhotosModification();
}

function ajouterNouvellesPhotos(files) {
  const total = photosExistantes.length + nouvellesPhotos.length + files.length;
  if (total > 5) {
    alert("Maximum 5 photos au total.");
    return;
  }
  nouvellesPhotos = [...nouvellesPhotos, ...Array.from(files)];
  afficherPhotosModification();
}

function fermerModification() {
  document.getElementById("modal-modification").classList.remove("ouvert");
  annonceEnModification = null;
  photosExistantes = [];
  nouvellesPhotos = [];
  const preview = document.getElementById("modif-photos-preview");
  if (preview) preview.innerHTML = "";
}

async function sauvegarderModification() {
  const titre = document.getElementById("modif-titre").value.trim();
  const categorie = document.getElementById("modif-categorie").value;
  const quantite = document.getElementById("modif-quantite").value.trim();
  const description = document.getElementById("modif-description").value.trim();
  const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));

  if (!titre) {
    alert("Merci d'entrer un titre.");
    return;
  }

  const btnSauvegarder = document.querySelector("#modal-modification .btn-publier");
  if (btnSauvegarder) { btnSauvegarder.textContent = "Sauvegarde..."; btnSauvegarder.disabled = true; }

  const icones = { Bois: "🪵", Métal: "🔩", Carton: "📦", Plastique: "♻️", Verre: "🫙", Électronique: "💻" };
  const couleurs = { Bois: "#EAF3DE", Métal: "#E6F1FB", Carton: "#FAEEDA", Plastique: "#FBEAF0", Verre: "#E1F5EE", Électronique: "#F3E8FF" };

  let urlsNouvellesPhotos = [];
  if (nouvellesPhotos.length > 0) {
    urlsNouvellesPhotos = await uploaderPhotos(utilisateur.id, nouvellesPhotos);
  }

  const toutesLesPhotos = [...photosExistantes, ...urlsNouvellesPhotos];

  const { error } = await db
    .from("annonces")
    .update({
      titre, categorie,
      quantite: quantite || "Non précisé",
      description,
      icone: icones[categorie] || "📦",
      couleur: couleurs[categorie] || "#f0f0f0",
      photos: toutesLesPhotos.length > 0 ? toutesLesPhotos : null
    })
    .eq("id", annonceEnModification);

  if (btnSauvegarder) { btnSauvegarder.textContent = "Sauvegarder"; btnSauvegarder.disabled = false; }

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  fermerModification();
  await chargerMesAnnonces();
  alert("Annonce modifiée ! ✅");
}

// ============ DASHBOARD PRO ============

async function chargerAnnoncesPro() {
  const grille = document.getElementById("grille-pro");
  grille.innerHTML = "<p class='vide'>Chargement...</p>";

  let query = db
    .from("annonces")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (categorieActive !== "Tout") {
    query = query.eq("categorie", categorieActive);
  }

  const { data: annonces, error } = await query;

  if (error) {
    grille.innerHTML = "<p class='vide'>Erreur de chargement.</p>";
    return;
  }

  if (!annonces || annonces.length === 0) {
    grille.innerHTML = "<p class='vide'>Aucune annonce disponible.</p>";
    return;
  }

  grille.innerHTML = "";
  annonces.forEach(a => {
    const badge = a.urgent
      ? `<span class="badge badge-urgent">Urgent</span>`
      : `<span class="badge badge-particulier">Particulier</span>`;

    const date = a.created_at
      ? new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
      : "";

    let imageHtml = "";
    if (a.photos && a.photos.length > 0) {
      imageHtml = `<img src="${a.photos[0]}" style="width:100%;height:100%;object-fit:cover;" />`;
    } else {
      imageHtml = `<span style="font-size:36px;">${a.icone || "📦"}</span>`;
    }

    grille.innerHTML += `
      <div class="carte" onclick="window.location.href='annonce.html?id=${a.id}'">
        <div class="carte-image" style="background:${a.couleur || '#f0f0f0'}">${imageHtml}</div>
        <div class="carte-body">
          <div>
            <div class="carte-titre">${a.titre}</div>
            ${a.description ? `<div class="carte-description">${a.description}</div>` : ""}
          </div>
          <div class="carte-quantite-badge">${a.quantite || ""}</div>
          <div class="carte-footer">
            <div class="carte-footer-gauche">
              ${badge}
              <span class="carte-lieu-date">📍 ${a.ville}${date ? ` · ${date}` : ""}</span>
            </div>
            <button class="carte-contact" onclick="event.stopPropagation(); ouvrirContact('${a.id}')">
              ✉️ Contacter
            </button>
          </div>
        </div>
      </div>`;
  });
}

async function filtrerCategorie(categorie, bouton) {
  categorieActive = categorie;
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("actif"));
  bouton.classList.add("actif");
  await chargerAnnoncesPro();
}

// ============ CONTACT PRO ============

function ouvrirContact(annonceId) {
  document.getElementById("modal-contact").classList.add("ouvert");
  document.getElementById("modal-contact").dataset.annonce = annonceId;
}

function fermerContact() {
  document.getElementById("modal-contact").classList.remove("ouvert");
  document.getElementById("msg-contact").value = "";
}

async function envoyerContact() {
  const msg = document.getElementById("msg-contact").value.trim();
  const annonceId = document.getElementById("modal-contact").dataset.annonce;
  const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));

  if (!msg) {
    alert("Merci d'écrire un message.");
    return;
  }

  const { data: annonce } = await db
    .from("annonces")
    .select("utilisateur_id")
    .eq("id", annonceId)
    .single();

  // Crée ou récupère la conversation
  let convId = null;
  const { data: convExistante } = await db
    .from("conversations")
    .select("id")
    .eq("annonce_id", annonceId)
    .eq("pro_id", utilisateur.id)
    .single();

  if (convExistante) {
    convId = convExistante.id;
  } else {
    const { data: nouvelleConv } = await db
      .from("conversations")
      .insert({
        annonce_id: annonceId,
        pro_id: utilisateur.id,
        particulier_id: annonce.utilisateur_id
      })
      .select()
      .single();
    convId = nouvelleConv.id;
  }

  await db.from("chat_messages").insert({
    conversation_id: convId,
    expediteur_id: utilisateur.id,
    contenu: msg,
    lu: false
  });

  fermerContact();
  alert("Message envoyé ! ✅");
}

// ============ SUPPRESSION COMPTE ============

async function demanderSuppression() {
  const confirmation = confirm(
    "Êtes-vous sûr de vouloir supprimer votre compte ?\n\nToutes vos données seront supprimées dans 30 jours.\n\nCette action est irréversible."
  );

  if (!confirmation) return;

  const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));

  await db.from("annonces").update({ active: false }).eq("utilisateur_id", utilisateur.id);
  await db.from("utilisateurs").update({ type: "supprime" }).eq("id", utilisateur.id);
  await db.auth.signOut();

  localStorage.removeItem("connecte");
  localStorage.removeItem("utilisateur");

  alert("Demande de suppression prise en compte. Vos données seront effacées dans 30 jours.");
  window.location.href = "index.html";
}