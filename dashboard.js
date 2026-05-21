let categorieActive = "Tout";

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
  console.log("ID utilisateur localStorage:", utilisateur.id);
console.log("Utilisateur complet:", utilisateur);

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
    grille.innerHTML += `
      <div class="carte">
        <div class="carte-image" style="background:${a.couleur}">${a.icone}</div>
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

// Publier une annonce
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

  const icones = { Bois: "🪵", Métal: "🔩", Carton: "📦", Plastique: "♻️", Verre: "🫙", Électronique: "💻" };
  const couleurs = { Bois: "#EAF3DE", Métal: "#E6F1FB", Carton: "#FAEEDA", Plastique: "#FBEAF0", Verre: "#E1F5EE", Électronique: "#F3E8FF" };

// Upload photos si présentes
  let photos = [];
  if (photosSelectionnees.length > 0) {
    photos = await uploaderPhotos(utilisateur.id);
  }

  const { error } = await db.from("annonces").insert({
    utilisateur_id: utilisateur.id,
    titre,
    categorie,
    quantite: quantite || "Non précisé",
    description,
    ville: utilisateur.ville,
    icone: icones[categorie] || "📦",
    couleur: couleurs[categorie] || "#f0f0f0",
    photos: photos.length > 0 ? photos : null,
    urgent: false,
    active: true
  });

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

// Supprimer une annonce
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

// Charger les annonces pour le pro
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

    const image = a.photo_url
      ? `<img src="${a.photo_url}" alt="${a.titre}" />`
      : a.icone || "📦";

    grille.innerHTML += `
      <div class="carte" onclick="window.location.href='annonce.html?id=${a.id}'">
        <div class="carte-image" style="background:${a.couleur || '#f0f0f0'}">
          ${image}
        </div>
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

// Filtrer par catégorie (pro)
async function filtrerCategorie(categorie, bouton) {
  categorieActive = categorie;
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("actif"));
  bouton.classList.add("actif");
  await chargerAnnoncesPro();
}

// Contact
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

  const { error } = await db.from("messages").insert({
    annonce_id: annonceId,
    pro_id: utilisateur.id,
    particulier_id: annonce.utilisateur_id,
    contenu: msg
  });

  if (error) {
    alert("Erreur lors de l'envoi : " + error.message);
    return;
  }

  fermerContact();
  alert("Message envoyé avec succès ! ✅");
}

// Formulaire annonce
function ouvrirFormulaire() {
  document.getElementById("modal-fond").classList.add("ouvert");
}

function fermerFormulaire() {
  document.getElementById("modal-fond").classList.remove("ouvert");
  photosSelectionnees = [];
  const preview = document.getElementById("photos-preview");
  if (preview) preview.innerHTML = "";
}

async function demanderSuppression() {
  const confirmation = confirm(
    "Êtes-vous sûr de vouloir supprimer votre compte ?\n\nToutes vos données et annonces seront supprimées définitivement dans un délai de 30 jours.\n\nCette action est irréversible."
  );

  if (!confirmation) return;

  const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));

  // Désactive toutes les annonces
  await db
    .from("annonces")
    .update({ active: false })
    .eq("utilisateur_id", utilisateur.id);

  // Marque le compte comme supprimé (on garde les données 30j pour le RGPD)
  await db
    .from("utilisateurs")
    .update({ type: "supprime" })
    .eq("id", utilisateur.id);

  // Déconnecte
  await db.auth.signOut();
  localStorage.removeItem("connecte");
  localStorage.removeItem("utilisateur");

  alert("Votre demande de suppression a été prise en compte. Vos données seront effacées dans 30 jours.");
  window.location.href = "index.html";
}
let annonceEnModification = null;

async function ouvrirModification(id) {
  // Récupère l'annonce depuis Supabase
  const { data: annonce } = await db
    .from("annonces")
    .select("*")
    .eq("id", id)
    .single();

  if (!annonce) return;

  annonceEnModification = id;
  document.getElementById("modif-titre").value = annonce.titre || "";
  document.getElementById("modif-categorie").value = annonce.categorie || "Bois";
  document.getElementById("modif-quantite").value = annonce.quantite || "";
  document.getElementById("modif-description").value = annonce.description || "";
  document.getElementById("modal-modification").classList.add("ouvert");
}

function fermerModification() {
  document.getElementById("modal-modification").classList.remove("ouvert");
  annonceEnModification = null;
}

async function sauvegarderModification() {
  const titre = document.getElementById("modif-titre").value.trim();
  const categorie = document.getElementById("modif-categorie").value;
  const quantite = document.getElementById("modif-quantite").value.trim();
  const description = document.getElementById("modif-description").value.trim();

  if (!titre) {
    alert("Merci d'entrer un titre.");
    return;
  }

  const icones = { Bois: "🪵", Métal: "🔩", Carton: "📦", Plastique: "♻️", Verre: "🫙", Électronique: "💻" };
  const couleurs = { Bois: "#EAF3DE", Métal: "#E6F1FB", Carton: "#FAEEDA", Plastique: "#FBEAF0", Verre: "#E1F5EE", Électronique: "#F3E8FF" };

  const { error } = await db
    .from("annonces")
    .update({
      titre,
      categorie,
      quantite: quantite || "Non précisé",
      description,
      icone: icones[categorie] || "📦",
      couleur: couleurs[categorie] || "#f0f0f0"
    })
    .eq("id", annonceEnModification);

  if (error) {
    alert("Erreur lors de la modification : " + error.message);
    return;
  }

  fermerModification();
  await chargerMesAnnonces();
  alert("Annonce modifiée avec succès ! ✅");
}
// Gestion des photos
let photosSelectionnees = [];

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
          <button class="photo-suppr" onclick="supprimerPhoto(${index})">✕</button>
        </div>`;
    };
    reader.readAsDataURL(file);
  });
}

function supprimerPhoto(index) {
  photosSelectionnees.splice(index, 1);
  const fakeFiles = new DataTransfer();
  photosSelectionnees.forEach(f => fakeFiles.items.add(f));
  document.getElementById("input-photos").files = fakeFiles.files;
  previsualiserPhotos(fakeFiles.files);
}

async function uploaderPhotos(utilisateurId) {
  const urls = [];
  for (const file of photosSelectionnees) {
    const nomFichier = `${utilisateurId}/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const { data, error } = await db.storage
      .from("photos-annonces")
      .upload(nomFichier, file, { upsert: true });

    if (error) {
      console.error("Erreur upload:", error);
      continue;
    }

    const { data: urlData } = db.storage
      .from("photos-annonces")
      .getPublicUrl(nomFichier);

    urls.push(urlData.publicUrl);
  }
  return urls;
}