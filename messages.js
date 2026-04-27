let utilisateurActif = null;
let conversationActive = null;

window.onload = async function () {
  const connecte = localStorage.getItem("connecte");
  utilisateurActif = JSON.parse(localStorage.getItem("utilisateur"));

  if (!connecte || !utilisateurActif) {
    alert("Vous devez être connecté.");
    window.location.href = "connexion.html";
    return;
  }

  await chargerConversations();
};

// Charge la liste des conversations
async function chargerConversations() {
  const liste = document.getElementById("liste-conversations");
  const titre = document.getElementById("titre-messages");
  titre.textContent = utilisateurActif.type === "pro" ? "Mes conversations" : "Mes messages";
  liste.innerHTML = "<p class='vide'>Chargement...</p>";

  const { data: conversations, error } = await db
    .from("conversations")
    .select(`
      id,
      created_at,
      annonce_id,
      annonces (titre, icone, couleur, ville),
      pro:utilisateurs!conversations_pro_id_fkey (id, societe),
      particulier:utilisateurs!conversations_particulier_id_fkey (id, nom, ville)
    `)
    .or(`pro_id.eq.${utilisateurActif.id},particulier_id.eq.${utilisateurActif.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur:", error);
    liste.innerHTML = "<p class='vide'>Erreur de chargement.</p>";
    return;
  }

  if (!conversations || conversations.length === 0) {
    liste.innerHTML = `
      <div class="messages-vide">
        <div style="font-size:48px;margin-bottom:16px;">📭</div>
        <p>Aucune conversation pour l'instant.</p>
      </div>`;
    return;
  }

  // Pour chaque conversation, récupère le dernier message
  liste.innerHTML = "";
  for (const conv of conversations) {
    const { data: dernierMsg } = await db
      .from("chat_messages")
      .select("contenu, lu, expediteur_id, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const interlocuteur = utilisateurActif.type === "pro"
      ? conv.particulier?.nom || "Particulier"
      : conv.pro?.societe || "Professionnel";

    const nonLu = dernierMsg && !dernierMsg.lu && dernierMsg.expediteur_id !== utilisateurActif.id;
    const date = dernierMsg
      ? new Date(dernierMsg.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
      : "";

    liste.innerHTML += `
      <div class="conv-carte ${nonLu ? "non-lu" : ""}" onclick="ouvrirConversation('${conv.id}')">
        <div class="conv-icone" style="background:${conv.annonces?.couleur || '#f0f0f0'}">
          ${conv.annonces?.icone || "📦"}
        </div>
        <div class="conv-info">
          <div class="conv-header">
            <span class="conv-nom">${interlocuteur}</span>
            <span class="conv-date">${date}</span>
          </div>
          <div class="conv-annonce">${conv.annonces?.titre || "Annonce supprimée"}</div>
          <div class="conv-apercu">
            ${dernierMsg ? dernierMsg.contenu.substring(0, 60) + (dernierMsg.contenu.length > 60 ? "..." : "") : "Nouvelle conversation"}
          </div>
        </div>
        ${nonLu ? '<div class="conv-badge-nonlu"></div>' : ""}
      </div>`;
  }
}

// Ouvre une conversation en mode chat
async function ouvrirConversation(convId) {
  conversationActive = convId;
  document.getElementById("vue-conversations").style.display = "none";
  document.getElementById("vue-chat").style.display = "flex";

  // Récupère les infos de la conversation
  const { data: conv } = await db
    .from("conversations")
    .select(`
      id,
      annonces (titre, icone, couleur),
      pro:utilisateurs!conversations_pro_id_fkey (societe),
      particulier:utilisateurs!conversations_particulier_id_fkey (nom, ville)
    `)
    .eq("id", convId)
    .single();

  const interlocuteur = utilisateurActif.type === "pro"
    ? conv.particulier?.nom || "Particulier"
    : conv.pro?.societe || "Professionnel";

  document.getElementById("chat-titre").textContent = interlocuteur;
  document.getElementById("chat-sous-titre").textContent =
    `${conv.annonces?.icone || "📦"} ${conv.annonces?.titre || "Annonce"}`;

  await chargerChatMessages(convId);
}

// Charge les messages du chat
async function chargerChatMessages(convId) {
  const zone = document.getElementById("chat-messages");
  zone.innerHTML = "<p class='vide'>Chargement...</p>";

  const { data: msgs, error } = await db
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });

  if (error) {
    zone.innerHTML = "<p class='vide'>Erreur de chargement.</p>";
    return;
  }

  // Marque les messages reçus comme lus
  await db
    .from("chat_messages")
    .update({ lu: true })
    .eq("conversation_id", convId)
    .neq("expediteur_id", utilisateurActif.id)
    .eq("lu", false);

  zone.innerHTML = "";
  if (!msgs || msgs.length === 0) {
    zone.innerHTML = "<p class='vide' style='text-align:center;padding:24px;'>Commencez la conversation !</p>";
  } else {
    msgs.forEach(msg => {
      const estMoi = msg.expediteur_id === utilisateurActif.id;
      const heure = new Date(msg.created_at).toLocaleTimeString("fr-FR", {
        hour: "2-digit", minute: "2-digit"
      });
      const date = new Date(msg.created_at).toLocaleDateString("fr-FR", {
        day: "numeric", month: "short"
      });

      zone.innerHTML += `
        <div class="chat-bulle ${estMoi ? "bulle-moi" : "bulle-eux"}">
          <div class="chat-bulle-texte">${msg.contenu}</div>
          <div class="chat-bulle-heure">${date} ${heure}</div>
        </div>`;
    });
  }

  // Scroll vers le bas
  zone.scrollTop = zone.scrollHeight;
}

// Envoie un message dans le chat
async function envoyerChatMessage() {
  const texte = document.getElementById("chat-texte").value.trim();
  if (!texte) return;

  document.getElementById("chat-texte").value = "";

  const { error } = await db.from("chat_messages").insert({
    conversation_id: conversationActive,
    expediteur_id: utilisateurActif.id,
    contenu: texte,
    lu: false
  });

  if (error) {
    alert("Erreur lors de l'envoi : " + error.message);
    return;
  }

  await chargerChatMessages(conversationActive);
}

// Retour à la liste
function retourConversations() {
  conversationActive = null;
  document.getElementById("vue-chat").style.display = "none";
  document.getElementById("vue-conversations").style.display = "block";
  chargerConversations();
}