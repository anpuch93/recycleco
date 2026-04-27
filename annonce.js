window.onload = async function () {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    document.querySelector(".page-annonce").innerHTML = "<p style='padding:24px;color:#777;'>Annonce introuvable.</p>";
    return;
  }

  let annonce = null;

  // Annonces exemples pour les ids ex-0 à ex-5
  const annoncesExemples = [
    { id: "ex-0", titre: "Planches de bois variées", categorie: "Bois", icone: "🪵", couleur: "#EAF3DE", ville: "Paris 11e", quantite: "~50 kg", urgent: false, description: "Lot de planches de bois récupérées lors d'une rénovation. Bon état général, quelques clous à retirer." },
    { id: "ex-1", titre: "Ferraille et profilés acier", categorie: "Métal", icone: "🔩", couleur: "#E6F1FB", ville: "Lyon 3e", quantite: "~120 kg", urgent: false, description: "Profilés acier et ferraille diverse issus d'un atelier. À récupérer sur place." },
    { id: "ex-2", titre: "Cartons d'emballage", categorie: "Carton", icone: "📦", couleur: "#FAEEDA", ville: "Bordeaux", quantite: "~30 pièces", urgent: true, description: "Cartons d'emballage en bon état, pliés et stockés au sec. À récupérer rapidement." },
    { id: "ex-3", titre: "Bidons plastique HDPE", categorie: "Plastique", icone: "♻️", couleur: "#FBEAF0", ville: "Marseille", quantite: "~15 pièces", urgent: false, description: "Bidons plastique HDPE de 25 litres, rincés et propres." },
    { id: "ex-4", titre: "Bouteilles et bocaux verre", categorie: "Verre", icone: "🫙", couleur: "#E1F5EE", ville: "Nantes", quantite: "~40 pièces", urgent: false, description: "Bouteilles et bocaux en verre de différentes tailles, propres et triés." },
    { id: "ex-5", titre: "Pièces moteur hors usage", categorie: "Métal", icone: "⚙️", couleur: "#E6F1FB", ville: "Toulouse", quantite: "~80 kg", urgent: true, description: "Pièces moteur diverses, non fonctionnelles. Idéal pour récupération de métaux." },
  ];

  // Si c'est une annonce exemple
  if (id.startsWith("ex-")) {
    const index = parseInt(id.replace("ex-", ""));
    annonce = annoncesExemples[index] || null;
  } else {
    // Sinon on cherche dans Supabase
    const { data, error } = await db
      .from("annonces")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      annonce = data;
    }
  }

  if (!annonce) {
    document.querySelector(".page-annonce").innerHTML = "<p style='padding:24px;color:#777;'>Annonce introuvable.</p>";
    return;
  }

  // Remplit la page
  document.title = "RecycleCo — " + annonce.titre;
  document.getElementById("annonce-image").textContent = annonce.icone;
  document.getElementById("annonce-image").style.background = annonce.couleur;
  document.getElementById("annonce-titre").textContent = annonce.titre;
  document.getElementById("annonce-lieu").textContent = annonce.ville;
  document.getElementById("annonce-quantite").textContent = annonce.quantite;
  document.getElementById("annonce-categorie").textContent = annonce.categorie;

  if (annonce.urgent) {
    document.getElementById("annonce-urgent").style.display = "inline";
  }

  if (annonce.description) {
    document.getElementById("annonce-description").innerHTML =
      `<p style="font-size:14px;color:#444;line-height:1.6;">${annonce.description}</p>`;
  }

// Affiche les photos si présentes
// Galerie photos style leboncoin
  if (annonce.photos && annonce.photos.length > 0) {
    const imageEl = document.getElementById("annonce-image");
    imageEl.style.height = "400px";
    imageEl.style.background = "#000";
    imageEl.innerHTML = `
      <img id="photo-principale" src="${annonce.photos[0]}" 
        style="width:100%;height:100%;object-fit:contain;" />`;

    if (annonce.photos.length > 1) {
      const galerie = document.createElement("div");
      galerie.className = "galerie-miniatures";
      annonce.photos.forEach((url, i) => {
        galerie.innerHTML += `
          <div class="miniature ${i === 0 ? "active" : ""}" id="mini-${i}" onclick="changerPhoto('${url}', ${i}, ${annonce.photos.length})">
            <img src="${url}" alt="Photo ${i + 1}" />
          </div>`;
      });
      imageEl.insertAdjacentElement("afterend", galerie);
    }
  }
  // Bouton contact
  const connecte = localStorage.getItem("connecte");
  const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));
  const zoneContact = document.getElementById("zone-contact");

  if (connecte && utilisateur && utilisateur.type === "pro") {
    zoneContact.innerHTML = `
      <button class="btn-post" style="margin-top:20px;" onclick="ouvrirContact()">
        ✉️ Contacter le particulier
      </button>`;
  } else if (!connecte) {
    zoneContact.innerHTML = `
      <div class="zone-inscription">
        <p>Vous devez être connecté en tant que professionnel pour contacter ce particulier.</p>
        <a href="connexion.html" class="btn-post" style="display:inline-block;margin-top:10px;">
          Se connecter
        </a>
      </div>`;
  }
};

function changerPhoto(url, index, total) {
  document.getElementById("photo-principale").src = url;
  document.querySelectorAll(".miniature").forEach((m, i) => {
    m.classList.toggle("active", i === index);
  });
}

function ouvrirContact() {
  document.getElementById("modal-contact").classList.add("ouvert");
}

function fermerContact() {
  document.getElementById("modal-contact").classList.remove("ouvert");
  document.getElementById("msg-contact").value = "";
}

async function envoyerContact() {
  const msg = document.getElementById("msg-contact").value.trim();
  const params = new URLSearchParams(window.location.search);
  const annonceId = params.get("id");
  const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));

  if (!msg) {
    alert("Merci d'écrire un message.");
    return;
  }

  // Récupère l'annonce pour avoir l'id du particulier
  const { data: annonce } = await db
    .from("annonces")
    .select("utilisateur_id")
    .eq("id", annonceId)
    .single();

  // Crée ou récupère la conversation existante
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
    const { data: nouvelleConv, error: errConv } = await db
      .from("conversations")
      .insert({
        annonce_id: annonceId,
        pro_id: utilisateur.id,
        particulier_id: annonce.utilisateur_id
      })
      .select()
      .single();

    if (errConv) {
      alert("Erreur : " + errConv.message);
      return;
    }
    convId = nouvelleConv.id;
  }

  // Envoie le premier message
  const { error } = await db.from("chat_messages").insert({
    conversation_id: convId,
    expediteur_id: utilisateur.id,
    contenu: msg,
    lu: false
  });

  if (error) {
    alert("Erreur lors de l'envoi : " + error.message);
    return;
  }

  fermerContact();
  alert("Message envoyé ! Retrouvez la conversation dans Mes messages ✅");
}