let categorieActive = "Tout";
let toutesLesAnnonces = [];
let photosSelectionnees = [];

const annoncesExemples = [
  { id: "ex-0", titre: "Planches de bois variées", categorie: "Bois", icone: "🪵", couleur: "#EAF3DE", ville: "Paris 11e", quantite: "~50 kg", urgent: false, description: "Lot de planches récupérées lors d'une rénovation." },
  { id: "ex-1", titre: "Ferraille et profilés acier", categorie: "Métal", icone: "🔩", couleur: "#E6F1FB", ville: "Lyon 3e", quantite: "~120 kg", urgent: false, description: "Profilés acier et ferraille diverse issus d'un atelier." },
  { id: "ex-2", titre: "Cartons d'emballage", categorie: "Carton", icone: "📦", couleur: "#FAEEDA", ville: "Bordeaux", quantite: "~30 pièces", urgent: true, description: "Cartons en bon état, pliés et stockés au sec." },
  { id: "ex-3", titre: "Bidons plastique HDPE", categorie: "Plastique", icone: "♻️", couleur: "#FBEAF0", ville: "Marseille", quantite: "~15 pièces", urgent: false, description: "Bidons de 25 litres, rincés et propres." },
  { id: "ex-4", titre: "Bouteilles et bocaux verre", categorie: "Verre", icone: "🫙", couleur: "#E1F5EE", ville: "Nantes", quantite: "~40 pièces", urgent: false, description: "Bouteilles et bocaux de différentes tailles, propres." },
  { id: "ex-5", titre: "Pièces moteur hors usage", categorie: "Métal", icone: "⚙️", couleur: "#E6F1FB", ville: "Toulouse", quantite: "~80 kg", urgent: true, description: "Pièces moteur diverses, non fonctionnelles." },
];

// Charge les annonces depuis Supabase + exemples
async function chargerAnnonces() {
  try {
    const { data: annoncesDB, error } = await db
      .from("annonces")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    toutesLesAnnonces = [...(annoncesDB || []), ...annoncesExemples];
  } catch (e) {
    console.error("Erreur chargement annonces:", e);
    toutesLesAnnonces = [...annoncesExemples];
  }
  filtrerAnnonces();
}

// Affiche les annonces
function afficherAnnonces(liste) {
  const grille = document.getElementById("grille-annonces");
  grille.innerHTML = "";

  if (liste.length === 0) {
    grille.innerHTML = "<p style='padding:24px;color:#777;'>Aucune annonce trouvée.</p>";
    return;
  }

  liste.forEach(a => {
    const badge = a.urgent
      ? `<span class="badge badge-urgent">Urgent</span>`
      : `<span class="badge badge-particulier">Particulier</span>`;

    const date = a.created_at
      ? new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
      : "";

    // Première photo ou icone emoji
    let imageHtml = "";
    if (a.photos && a.photos.length > 0) {
      imageHtml = `<img src="${a.photos[0]}" alt="${a.titre}" style="width:100%;height:100%;object-fit:cover;" />`;
    } else {
      imageHtml = `<span style="font-size:42px;">${a.icone || "📦"}</span>`;
    }

    grille.innerHTML += `
      <div class="carte" onclick="window.location.href='annonce.html?id=${a.id}'">
        <div class="carte-image" style="background:${a.couleur || '#f0f0f0'}">
          ${imageHtml}
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
          </div>
        </div>
      </div>`;
  });
}

// Prévisualisation photos
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

// Upload photos vers Supabase Storage
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

  const btnPublier = document.querySelector(".btn-publier");
  btnPublier.textContent = "Publication...";
  btnPublier.disabled = true;

  const icones = { Bois: "🪵", Métal: "🔩", Carton: "📦", Plastique: "♻️", Verre: "🫙", Électronique: "💻" };
  const couleurs = { Bois: "#EAF3DE", Métal: "#E6F1FB", Carton: "#FAEEDA", Plastique: "#FBEAF0", Verre: "#E1F5EE", Électronique: "#F3E8FF" };

  // Upload des photos si présentes
  let photos = [];
  if (photosSelectionnees.length > 0) {
    photos = await uploaderPhotos(utilisateur.id);
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

  btnPublier.textContent = "Publier";
  btnPublier.disabled = false;

  if (error) {
    alert("Erreur lors de la publication : " + error.message);
    return;
  }

  fermerFormulaire();
  photosSelectionnees = [];
  await chargerAnnonces();
  ["titre", "quantite", "description"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  alert("Annonce publiée avec succès ! ✅");
}

// Filtre par catégorie
function filtrerCategorie(categorie, bouton) {
  categorieActive = categorie;
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("actif"));
  bouton.classList.add("actif");
  filtrerAnnonces();
}

// Filtre par recherche + catégorie
function filtrerAnnonces() {
  const recherche = document.getElementById("recherche").value.toLowerCase();
  const resultats = toutesLesAnnonces.filter(a => {
    const matchCategorie = categorieActive === "Tout" || a.categorie === categorieActive;
    const matchRecherche =
      a.titre.toLowerCase().includes(recherche) ||
      (a.ville || "").toLowerCase().includes(recherche);
    return matchCategorie && matchRecherche;
  });
  afficherAnnonces(resultats);
}

// Adapte le bandeau
function adapterPageAccueil() {
  const connecte = localStorage.getItem("connecte");
  const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));
  const bandeau = document.getElementById("bandeau-accueil");
  const boutonPublier = document.getElementById("bouton-publier");

  if (!connecte || !utilisateur) {
    bandeau.innerHTML = `
      <div class="bandeau-inscription">
        <span>♻️ Rejoignez RecycleCo — Donnez une seconde vie à vos matériaux</span>
        <div class="bandeau-btns">
          <a href="inscription.html" class="bandeau-btn-inscrit">S'inscrire gratuitement</a>
          <a href="connexion.html" class="bandeau-btn-connect">Se connecter</a>
        </div>
      </div>`;
    boutonPublier.style.display = "none";

  } else if (utilisateur.type === "particulier") {
    bandeau.innerHTML = `
      <div class="bandeau-particulier">
        <span>👋 Bonjour ${utilisateur.nom ? utilisateur.nom.split(" ")[0] : "vous"} ! Publiez vos matériaux pour qu'un pro vienne les récupérer.</span>
      </div>`;
    boutonPublier.style.display = "block";

  } else if (utilisateur.type === "pro") {
    bandeau.innerHTML = `
      <div class="bandeau-pro">
        <span>🏭 Bienvenue ${utilisateur.societe} ! Consultez les annonces et contactez les particuliers.</span>
        <a href="dashboard.html" class="bandeau-btn-inscrit">Mon tableau de bord</a>
      </div>`;
    boutonPublier.style.display = "none";
  }
}

// Formulaire
function ouvrirFormulaire() {
  document.getElementById("modal-fond").classList.add("ouvert");
}

function fermerFormulaire() {
  document.getElementById("modal-fond").classList.remove("ouvert");
  photosSelectionnees = [];
  const preview = document.getElementById("photos-preview");
  if (preview) preview.innerHTML = "";
}

// Lancement
adapterPageAccueil();
chargerAnnonces();